import { formatKes } from "@/lib/format";
import type { LandedCost } from "@/lib/landedCost";

export type AssistantVehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  bodyType: string;
  fuel: string;
  eligible: boolean;
  lifestyle: string[];
};

export type AssistantResult = { reply: string; vehicleIds: string[] };

const LIFESTYLE_KEYWORDS: Record<string, string[]> = {
  family: ["family", "kids", "children"],
  business: ["business", "executive", "corporate", "office"],
  student: ["student", "budget", "cheap", "affordable", "campus"],
  "off-road": ["off-road", "off road", "4x4", "4wd", "safari", "rough roads", "upcountry"],
  "ride-hailing": ["uber", "bolt", "taxi", "ride-hailing", "ride hailing"],
  luxury: ["luxury", "premium", "flagship", "high-end"],
};

function parseBudgetKes(text: string): number | null {
  const lower = text.toLowerCase();

  const million = lower.match(/(\d+(?:\.\d+)?)\s*(?:m\b|million)/);
  if (million) return parseFloat(million[1]) * 1_000_000;

  const thousand = lower.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (thousand) return parseFloat(thousand[1]) * 1_000;

  const plain = lower.match(/(\d[\d,]{4,})/); // 5+ digit number, e.g. 2,500,000 or 2500000
  if (plain) return parseFloat(plain[1].replace(/,/g, ""));

  return null;
}

function detectLifestyles(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.entries(LIFESTYLE_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => lower.includes(k)))
    .map(([key]) => key);
}

/**
 * Local, rule-based inventory matcher — no external LLM call. Runs entirely
 * client-side against the vehicle list already loaded on the page.
 */
export function matchVehicles(
  text: string,
  vehicles: AssistantVehicle[],
  landedMap: Record<string, LandedCost>
): AssistantResult {
  const budget = parseBudgetKes(text);
  const lifestyles = detectLifestyles(text);

  let candidates = vehicles.filter((v) => v.eligible);

  if (lifestyles.length > 0) {
    const withLifestyle = candidates.filter((v) => v.lifestyle.some((l) => lifestyles.includes(l)));
    if (withLifestyle.length > 0) candidates = withLifestyle;
  }

  if (budget != null) {
    const withinBudget = candidates.filter((v) => landedMap[v.id].total <= budget * 1.1);
    if (withinBudget.length > 0) candidates = withinBudget;
  }

  candidates = [...candidates].sort((a, b) => landedMap[a.id].total - landedMap[b.id].total);
  const matches = candidates.slice(0, 4);

  if (matches.length === 0) {
    return {
      reply:
        "I couldn't find a close match for that — try widening your budget or telling me what you'll mainly use the car for (family, business, off-road, ride-hailing).",
      vehicleIds: [],
    };
  }

  const parts: string[] = [];
  if (budget != null) parts.push(`around ${formatKes(budget)}`);
  if (lifestyles.length > 0) parts.push(lifestyles.join("/"));

  const context = parts.length > 0 ? ` for ${parts.join(", ")}` : "";
  const names = matches.map((v) => `${v.year} ${v.make} ${v.model}`).join(", ");
  const reply = `Based on${context}, here's what fits best: ${names}. Landed costs are shown below — tap one to see the full breakdown.`;

  return { reply, vehicleIds: matches.map((v) => v.id) };
}
