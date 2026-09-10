import type { ScrapedVehicle } from "@/lib/scrapers/types";
import { withRetry } from "@/lib/scrapers/http";
import {
  guessBodyType,
  IMPORT_ELIGIBLE_FROM_YEAR,
  normalizeFuel,
  normalizeTransmission,
  parseNumber,
  titleCase,
} from "@/lib/scrapers/normalize";

/**
 * AUTOCOM JAPAN (autocj.co.jp) — the exporter's own stock site, not a
 * reseller feed.
 *
 * It's a Next.js App Router app: requesting a page with the `RSC: 1` header
 * returns the React-Flight payload, which carries the used-car search
 * results as a plain JSON array under `"data":[ ... ]`. That's far cleaner
 * (and lighter) than parsing the hydrated HTML, and needs no per-make
 * iteration — the search is globally paginated (`?page=N`, 25 cars/page,
 * ~92k cars / ~3.7k pages as of this writing).
 */

const BASE = "https://autocj.co.jp";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export const AUTOCOM_PAGE_SIZE = 25;

/** Only the fields we actually map — the feed object has ~55 keys. */
type AutocomCar = {
  refno: string | null;
  isSold: boolean;
  chassis: string | null;
  carShift: string | null;
  ryear: number | null;
  pyear: number | null;
  rmonth: number | null;
  pmonth: number | null;
  makerName: string | null;
  carName: string | null;
  grade: string | null;
  model: string | null;
  currency: number | null; // 1 = USD
  fuel: string | null;
  cc: string | null;
  carColor: string | null;
  km1: string | null;
  price: number | null;
  imageCar: string | null;
  isTagHybrid?: boolean;
};

export class AutocomRateLimited extends Error {}

const RETRYABLE = new Set([429, 403, 502, 503, 504]);

async function fetchFlight(page: number): Promise<string> {
  const url = `${BASE}/used_cars?page=${page}`;
  return withRetry(async () => {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, RSC: "1", Accept: "*/*" },
    });
    if (RETRYABLE.has(res.status)) throw new AutocomRateLimited(`autocom rate-limited (${res.status}) ${url}`);
    if (!res.ok) throw new Error(`autocom request failed: ${res.status} ${url}`);
    return res.text();
  });
}

/** Bracket-balances the `data:[ ... ]` car array out of the Flight text. */
function extractCars(flight: string): AutocomCar[] {
  const marker = flight.indexOf('"data":[{"id"');
  if (marker < 0) return [];
  const start = flight.indexOf("[", marker);
  let depth = 0;
  for (let i = start; i < flight.length; i++) {
    const c = flight[i];
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(flight.slice(start, i + 1)) as AutocomCar[];
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

function ym(year: number | null, month: number | null): string | undefined {
  if (!year) return undefined;
  return month ? `${year}-${String(month).padStart(2, "0")}` : String(year);
}

function toVehicle(c: AutocomCar): ScrapedVehicle | null {
  if (c.isSold) return null;
  const year = c.ryear || c.pyear || 0;
  const price = typeof c.price === "number" ? Math.round(c.price) : 0;
  if (!c.refno || !c.makerName || !c.carName || !year || !price) return null;
  if (c.currency !== 1) return null; // only the USD-priced listings — matches how the rest of the catalogue is stored
  if (year < IMPORT_ELIGIBLE_FROM_YEAR) return null; // older than Kenya's 8-year import threshold

  const fuelRaw = c.isTagHybrid ? "hybrid" : c.fuel || "petrol";
  const modelText = `${c.carName} ${c.grade ?? ""}`;

  // The search feed's `imageCar` is a 160px list thumbnail. The real gallery
  // photos live alongside it as `<refno>-01.jpg` .. `-06.jpg` (a consistent
  // 640x480 on AUTOCOM's asset CDN) — swap to `-01` for the cover.
  const imageUrl = c.imageCar ? c.imageCar.replace(/\.jpe?g(\?.*)?$/i, "-01.jpg") : null;

  return {
    sourceSite: "autocom",
    externalId: `autocom:${c.refno}`,
    sourceUrl: `${BASE}/usedcar?stock=${c.refno}`,
    make: titleCase(c.makerName),
    model: titleCase(c.carName),
    trim: c.grade ? titleCase(c.grade) : "",
    year,
    mileageKm: Math.round(parseNumber(c.km1)),
    fuel: normalizeFuel(fuelRaw),
    transmission: normalizeTransmission(c.carShift || "AT"),
    engineCc: Math.round(parseNumber(c.cc)),
    bodyType: guessBodyType(modelText),
    drive: "FWD", // not exposed in the search feed
    seats: 5, // not exposed in the search feed
    color: c.carColor ? titleCase(c.carColor) : "White",
    sourceCountry: "Japan",
    sourcePriceUsd: price,
    imageUrl,
    imageWidthPx: imageUrl ? 640 : undefined, // AUTOCOM's `-01.jpg` is a consistent 640x480
    chassisNo: c.chassis || undefined,
    modelCode: c.model || undefined,
    registrationYearMonth: ym(c.ryear, c.rmonth),
    manufactureYearMonth: ym(c.pyear, c.pmonth),
  };
}

/**
 * One search-results page (25 cars). Returns "rate-limited" so callers can
 * cool down and retry — same contract as scrapeBeforwardModelPage /
 * scrapeSbtJapanUnit.
 */
export async function scrapeAutocomPage(page: number): Promise<ScrapedVehicle[] | "rate-limited"> {
  let flight: string;
  try {
    flight = await fetchFlight(page);
  } catch (err) {
    if (err instanceof AutocomRateLimited) return "rate-limited";
    console.error(`[autocom] page ${page} failed:`, err);
    return [];
  }
  const out: ScrapedVehicle[] = [];
  for (const c of extractCars(flight)) {
    const v = toVehicle(c);
    if (v) out.push(v);
  }
  return out;
}
