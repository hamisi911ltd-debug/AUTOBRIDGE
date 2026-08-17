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

const BODY_TYPE_KEYWORDS: Record<string, string[]> = {
  suv: ["suv", "crossover"],
  sedan: ["sedan", "saloon"],
  hatchback: ["hatchback", "hatch"],
  pickup: ["pickup", "pick-up", "pick up", "truck"],
  van: ["van", "minivan"],
  wagon: ["wagon", "estate"],
  coupe: ["coupe"],
  convertible: ["convertible"],
};

const FUEL_KEYWORDS: Record<string, string[]> = {
  petrol: ["petrol", "gasoline", "gas engine"],
  diesel: ["diesel"],
  hybrid: ["hybrid"],
  electric: ["electric", " ev ", "ev car", "ev suv"],
};

const GREETING_RE = /^\s*(hi|hey|hello|habari|niaje|mambo|sasa|good\s?(morning|afternoon|evening))\b[.!?\s]*$/i;
const THANKS_RE = /^\s*(thanks|thank you|asante|cheers|ok(ay)?|noted|cool)\b[.!?\s]*$/i;

// Wraps text in single spaces so a plain `.includes(" phrase ")` check acts
// as a word-boundary match without needing per-phrase regex escaping.
function pad(text: string): string {
  return ` ${text.replace(/[^a-z0-9]+/gi, " ").toLowerCase().trim()} `;
}

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

function detectFromKeywordMap(text: string, map: Record<string, string[]>): string[] {
  const lower = text.toLowerCase();
  return Object.entries(map)
    .filter(([, keywords]) => keywords.some((k) => lower.includes(k)))
    .map(([key]) => key);
}

type YearFilter = { min?: number; exact?: number };

function parseYearFilter(text: string): YearFilter | null {
  const lower = text.toLowerCase();
  const m = lower.match(/\b(19|20)\d{2}\b/);
  if (!m) return null;
  const year = parseInt(m[0], 10);
  const currentYear = new Date().getFullYear();
  if (year < 1990 || year > currentYear + 1) return null;

  const isMin = /(or newer|newer than|after|and above|or later|or above|onwards|from\s*\d{4})/.test(lower);
  return isMin ? { min: year } : { exact: year };
}

type MakeModelMatch = { make?: string; model?: string };

/** Matches an explicit make (always) and, only once a make is confirmed or
 * the model name is distinctive enough on its own, a model — this avoids a
 * short common word like a model named "Fit" or "Note" matching by itself
 * inside ordinary sentences ("a car that will fit my family"). */
function detectMakeModel(text: string, vehicles: AssistantVehicle[]): MakeModelMatch {
  const padded = pad(text);

  const makesByLower = new Map<string, string>();
  const modelsByMakeLower = new Map<string, Map<string, string>>();
  for (const v of vehicles) {
    makesByLower.set(v.make.toLowerCase(), v.make);
    const key = v.make.toLowerCase();
    if (!modelsByMakeLower.has(key)) modelsByMakeLower.set(key, new Map());
    modelsByMakeLower.get(key)!.set(v.model.toLowerCase(), v.model);
  }

  let matchedMake: string | undefined;
  let bestMakeLen = 0;
  for (const [lower, original] of makesByLower) {
    const phrase = ` ${lower.replace(/[^a-z0-9]+/g, " ")} `;
    if (padded.includes(phrase) && lower.length > bestMakeLen) {
      matchedMake = original;
      bestMakeLen = lower.length;
    }
  }

  if (matchedMake) {
    const models = modelsByMakeLower.get(matchedMake.toLowerCase());
    let matchedModel: string | undefined;
    let bestModelLen = 0;
    if (models) {
      for (const [lower, original] of models) {
        const phrase = ` ${lower.replace(/[^a-z0-9]+/g, " ")} `;
        if (padded.includes(phrase) && lower.length > bestModelLen) {
          matchedModel = original;
          bestModelLen = lower.length;
        }
      }
    }
    return { make: matchedMake, model: matchedModel };
  }

  // No make mentioned — only trust a model name on its own if it's long
  // enough to be unlikely to collide with ordinary English words.
  let bestMake: string | undefined;
  let bestModel: string | undefined;
  let bestLen = 0;
  for (const [makeLower, models] of modelsByMakeLower) {
    for (const [modelLower, modelOriginal] of models) {
      if (modelLower.length < 5) continue;
      const phrase = ` ${modelLower.replace(/[^a-z0-9]+/g, " ")} `;
      if (padded.includes(phrase) && modelLower.length > bestLen) {
        bestLen = modelLower.length;
        bestModel = modelOriginal;
        bestMake = makesByLower.get(makeLower);
      }
    }
  }
  return { make: bestMake, model: bestModel };
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
  const trimmed = text.trim();

  if (GREETING_RE.test(trimmed)) {
    return {
      reply:
        "Hi! Tell me your budget, a make/model you're after, or what you need the car for (family, business, off-road) — e.g. \"diesel Toyota Prado, 2018 or newer, around KSh 3M\".",
      vehicleIds: [],
    };
  }
  if (THANKS_RE.test(trimmed)) {
    return { reply: "Anytime — ask if you want more options or a different budget/model.", vehicleIds: [] };
  }

  const budget = parseBudgetKes(text);
  const lifestyles = detectFromKeywordMap(text, LIFESTYLE_KEYWORDS);
  const bodyTypes = detectFromKeywordMap(text, BODY_TYPE_KEYWORDS);
  const fuels = detectFromKeywordMap(text, FUEL_KEYWORDS);
  const yearFilter = parseYearFilter(text);
  const { make, model } = detectMakeModel(text, vehicles);

  let candidates = vehicles.filter((v) => v.eligible);
  const noExactStock =
    make != null &&
    !candidates.some((v) => v.make.toLowerCase() === make.toLowerCase() && (!model || v.model.toLowerCase() === model.toLowerCase()));

  if (make) {
    const withMake = candidates.filter((v) => v.make.toLowerCase() === make.toLowerCase());
    if (withMake.length > 0) {
      candidates = withMake;
      if (model) {
        const withModel = candidates.filter((v) => v.model.toLowerCase() === model.toLowerCase());
        if (withModel.length > 0) candidates = withModel;
      }
    }
  }

  if (bodyTypes.length > 0) {
    const withBody = candidates.filter((v) => bodyTypes.some((b) => v.bodyType.toLowerCase().includes(b)));
    if (withBody.length > 0) candidates = withBody;
  }

  if (fuels.length > 0) {
    const withFuel = candidates.filter((v) => fuels.some((f) => v.fuel.toLowerCase().includes(f)));
    if (withFuel.length > 0) candidates = withFuel;
  }

  if (yearFilter) {
    const withYear = candidates.filter((v) => (yearFilter.min != null ? v.year >= yearFilter.min : v.year === yearFilter.exact));
    if (withYear.length > 0) candidates = withYear;
  }

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

  const wantedModelName = make ? `${make}${model ? ` ${model}` : ""}` : null;

  if (matches.length === 0) {
    const reply = wantedModelName
      ? `We don't currently have a ${wantedModelName} in stock that matches — try a different budget, or ask about a similar model.`
      : "I couldn't find a close match for that — try widening your budget or telling me what you'll mainly use the car for (family, business, off-road, ride-hailing).";
    return { reply, vehicleIds: [] };
  }

  const parts: string[] = [];
  if (wantedModelName) parts.push(wantedModelName);
  if (bodyTypes.length > 0) parts.push(bodyTypes.join("/"));
  if (fuels.length > 0) parts.push(fuels.join("/"));
  if (yearFilter) parts.push(yearFilter.min != null ? `${yearFilter.min} or newer` : `${yearFilter.exact}`);
  if (lifestyles.length > 0) parts.push(lifestyles.join("/"));
  if (budget != null) parts.push(`around ${formatKes(budget)}`);

  const context = parts.length > 0 ? ` for ${parts.join(", ")}` : "";
  const names = matches.map((v) => `${v.year} ${v.make} ${v.model}`).join(", ");
  const stockNote = noExactStock ? " (no exact stock right now, so here's the closest we have) " : " ";
  const reply = `Based on${context}, here's what fits best:${stockNote}${names}. Landed costs are shown below — tap one to see the full breakdown.`;

  return { reply, vehicleIds: matches.map((v) => v.id) };
}
