import { parse } from "node-html-parser";
import type { ScrapedVehicle } from "@/lib/scrapers/types";
import { withRetry } from "@/lib/scrapers/http";
import {
  guessBodyType,
  IMPORT_ELIGIBLE_FROM_YEAR,
  normalizeDrive,
  normalizeFuel,
  normalizeTransmission,
  parseNumber,
  splitModelTrim,
  titleCase,
} from "@/lib/scrapers/normalize";

const USER_AGENT =
  "Mozilla/5.0 (compatible; AutoBridgeKenyaBot/1.0; nightly inventory sync)";

/** make_id values on sbtjapan.com, confirmed against the live site's search results. */
export const SBT_MAKES: { id: number; slug: string; make: string }[] = [
  { id: 2, slug: "toyota", make: "Toyota" },
  { id: 3, slug: "nissan", make: "Nissan" },
  { id: 4, slug: "honda", make: "Honda" },
  { id: 5, slug: "mazda", make: "Mazda" },
  { id: 6, slug: "mitsubishi", make: "Mitsubishi" },
  { id: 7, slug: "subaru", make: "Subaru" },
  { id: 9, slug: "suzuki", make: "Suzuki" },
  { id: 12, slug: "isuzu", make: "Isuzu" },
  { id: 8, slug: "daihatsu", make: "Daihatsu" },
  { id: 69, slug: "hino", make: "Hino" },
  { id: 13, slug: "lexus", make: "Lexus" },
  { id: 72, slug: "mercedes", make: "Mercedes-Benz" },
  { id: 45, slug: "bmw", make: "BMW" },
  { id: 53, slug: "volkswagen", make: "Volkswagen" },
  { id: 44, slug: "audi", make: "Audi" },
  { id: 41, slug: "peugeot", make: "Peugeot" },
  { id: 21, slug: "ford", make: "Ford" },
  { id: 67, slug: "volvo", make: "Volvo" },
  { id: 33, slug: "land-rover", make: "Land Rover" },
  { id: 32, slug: "jaguar", make: "Jaguar" },
  { id: 65, slug: "hyundai", make: "Hyundai" },
  // Kia deliberately excluded - removed from inventory at the user's
  // request (over-represented relative to Kenya's actual popular-import
  // mix); keeping it out of the make list stops future scrapes from
  // silently reintroducing it.
];

// SBT moved from /used-cars/search?make_id=N to per-make paths
// (/used-cars/toyota). The old URL now only redirects there, and loses any
// filter on the way. year__from is SBT's own year facet, so the page only
// lists cars that can actually be imported (parsePage still re-checks).
function urlFor(slug: string, page: number): string {
  return `https://www.sbtjapan.com/used-cars/${slug}?year__from=${IMPORT_ELIGIBLE_FROM_YEAR}&page=${page}`;
}

export class RateLimitedError extends Error {}

// See the matching constant in beforward.ts - 429 alone missed real
// throttling incidents, where the edge returned other codes an ELB/WAF
// hands back under load.
const RETRYABLE_STATUSES = new Set([429, 403, 502, 503, 504]);
const MAX_REDIRECTS = 8;

function setCookies(headers: Headers): string[] {
  const h = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === "function") return h.getSetCookie();
  const raw = headers.get("set-cookie");
  return raw ? raw.split(/,(?=[^;]+=[^;]+)/) : [];
}

/**
 * sbtjapan.com answers a cookie-less first hit with a chain of 302s that
 * each set session cookies (sbt_ec, PHPSESSID, Cloudflare's __cf_bm) before
 * serving the page. fetch() can't carry cookies across redirects on its
 * own, which is what left the old code looping until it gave up. This
 * follows the chain by hand with a small cookie jar.
 */
async function fetchSbt(url: string): Promise<string> {
  return withRetry(async () => {
    const jar = new Map<string, string>();
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
      const res = await fetch(current, {
        headers: { "User-Agent": USER_AGENT, ...(cookie ? { Cookie: cookie } : {}) },
        redirect: "manual",
      });
      for (const c of setCookies(res.headers)) {
        const [pair] = c.split(";");
        const eq = pair.indexOf("=");
        if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
      if (RETRYABLE_STATUSES.has(res.status)) throw new RateLimitedError(`SBT Japan rate-limited (${res.status}) ${url}`);
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) throw new Error(`SBT Japan redirect without location ${current}`);
        current = new URL(location, current).toString();
        continue;
      }
      if (!res.ok) throw new Error(`SBT Japan request failed: ${res.status} ${url}`);
      return res.text();
    }
    throw new Error(`SBT Japan too many redirects ${url}`);
  });
}

/**
 * SBT Japan's own photos (img.sbtjapan.com/img/carphoto/...) are clean and
 * scale to 1200px+ on request. A chunk of listings instead point at
 * img.sbtjapan.com/dealercarphoto/... - third-party dealer-network photos
 * that carry another used-car platform's watermark baked into the image -
 * or, occasionally, a relative /html/template/default/... path, which is
 * SBT's own broken-image placeholder graphic, not a photo at all. Both are
 * worse than no photo (falls back to the plain vehicle-icon placeholder in
 * the UI), so treat them as no image rather than display them.
 */
function cleanSbtImage(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("https://img.sbtjapan.com/") || raw.includes("/dealercarphoto/")) return null;
  try {
    const url = new URL(raw);
    url.searchParams.set("imwidth", "1200");
    return url.toString();
  } catch {
    return null;
  }
}

function parsePage(html: string, make: string): ScrapedVehicle[] {
  const root = parse(html);
  const vehicles: ScrapedVehicle[] = [];

  for (const item of root.querySelectorAll("li.search-result__item")) {
    const stockId = (item.querySelector(".card-product__stock-value")?.text ?? "").trim();
    if (!stockId) continue;

    const heading = (item.querySelector("h2.card-product__product")?.text ?? "").replace(/\s+/g, " ").trim();
    const [yearPart, ...rest] = heading.split(" ");
    const year = parseInt((yearPart || "").split("/")[0], 10) || 0;
    const words = rest.filter(Boolean);
    const modelWords = words.slice(1); // drop the repeated make token
    const { model, trim } = splitModelTrim(modelWords);

    const status = (cls: string) =>
      (item.querySelector(`.card-product__status.-${cls}`)?.text ?? "").trim();

    const mileageKm = Math.round(parseNumber(status("mileage")));
    const engineCc = Math.round(parseNumber(status("engine-capacity")));
    const transmission = normalizeTransmission(status("transmission") || "AT");
    const drive = normalizeDrive(status("drive-type") || "FWD");
    const fuel = normalizeFuel(status("fuel-type") || "Petrol");
    const colorRaw = status("body-color");
    const color = colorRaw && colorRaw !== "-" ? titleCase(colorRaw) : "White";
    const seatsRaw = status("seats");
    const seats = seatsRaw && seatsRaw !== "-" ? parseInt(seatsRaw, 10) || 5 : 5;

    // SBT shows two prices per listing: "Vehicle Price" (the bare unit cost)
    // and "Total Price" - their own C&F (Cost & Freight) figure to Mombasa,
    // the default destination port on every listing this site has served us.
    // The Total Price is what a Kenyan buyer actually pays before duty, so
    // it's used as sourcePriceUsd whenever present - freightIncluded then
    // tells landedCost.ts not to add freight again on top of it. Falls back
    // to the bare Vehicle Price (freightIncluded left false) on the rare
    // listing where Total Price isn't rendered.
    const totalPriceText = item.querySelector(".card-product__total-price .card-product__price")?.text ?? "";
    const totalPriceUsd = Math.round(parseNumber(totalPriceText));
    const vehiclePriceText = item.querySelector(".card-product__vehicle-price .card-product__price")?.text ?? "";
    const vehiclePriceUsd = Math.round(parseNumber(vehiclePriceText));
    const freightIncluded = totalPriceUsd > 0;
    const sourcePriceUsd = freightIncluded ? totalPriceUsd : vehiclePriceUsd;

    let imageUrl = item.querySelector(".card-product__image img")?.getAttribute("src") || null;
    if (imageUrl?.startsWith("//")) imageUrl = "https:" + imageUrl;
    imageUrl = cleanSbtImage(imageUrl);

    const detailHref = item.querySelector(".card-product__wrap")?.getAttribute("href");
    const sourceUrl = detailHref
      ? new URL(detailHref, "https://www.sbtjapan.com").toString()
      : `https://www.sbtjapan.com/used-cars/${stockId}`;

    if (!year || !sourcePriceUsd) continue;
    if (year < IMPORT_ELIGIBLE_FROM_YEAR) continue; // older than Kenya's import threshold - not buyable, don't store it

    vehicles.push({
      sourceSite: "sbtjapan",
      externalId: `sbtjapan:${stockId}`,
      sourceUrl,
      make,
      model,
      trim,
      year,
      mileageKm,
      fuel,
      transmission,
      engineCc,
      bodyType: guessBodyType(heading),
      drive,
      seats,
      color,
      sourceCountry: "Japan",
      sourcePriceUsd,
      freightIncluded,
      imageUrl,
    });
  }

  return vehicles;
}

/**
 * Scrapes a single page for a single configured make, starting a fresh
 * cookie session each call (see fetchSbt).
 */
export async function scrapeSbtJapanUnit(makeIndex: number, page: number): Promise<ScrapedVehicle[] | "rate-limited"> {
  const entry = SBT_MAKES[makeIndex];
  if (!entry) return [];
  try {
    const html = await fetchSbt(urlFor(entry.slug, page));
    return parsePage(html, entry.make);
    // Deliberately not upgrading via fetchCoverImage here, unlike beforward:
    // SBT's listing thumbnail already reliably serves a real ?imwidth=1200
    // photo (unlike beforward's ?w= param, which some listings silently
    // ignore), and this site's units are already hitting Workers' CPU limit
    // on a meaningful fraction of runs - adding another fetch+parse per
    // vehicle here would only make that worse for no real quality gain.
  } catch (err) {
    if (err instanceof RateLimitedError) return "rate-limited";
    console.error(`[sbtjapan] failed make=${entry.make} page=${page}:`, err);
    return [];
  }
}
