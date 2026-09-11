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
 * AUTOCOM JAPAN (autocj.co.jp) - the exporter's own stock site, not a
 * reseller feed.
 *
 * It's a Next.js App Router app: requesting a page with the `RSC: 1` header
 * returns the React-Flight payload, which carries the used-car search
 * results as a plain JSON array under `"data":[ ... ]`. That's far cleaner
 * (and lighter) than parsing the hydrated HTML, and needs no per-make
 * iteration - the search is globally paginated (`?page=N`, 25 cars/page,
 * ~92k cars / ~3.7k pages as of this writing).
 */

const BASE = "https://autocj.co.jp";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export const AUTOCOM_PAGE_SIZE = 25;

/** Only the fields we actually map - the feed object has ~55 keys. */
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
  if (c.currency !== 1) return null; // only the USD-priced listings - matches how the rest of the catalogue is stored
  if (year < IMPORT_ELIGIBLE_FROM_YEAR) return null; // older than Kenya's 8-year import threshold

  const fuelRaw = c.isTagHybrid ? "hybrid" : c.fuel || "petrol";
  const modelText = `${c.carName} ${c.grade ?? ""}`;

  // The search feed's `imageCar` is a 160px list thumbnail. The real gallery
  // photos live alongside it as `<refno>-01.jpg` .. `-06.jpg` (a consistent
  // 640x480 on AUTOCOM's asset CDN) - swap to `-01` for the cover.
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

export type AutocomSpecs = Partial<
  Pick<ScrapedVehicle, "chassisNo" | "engineCode" | "modelCode" | "doors" | "seats" | "dimensions" | "steering">
>;

function pick(re: RegExp, text: string): string | undefined {
  const m = text.match(re);
  return m ? m[1] : undefined;
}

/**
 * Extra spec sheet from a single car's detail page - the search feed only
 * carries make/model/price/photo, but `/usedcar?stock=<ref>` (as RSC) adds
 * the full chassis & engine numbers when the car has them, plus doors,
 * seats, dimensions and the full model code. Anything the page leaves null
 * (AUTOCOM often has no chassis/engine number on hand) is simply omitted so
 * the caller keeps whatever the feed already gave.
 */
export async function scrapeAutocomDetail(refno: string): Promise<AutocomSpecs | "rate-limited"> {
  let t: string;
  try {
    t = await withRetry(async () => {
      const res = await fetch(`${BASE}/usedcar?stock=${refno}`, {
        headers: { "User-Agent": USER_AGENT, RSC: "1", Accept: "*/*" },
      });
      if (RETRYABLE.has(res.status)) throw new AutocomRateLimited(`autocom detail ${res.status} ${refno}`);
      if (!res.ok) throw new Error(`autocom detail failed: ${res.status} ${refno}`);
      return res.text();
    });
  } catch (err) {
    if (err instanceof AutocomRateLimited) return "rate-limited";
    console.error(`[autocom] detail ${refno} failed:`, err);
    return {};
  }

  const specs: AutocomSpecs = {};
  // Real chassis / engine numbers - a bare frame code ("NRE161") from the
  // feed is not one, so require at least one digit and a length that reads
  // like a stamped number; skip the i18n label ("Chassis") and null.
  const chassis = pick(/"chassis":"([A-Z0-9][A-Z0-9-]{4,})"/, t);
  if (chassis && /\d/.test(chassis) && chassis !== "Chassis") specs.chassisNo = chassis;
  const engineNo = pick(/"engineNo":"([A-Z0-9][A-Z0-9-]{3,})"/, t);
  if (engineNo && engineNo !== "Engine No") specs.engineCode = engineNo;

  const modelCode = pick(/"model":"([0-9A-Z]{2,4}-[0-9A-Z-]{3,})"/, t);
  if (modelCode) specs.modelCode = modelCode;

  const doors = pick(/"door":(\d{1,2})/, t);
  if (doors) specs.doors = parseInt(doors, 10);
  const seats = pick(/"seat":"(\d{1,2})"/, t);
  if (seats) specs.seats = parseInt(seats, 10);

  // length / width / height come back in cm as bare integers.
  const l = pick(/"length":(\d{2,4})/, t);
  const w = pick(/"width":(\d{2,4})/, t);
  const h = pick(/"height":(\d{2,4})/, t);
  if (l && w && h) specs.dimensions = `${(+l / 100).toFixed(2)} x ${(+w / 100).toFixed(2)} x ${(+h / 100).toFixed(2)} m`;

  // AUTOCOM's stock is JDM - right-hand drive unless a listing says otherwise.
  specs.steering = "Right";

  return specs;
}

/**
 * One search-results page (25 cars). Returns "rate-limited" so callers can
 * cool down and retry - same contract as scrapeBeforwardModelPage /
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
