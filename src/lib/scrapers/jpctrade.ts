import type { ScrapedVehicle } from "@/lib/scrapers/types";
import { withRetry } from "@/lib/scrapers/http";
import {
  IMPORT_ELIGIBLE_FROM_YEAR,
  guessBodyType,
  normalizeFuel,
  normalizeTransmission,
  parseNumber,
  titleCase,
} from "@/lib/scrapers/normalize";

/**
 * JPC Trade (jpctrade.com) - a Japan-based used-car exporter with its own
 * stock site (not an auction reseller feed). Plain server-rendered PHP
 * pages, no JSON API - listing and detail pages are both parsed with
 * regexes against the raw HTML, same approach as beforward.ts.
 *
 * robots.txt only disallows /auction/, /detail-op/, /listop/ and /cp/ - the
 * public stock listing (`/stock_list.php` / `/stock/<country>`) and detail
 * (`/<id>-japan-used-<make>-<model>-<year>.html`) pages used here aren't
 * under any of those. Their terms.php carries the same standard copyright
 * claim over site content/images as every other source here (BE FORWARD,
 * AUTOCOM) - not a scraping-specific prohibition.
 *
 * Detail pages don't expose a real chassis number (only JPC's own internal
 * "Stock Number", e.g. OPJPC-95961 - stored as refNo, not chassisNo) or
 * doors/seats - same class of gap as AUTOCOM.
 */

const BASE = "https://www.jpctrade.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Country param -> the c_id the site's own stock filter uses internally.
// Kenya is the only one wired up for now; add more here if needed later.
export const JPC_COUNTRIES: Record<string, number> = {
  kenya: 110,
};

export class JpcRateLimited extends Error {}

const RETRYABLE = new Set([429, 403, 502, 503, 504]);
const FETCH_TIMEOUT_MS = 20_000;

async function fetchHtml(url: string): Promise<string> {
  return withRetry(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: controller.signal });
      if (RETRYABLE.has(res.status)) throw new JpcRateLimited(`jpctrade rate-limited (${res.status}) ${url}`);
      if (!res.ok) throw new Error(`jpctrade request failed: ${res.status} ${url}`);
      return await res.text();
    } finally {
      clearTimeout(timeout);
    }
  });
}

/**
 * One stock-listing page for a country - just enumerates the candidate
 * detail-page URLs on it (id + full URL), nothing else. All the real spec
 * data comes from scrapeJpcDetail, since price (FOB in JPY, converted with
 * the page's own live rate) only lives on the detail page anyway.
 */
export async function scrapeJpcListPage(
  country: string,
  page: number
): Promise<{ id: string; url: string }[] | "rate-limited"> {
  const cId = JPC_COUNTRIES[country];
  if (!cId) return [];
  const url = `${BASE}/stock_list.php?country=${encodeURIComponent(country)}&c_id=${cId}&page=${page}`;

  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (err) {
    if (err instanceof JpcRateLimited) return "rate-limited";
    console.error(`[jpctrade] list page ${page} failed:`, err);
    return [];
  }

  const seen = new Map<string, string>();
  const re = /href="(https:\/\/www\.jpctrade\.com\/(\d+)-japan-used-[^"]+\.html)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!seen.has(m[2])) seen.set(m[2], m[1]);
  }
  return [...seen.entries()].map(([id, detailUrl]) => ({ id, url: detailUrl }));
}

function pick(re: RegExp, text: string): string | undefined {
  const m = text.match(re);
  return m ? m[1].trim() : undefined;
}

function specField(label: string, html: string): string | undefined {
  const re = new RegExp(`class="stock_cap_spec">${label}</div>\\s*<div class="stock_det_spec">(?:<b>)?([^<]*)`, "i");
  const v = pick(re, html);
  return v ? v.trim() : undefined;
}

/**
 * Fetches one car's detail page and returns a fully-populated
 * ScrapedVehicle, or null if the page didn't parse (missing required
 * fields) or the car is older than Kenya's import-age threshold.
 */
export async function scrapeJpcDetail(id: string, url: string): Promise<ScrapedVehicle | null | "rate-limited"> {
  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (err) {
    if (err instanceof JpcRateLimited) return "rate-limited";
    console.error(`[jpctrade] detail ${id} failed:`, err);
    return null;
  }

  // Neither the <h2> title nor the "Year/Month" spec field can be trusted -
  // confirmed live: plenty of real, current listings have no <h2> at all, or
  // a literal "- -" placeholder in Year/Month despite a real year existing.
  // The URL itself is the one place make/model/year are always present and
  // consistently formatted: /<id>-japan-used-<make>-<model>-<year>.html,
  // where make and model each use "+" for their own internal spaces (so
  // "mercedes+benz-g+class-2001" splits on the *first* "-" into make/model).
  const slugMatch = url.match(/\/\d+-japan-used-(.+)-(\d{4})\.html$/i);
  if (!slugMatch) return null;
  const year = parseInt(slugMatch[2], 10);
  if (!year || year < IMPORT_ELIGIBLE_FROM_YEAR) return null;

  const makeModelSlug = slugMatch[1];
  const dashIdx = makeModelSlug.indexOf("-");
  const makeSlug = dashIdx >= 0 ? makeModelSlug.slice(0, dashIdx) : makeModelSlug;
  const modelSlug = dashIdx >= 0 ? makeModelSlug.slice(dashIdx + 1) : "";
  const make = titleCase(makeSlug.replace(/\+/g, " "));
  // Prefer the dedicated "Model" spec field (cleaner - just "Land Cruiser
  // 70", no grade mixed in) when it's actually populated; the URL slug is
  // the fallback, not the primary, since it can carry odd characters.
  const modelSpec = specField("Model", html);
  const model = modelSpec ? titleCase(modelSpec) : titleCase(modelSlug.replace(/\+/g, " "));
  if (!make || !model) return null;

  const grade = specField("Grade", html);
  const transmissionRaw = specField("Transmission", html);
  const engineCcRaw = specField("Engine CC", html);
  const mileageRaw = specField("Mileage", html);
  const color = specField("Color", html);
  const stockNo = specField("Stock Number", html) ?? pick(/name="stock_no" value="(\d+)"/, html);

  const fuelDet = pick(/sp-fuel-dt[^>]*><\/span>\s*Fuel<\/div>\s*<div class="stock_det">([^<]*)/, html);
  const fuelRaw = fuelDet && fuelDet !== "--" ? fuelDet : "petrol";

  // Captured text reads "Japan &raquo; Yokohama" - just the city after the
  // separator is wanted (sourceCountry already carries "Japan" on its own).
  const locationRaw = pick(/aria-label='Stock Location'[^>]*><\/span>&nbsp;([^<]+?)\s*&nbsp;/, html);
  const location = locationRaw?.split("&raquo;").pop()?.trim();

  // FOB price is stored server-side in JPY (a hidden input) and converted
  // client-side with the page's own live rate - doing the same math here
  // avoids scraping the already-formatted, currency-dependent display text.
  const fobJpyRaw = pick(/id="fob_price" value="(\d+)"/, html);
  const rateRaw = pick(/conversion_rate\s*=\s*"([\d.]+)"/, html);
  const fobJpy = fobJpyRaw ? parseInt(fobJpyRaw, 10) : 0;
  const rate = rateRaw ? parseFloat(rateRaw) : 0;
  const priceUsd = fobJpy && rate ? Math.round(fobJpy * rate) : 0;
  if (!priceUsd) return null; // "Ask"-only listings (no published FOB) aren't usable here

  const image = pick(/src="(https:\/\/www\.jpctrade\.com\/vehicle_image\/[^"]+\.(?:jpe?g|png))"/i, html);

  const modelText = `${model} ${grade ?? ""}`;

  return {
    sourceSite: "jpctrade",
    externalId: `jpctrade:${id}`,
    sourceUrl: url,
    make,
    model,
    trim: grade ? titleCase(grade) : "Standard",
    year,
    mileageKm: Math.round(parseNumber(mileageRaw)),
    fuel: normalizeFuel(fuelRaw),
    transmission: normalizeTransmission(transmissionRaw ?? "AT"),
    engineCc: Math.round(parseNumber(engineCcRaw)),
    bodyType: guessBodyType(modelText),
    drive: "FWD", // not exposed on the detail page
    seats: 5, // not exposed on the detail page
    color: color ? titleCase(color) : "White",
    sourceCountry: "Japan",
    sourcePriceUsd: priceUsd,
    imageUrl: image ?? null,
    refNo: stockNo,
    steering: "Right", // JDM stock, same as AUTOCOM
    location: location ? titleCase(location) : "Yokohama",
  };
}
