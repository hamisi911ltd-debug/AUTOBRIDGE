import { NextResponse } from "next/server";
import { getPublicVehicles } from "@/lib/getPublicVehicles";
import { computeLandedCost } from "@/lib/landedCost";
import { matchVehicles } from "@/lib/assistant";
import { formatKes } from "@/lib/format";

// Same default rate the storefront starts with (AutoBridgeApp's initial fx
// state) — this endpoint doesn't know the visitor's live exchange-rate
// input, so candidate prices shown to the LLM use this fixed baseline
// rather than guessing.
const DEFAULT_FX = 129;
const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";

// The LLM is deliberately never given individual vehicle names/prices to
// restate — a real test caught it inventing a "2019 Honda Grace LX" that
// didn't exist while still linking the correct (unrelated) real vehicle ID,
// a classic hallucination that would misinform a buyer about a specific
// car. The clickable cards below the reply already render the real make,
// model, year, and price straight from the database, so the LLM only ever
// writes the surrounding sentence, never the facts themselves.
const SYSTEM_PROMPT = `You are Ferbot, the AI shopping assistant for Ferbil Autos, a Kenyan vehicle import marketplace sourcing cars from Japan and the UAE.

Rules:
- You are never told the specific names, years, or prices of matching vehicles, only a summary. Never invent or guess a specific make, model, year, or price. The visitor already sees the real matching vehicles as clickable cards with accurate details directly below your reply, so just write a short, warm sentence introducing them (e.g. referencing their stated budget or body type) without restating specifics you don't actually know.
- The "Match summary" line tells you whether anything matched and roughly what. If it says nothing matched, say so plainly and suggest widening the budget or trying a different body type or make. Never claim a "closest match" exists if the summary says nothing matched.
- Prices shown to the visitor are "total price" (vehicle price plus freight and insurance to Mombasa). KRA duty, excise, VAT, and registration are NOT included and must be confirmed separately with a clearing agent, mention this if asked about total cost or taxes.
- To actually enquire about a car, the visitor should open its detail page and use "Send enquiry", which also reaches the team on WhatsApp.
- Be warm, concise, and conversational (one to three sentences). Do not use markdown formatting like headers or bullet lists, this is a small chat bubble.
- Only eligible (KRA import-age compliant) vehicles are ever shown, so you don't need to caveat eligibility yourself.`;

type ChatMessage = { role: "user" | "assistant"; text: string };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const history: ChatMessage[] = Array.isArray(body?.history) ? body.history.slice(-6) : [];

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Unbounded on purpose — Ferbot needs to search the real, full catalogue.
  // A bounded "recent" window (fine for the homepage's promo sections) can
  // easily lack a given body type or budget range entirely if the newest
  // scraped batch happens to skew toward other categories, which is what
  // let a mismatched vehicle slip in as a false "closest match" before.
  const vehicles = await getPublicVehicles();
  const landedMap: Record<string, ReturnType<typeof computeLandedCost>> = {};
  for (const v of vehicles) landedMap[v.id] = computeLandedCost(v, DEFAULT_FX);

  // The deterministic local matcher still decides WHICH real vehicles get
  // linked below the reply — the LLM only writes the words around them, so
  // a hallucinated car can never make it into the response as a clickable
  // result, only into prose (which the system prompt forbids).
  const localMatch = matchVehicles(message, vehicles, landedMap);
  const candidates = vehicles.filter((v) => localMatch.vehicleIds.includes(v.id));

  // A summary only, never itemized vehicle facts — see the note on
  // SYSTEM_PROMPT above for why.
  let vehicleContext: string;
  if (candidates.length === 0) {
    vehicleContext = "Nothing in current stock is close enough to the visitor's stated criteria.";
  } else {
    const bodyTypes = [...new Set(candidates.map((v) => v.bodyType))];
    const makes = [...new Set(candidates.map((v) => v.make))];
    const prices = candidates.map((v) => landedMap[v.id].total);
    const minPrice = formatKes(Math.min(...prices));
    const maxPrice = formatKes(Math.max(...prices));
    vehicleContext = `${candidates.length} matching vehicle(s) found: body type(s) ${bodyTypes.join("/")}, make(s) ${makes.join("/")}, total price range ${minPrice} to ${maxPrice}.`;
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: localMatch.reply, vehicleIds: localMatch.vehicleIds });
  }

  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        temperature: 0.2,
        max_tokens: 120,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.map((m) => ({ role: m.role, content: m.text })),
          { role: "user", content: `Match summary: ${vehicleContext}\n\nVisitor message: ${message}` },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ reply: localMatch.reply, vehicleIds: localMatch.vehicleIds });
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = data.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({ reply: reply || localMatch.reply, vehicleIds: localMatch.vehicleIds });
  } catch {
    // Network hiccup, timeout, or malformed response from the LLM provider —
    // the chat should never just break, so fall back to the deterministic
    // local answer instead of surfacing an error to the visitor.
    return NextResponse.json({ reply: localMatch.reply, vehicleIds: localMatch.vehicleIds });
  }
}
