// KRA (KS 1515:2000) caps used-vehicle imports at under 8 years old from
// year of manufacture — a rolling window, not a fixed year, so this is
// computed off the current date rather than hardcoded. "Under 8 years"
// excludes a car turning exactly 8 this year, so -7 (not -8) is the correct
// floor; explicitly requested to exclude 2018 stock going forward.
export const IMPORT_ELIGIBLE_FROM_YEAR = new Date().getFullYear() - 7;

// BE FORWARD's detail-page "Location" spec field holds a Japanese
// prefecture/region name for the vast majority of stock (it's physically in
// Japan) but occasionally a real country name instead, for units held at an
// overseas satellite yard (confirmed live: a UK-based Isuzu Forward truck)
// — that vehicle's landed cost is completely different (a different port,
// different freight economics) from a Japan-origin unit, so getting this
// wrong isn't cosmetic. Rather than enumerate every possible overseas
// country BE FORWARD might use, this enumerates the finite, known set of
// Japanese place names instead — anything else in that field is treated as
// the vehicle's real country.
const JAPAN_PLACE_NAMES = new Set(
  [
    "Hokkaido", "Aomori", "Iwate", "Miyagi", "Akita", "Yamagata", "Fukushima",
    "Ibaraki", "Tochigi", "Gunma", "Saitama", "Chiba", "Tokyo", "Kanagawa",
    "Niigata", "Toyama", "Ishikawa", "Fukui", "Yamanashi", "Nagano", "Gifu",
    "Shizuoka", "Aichi", "Mie", "Shiga", "Kyoto", "Osaka", "Hyogo", "Nara",
    "Wakayama", "Tottori", "Shimane", "Okayama", "Hiroshima", "Yamaguchi",
    "Tokushima", "Kagawa", "Ehime", "Kochi", "Fukuoka", "Saga", "Nagasaki",
    "Kumamoto", "Oita", "Miyazaki", "Kagoshima", "Okinawa",
    // Regions spanning several prefectures, and major cities, both seen used
    // in place of a prefecture name on real listings.
    "Kanto", "Kansai", "Kinki", "Chubu", "Chugoku", "Tohoku", "Kyushu", "Shikoku",
    "Yokohama", "Nagoya", "Kobe", "Sendai", "Chiba-Ken", "Saitama-Ken",
  ].map((s) => s.toUpperCase())
);

/**
 * BE FORWARD-specific: turns the detail page's "Location" spec value into a
 * source country, defaulting to Japan (matching the overwhelming majority of
 * real stock, and the safe fallback when the field is empty/unparsed).
 */
export function deriveBeforwardSourceCountry(location: string | null | undefined): string {
  const raw = (location ?? "").trim();
  if (!raw || JAPAN_PLACE_NAMES.has(raw.toUpperCase())) return "Japan";
  // Matches the short form already used as the FREIGHT_USD map's key (see
  // src/lib/landedCost.ts) and everywhere else in the UI.
  if (raw.toUpperCase() === "UNITED KINGDOM") return "UK";
  if (raw.toUpperCase() === "UNITED ARAB EMIRATES") return "UAE";
  if (raw.toUpperCase() === "UNITED STATES" || raw.toUpperCase() === "UNITED STATES OF AMERICA") return "USA";
  return titleCase(raw);
}

/** Strips non-digit characters (commas, "km", "cc", "$", etc.) and parses an int. */
export function parseNumber(raw: string | null | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeFuel(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("hybrid")) return "Hybrid";
  if (s.includes("diesel")) return "Diesel";
  if (s.includes("electric") || s.includes("ev")) return "Electric";
  return "Petrol";
}

export function normalizeTransmission(raw: string): string {
  const s = raw.toLowerCase();
  if (s.startsWith("m")) return "Manual";
  return "Automatic";
}

export function normalizeDrive(raw: string): string {
  const s = raw.toUpperCase().replace(/\s/g, "");
  if (s.includes("4WD") || s.includes("AWD")) return s.includes("AWD") ? "AWD" : "4WD";
  if (s.includes("FWD") || s.includes("2WD")) return "FWD";
  if (s.includes("RWD")) return "RWD";
  return "FWD";
}

export function titleCase(raw: string): string {
  return raw
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
    .trim();
}

// Known multi-word model names, longest first so "Land Cruiser Prado" is
// tried before "Land Cruiser" — otherwise a naive first-word split turns
// "LAND CRUISER PRADO TX-L" into model "Land", trim "Cruiser Prado Tx-L".
const MULTI_WORD_MODELS = ["LAND CRUISER PRADO", "LAND CRUISER", "GRAND VITARA", "WAGON R"].sort(
  (a, b) => b.length - a.length
);

/**
 * Splits the make-stripped remainder of a listing title into model + trim.
 * `words` is already upper-cased, whitespace-normalized tokens with the make
 * itself removed (e.g. ["LAND", "CRUISER", "PRADO", "TX-L"]).
 */
export function splitModelTrim(words: string[]): { model: string; trim: string } {
  const joined = words.join(" ");
  for (const known of MULTI_WORD_MODELS) {
    if (joined.startsWith(known)) {
      const modelWordCount = known.split(" ").length;
      return {
        model: titleCase(known),
        trim: words.slice(modelWordCount).join(" ") || "Standard",
      };
    }
  }
  return {
    model: words[0] ? titleCase(words[0]) : "Unknown",
    trim: words.slice(1).join(" ") || "Standard",
  };
}

/**
 * Neither exporter's listing page exposes a clean body-type field — infer it
 * from the model/trim text. Approximate on purpose; good enough for search
 * filtering, not a substitute for a real spec feed.
 */
export function guessBodyType(modelText: string): string {
  const s = modelText.toUpperCase();
  if (
    /\b(VAN|HIACE|CARAVAN|NV350|ALPHARD|VELLFIRE|NOAH|VOXY|SERENA|STEPWAGON|FREED|SIENTA|ELGRAND|SPRINTER|VITO|TRANSPORTER|CARAVELLE)\b/.test(
      s
    )
  )
    return "Van";
  if (/\b(PICKUP|HILUX|NAVARA|TRITON|D-MAX)\b/.test(s)) return "Pickup";
  if (/\b(TRUCK|DYNA|CANTER|ELF|FORWARD|GIGA)\b/.test(s)) return "Truck";
  if (/\b(WAGON|FIELDER|AVENSIS.*WAGON|OUTBACK)\b/.test(s)) return "Wagon";
  if (
    /\b(RAV4|HARRIER|LAND CRUISER|PRADO|CX-5|CX-3|FORESTER|X-TRAIL|CR-V|VEZEL|HR-V|SPORTAGE|OUTLANDER|KLUGER|HIGHLANDER|PAJERO|G[ -]?CLASS|GLE|GLC|GLA|GLS|RANGE ROVER|DEFENDER|DISCOVERY|EVOQUE|VELAR|X1|X3|X4|X5|X6|X7|Q3|Q5|Q7|Q8|TIGUAN|TOUAREG|SANTA FE|TUCSON|SORENTO|TELLURIDE|XC40|XC60|XC90|F-PACE|E-PACE|RX|NX|GX|LX|3008|5008|EXPLORER|ESCAPE|KUGA)\b/.test(
      s
    )
  )
    return "SUV";
  if (/\b(VITZ|YARIS|SWIFT|FIT|NOTE|DEMIO|MARCH|AQUA)\b/.test(s)) return "Hatchback";
  return "Sedan";
}

export function deriveLifestyle(bodyType: string, fuel: string, sourcePriceUsd: number): string[] {
  const tags = new Set<string>();
  if (bodyType === "SUV") tags.add("family").add("off-road");
  if (bodyType === "Van") tags.add("family").add("business");
  if (bodyType === "Pickup" || bodyType === "Truck") tags.add("business").add("off-road");
  if (bodyType === "Wagon") tags.add("family");
  if (bodyType === "Sedan") tags.add("family");
  if (bodyType === "Hatchback") tags.add("student").add("ride-hailing");
  if (fuel === "Hybrid") tags.add("ride-hailing");
  if (sourcePriceUsd < 8000) tags.add("student");
  if (sourcePriceUsd > 30000) tags.add("luxury");
  return [...tags];
}

export function computeEligibility(year: number): { eligible: boolean; ineligibleReason: string | null } {
  if (year >= IMPORT_ELIGIBLE_FROM_YEAR) return { eligible: true, ineligibleReason: null };
  return {
    eligible: false,
    ineligibleReason: `registered in ${year}, which is older than our ${IMPORT_ELIGIBLE_FROM_YEAR} import threshold.`,
  };
}
