import type { Filters } from "@/lib/constants";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";

/** Classic edit-distance - small strings only (car-name tokens), so the O(n*m) DP table is cheap. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

/**
 * One search word against one haystack word - a substring match either way
 * (so "corol" finds "corolla" and "rx" finds "rx-8") OR a small edit
 * distance (so a typo like "corola" still finds "corolla"). The allowed
 * distance scales with word length so short words ("rx", "gt") don't
 * fuzzy-match everything nearby.
 *
 * Both words need to be at least 3 characters before the substring/distance
 * checks kick in - without that floor, a one- or two-letter trim code like
 * "S" or "GX" (extremely common - most trims are short) is technically a
 * "substring" of nearly any longer search word purely by coincidence (every
 * letter in "harrier" is itself a 1-char substring), which was flooding
 * unrelated makes into a plain model search. Below that floor, only an
 * exact match counts.
 */
function fuzzyWordMatches(hayWord: string, needleWord: string): boolean {
  if (hayWord.length < 3 || needleWord.length < 3) return hayWord === needleWord;
  if (hayWord.includes(needleWord) || needleWord.includes(hayWord)) return true;
  const maxDist = needleWord.length <= 6 ? 1 : 2;
  return levenshtein(hayWord, needleWord) <= maxDist;
}

/**
 * In-memory filter/sort over an already-fetched vehicle list. Isolated here
 * so a real search index (Meilisearch etc.) can replace the implementation
 * later without touching callers - catalog is small and Kenya-only for now,
 * so this is plenty fast.
 */
export function matchesFilters(
  v: PublicVehicle,
  f: Filters,
  landedTotal: number,
  favorites: Set<string>
): boolean {
  if (f.eligibleOnly && !v.eligible) return false;
  if (v.year < f.yearMin || v.year > f.yearMax) return false;
  if (landedTotal < f.priceMinKes || landedTotal > f.priceMaxKes) return false;
  if (f.makes.length && !f.makes.includes(v.make)) return false;
  if (f.models.length && !f.models.includes(`${v.make} ${v.model}`)) return false;
  if (f.bodyTypes.length && !f.bodyTypes.includes(v.bodyType)) return false;
  if (f.fuels.length && !f.fuels.includes(v.fuel)) return false;
  if (f.transmissions.length && !f.transmissions.includes(v.transmission)) return false;
  if (f.drives.length && !f.drives.includes(v.drive)) return false;
  if (f.sourceCountries.length && !f.sourceCountries.includes(v.sourceCountry)) return false;
  if (f.lifestyle && !v.lifestyle.includes(f.lifestyle)) return false;
  if (f.favoritesOnly && !favorites.has(v.id)) return false;
  if (f.keyword.trim()) {
    // Collapse repeated/leading/trailing whitespace on both sides so an
    // extra space (or a double space from a fat-fingered mobile keyboard)
    // never blocks an otherwise-correct match, on top of the case-insensitivity.
    const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
    const k = normalize(f.keyword);
    // Make/model/trim first (most searches), then the identifiers a buyer
    // might paste straight from a listing or an inspection sheet - ref
    // number, chassis number, model code (e.g. a Mercedes "C200").
    const hay = normalize(
      [v.make, v.model, v.trim, v.refNo, v.chassisNo, v.modelCode].filter((s): s is string => !!s).join(" ")
    );
    // Exact substring is the fast, common path (handles correctly-spelled
    // multi-word searches like "toyota hilux" in one shot). Squashing
    // spaces out of both sides next catches a query like "c 200" against a
    // trim/model-code that's stored as one word ("C200") - the space is
    // real to the typer but doesn't exist in the source data. Only after
    // both of those fail does it drop to per-word fuzzy matching -
    // order-independent and typo-tolerant - so "corola" or "hilux toyota"
    // still finds a result instead of coming back empty.
    const squash = (s: string) => s.replace(/[\s-]+/g, "");
    if (!hay.includes(k) && !squash(hay).includes(squash(k))) {
      const keywordWords = k.split(" ").filter(Boolean);
      const hayWords = hay.split(" ").filter(Boolean);
      const allWordsMatch = keywordWords.every((kw) => hayWords.some((hw) => fuzzyWordMatches(hw, kw)));
      if (!allWordsMatch) return false;
    }
  }
  return true;
}

/**
 * The default "recent" ordering used to be a flat year-desc sort - harmless
 * on a balanced catalogue, but once a handful of models (Toyota Crown,
 * Harrier, Dyna...) each have hundreds of units concentrated in the same
 * couple of model years, that flat sort let one or two models dominate
 * every early page.
 *
 * A first fix round-robinned across make+model groups, but that still let
 * Toyota dominate: Toyota alone has 50+ distinct scraped models, so a
 * model-level round-robin visits dozens of Toyota groups before a
 * single-model brand like Mercedes-Benz or Volvo ever gets a turn. This
 * interleaves at the BRAND level first (every make gets one pick per round,
 * so a 20-brand catalogue puts a different brand in each of the first 20
 * positions), and only within a brand's turn does it round-robin across
 * that brand's own models - so Toyota's internal variety still shows up
 * without one brand crowding out every other brand's early presence.
 */
function diverseByMake(list: PublicVehicle[]): PublicVehicle[] {
  const byMake = new Map<string, Map<string, PublicVehicle[]>>();
  for (const v of list) {
    let models = byMake.get(v.make);
    if (!models) {
      models = new Map();
      byMake.set(v.make, models);
    }
    const key = `${v.make} ${v.model}`;
    const g = models.get(key);
    if (g) g.push(v);
    else models.set(key, [v]);
  }

  // Each brand's own model list, newest-first within a model and ordered as
  // a flat round-robin queue across that brand's models - so pulling
  // sequentially from one brand's queue already varies by model too.
  const brandQueues = [...byMake.values()].map((models) => {
    for (const g of models.values()) g.sort((a, b) => b.year - a.year || a.id.localeCompare(b.id));
    const groups = [...models.values()];
    const queue: PublicVehicle[] = [];
    let round = 0;
    let remaining = groups.reduce((sum, g) => sum + g.length, 0);
    while (remaining > 0) {
      for (const g of groups) {
        if (round < g.length) {
          queue.push(g[round]);
          remaining--;
        }
      }
      round++;
    }
    return queue;
  });

  const out: PublicVehicle[] = [];
  let remaining = list.length;
  let pos = 0;
  while (remaining > 0) {
    for (const queue of brandQueues) {
      if (pos < queue.length) {
        out.push(queue[pos]);
        remaining--;
      }
    }
    pos++;
  }
  return out;
}

export function sortVehicles(
  list: PublicVehicle[],
  sort: Filters["sort"],
  landedMap: Record<string, LandedCost>
): PublicVehicle[] {
  const arr = [...list];
  if (sort === "priceAsc") arr.sort((a, b) => landedMap[a.id].total - landedMap[b.id].total);
  else if (sort === "priceDesc") arr.sort((a, b) => landedMap[b.id].total - landedMap[a.id].total);
  else if (sort === "mileageAsc") arr.sort((a, b) => a.mileageKm - b.mileageKm);
  else return diverseByMake(arr);
  return arr;
}
