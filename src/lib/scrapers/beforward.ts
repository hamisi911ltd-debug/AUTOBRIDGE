import { parse, type HTMLElement } from "node-html-parser";
import type { ScrapedVehicle } from "@/lib/scrapers/types";
import { withRetry } from "@/lib/scrapers/http";
import { fetchCoverImage } from "@/lib/scrapers/coverImage";
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

/** make=N ids on beforward.jp, confirmed against the live site's maker list. */
export const BEFORWARD_MAKES: { id: number; make: string }[] = [
  { id: 1, make: "Toyota" },
  { id: 2, make: "Honda" },
  { id: 3, make: "Nissan" },
  { id: 4, make: "Mazda" },
  { id: 5, make: "Mitsubishi" },
  { id: 7, make: "Suzuki" },
  { id: 8, make: "Isuzu" },
  { id: 94, make: "Subaru" },
  { id: 10, make: "Daihatsu" },
  { id: 103, make: "Hino" },
  { id: 68, make: "Lexus" },
  { id: 106, make: "Mercedes-Benz" },
  { id: 83, make: "BMW" },
  { id: 48, make: "Volkswagen" },
  { id: 47, make: "Audi" },
  { id: 73, make: "Peugeot" },
  { id: 50, make: "Ford" },
  { id: 57, make: "Volvo" },
  { id: 52, make: "Land Rover" },
  { id: 79, make: "Jaguar" },
  { id: 44, make: "Hyundai" },
  // Kia deliberately excluded — removed from inventory at the user's
  // request (over-represented relative to Kenya's actual popular-import
  // mix); keeping it out of the make list stops future scrapes from
  // silently reintroducing it.
];

function urlFor(makeId: number, page: number, modelId?: number): string {
  const base = modelId
    ? `https://www.beforward.jp/stocklist/make=${makeId}/model=${modelId}`
    : `https://www.beforward.jp/stocklist/make=${makeId}`;
  return page <= 1 ? `${base}/sortkey=n` : `${base}/page=${page}/sortkey=n`;
}

function detailedSpecMap(row: HTMLElement): Record<string, string> {
  const map: Record<string, string> = {};
  for (const tr of row.querySelectorAll("table.table-detailed-spec tr")) {
    const cells = tr.querySelectorAll("th, td");
    for (let i = 0; i + 1 < cells.length; i += 2) {
      const label = cells[i].text.trim();
      const value = cells[i + 1].text.trim();
      if (label) map[label] = value;
    }
  }
  return map;
}

export class RateLimitedError extends Error {}

// Any of these on a stocklist page means "the request failed," never
// "genuinely zero vehicles" — a real incident showed 429 wasn't the only
// status BE FORWARD's edge (AWS ELB) hands back under load; 403/502/503/504
// are the standard set an ELB/WAF can return while it's throttling or
// unhealthy. Treating only literal 429 as retry-worthy let those other
// codes fall through to the generic "log and treat as empty" path, which
// silently masked real stock as "no listings for this model."
const RETRYABLE_STATUSES = new Set([429, 403, 502, 503, 504]);

async function fetchPage(url: string): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (RETRYABLE_STATUSES.has(res.status)) throw new RateLimitedError(`BE FORWARD rate-limited (${res.status}) ${url}`);
    if (!res.ok) throw new Error(`BE FORWARD request failed: ${res.status} ${url}`);
    return res.text();
  });
}

function parsePage(html: string, make: string): ScrapedVehicle[] {
  const root = parse(html);
  const vehicles: ScrapedVehicle[] = [];

  for (const row of root.querySelectorAll("tr.stocklist-row")) {
    const refNo = (row.querySelector(".veh-stock-no span")?.text ?? "").replace(/Ref No\.?/i, "").trim();
    if (!refNo) continue;

    const nameText = (row.querySelector(".make-model a")?.text ?? "").replace(/\s+/g, " ").trim();
    const yearMatch = nameText.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? parseInt(yearMatch[0], 10) : 0;
    const afterYear = yearMatch ? nameText.slice(nameText.indexOf(yearMatch[0]) + 4).trim() : nameText;
    // afterYear is roughly "TOYOTA REGIUSACE VAN LONG SUPER GL" — first word is
    // the make (already known from the search facet), rest splits model/trim.
    const words = afterYear.split(" ").filter(Boolean);
    const rest = words.slice(1); // drop the repeated make token
    const { model, trim } = splitModelTrim(rest);

    const mileageKm = Math.round(parseNumber(row.querySelector(".basic-spec-col.mileage .val")?.text ?? ""));
    const engineCc = Math.round(parseNumber(row.querySelector(".basic-spec-col.engine .val")?.text ?? ""));
    const transmission = normalizeTransmission((row.querySelector(".basic-spec-col.trans .val")?.text ?? "").trim() || "AT");

    const priceText = row.querySelector(".vehicle-price .price")?.text ?? "";
    const sourcePriceUsd = Math.round(parseNumber(priceText));

    const spec = detailedSpecMap(row);
    const fuel = normalizeFuel(spec["Fuel"] || "Petrol");
    const drive = normalizeDrive(spec["Drive"] || "FWD");
    const color = spec["Color"] ? titleCase(spec["Color"]) : "White";
    const seats = parseInt(spec["Seats"] || "5", 10) || 5;

    let imageUrl = row.querySelector("img")?.getAttribute("src") || null;
    if (imageUrl?.startsWith("//")) imageUrl = "https:" + imageUrl;
    // The listing page requests a 200px thumbnail (?w=200); the "medium"
    // folder's native resolution is closer to 480px, so ask for that
    // instead — same file, no extra request, noticeably sharper.
    if (imageUrl) imageUrl = imageUrl.replace(/([?&])w=\d+/, "$1w=640");

    const detailHref = row.querySelector(".veh-stock-no a")?.getAttribute("href") || row.querySelector(".make-model a")?.getAttribute("href");
    const sourceUrl = detailHref ? new URL(detailHref, "https://www.beforward.jp").toString() : "https://www.beforward.jp";

    if (!year || !sourcePriceUsd) continue; // incomplete listing — skip rather than store junk
    if (year < IMPORT_ELIGIBLE_FROM_YEAR) continue; // older than Kenya's import threshold — not buyable, don't store it

    vehicles.push({
      sourceSite: "beforward",
      externalId: `beforward:${refNo}`,
      sourceUrl,
      make,
      model,
      trim,
      year,
      mileageKm,
      fuel,
      transmission,
      engineCc,
      bodyType: guessBodyType(afterYear),
      drive,
      seats,
      color,
      sourceCountry: "Japan",
      sourcePriceUsd,
      imageUrl,
    });
  }

  return vehicles;
}

/**
 * Scrapes a single page for a single configured make from beforward.jp's
 * public stocklist. No auth, no API — this is a plain HTML scrape. Kept to
 * one (make, page) per call so each call's parsing work stays small: on
 * Cloudflare Workers this runs as one HTTP request per unit (see
 * runScrapeUnit), which keeps every invocation well under the platform's
 * per-request CPU budget instead of parsing dozens of pages in one shot.
 */
export async function scrapeBeforwardUnit(makeIndex: number, page: number): Promise<ScrapedVehicle[]> {
  const entry = BEFORWARD_MAKES[makeIndex];
  if (!entry) return [];
  try {
    const html = await fetchPage(urlFor(entry.id, page));
    const vehicles = parsePage(html, entry.make);
    await Promise.all(vehicles.map(upgradeCoverImage));
    return vehicles;
  } catch (err) {
    console.error(`[beforward] failed make=${entry.make} page=${page}:`, err);
    return [];
  }
}

/** Mutates v.imageUrl/v.imageWidthPx in place if a better detail-page photo is found; leaves the listing thumbnail untouched otherwise. */
async function upgradeCoverImage(v: ScrapedVehicle): Promise<void> {
  const better = await fetchCoverImage("beforward", v.sourceUrl);
  if (better && better !== "rate-limited") {
    v.imageUrl = better.url;
    v.imageWidthPx = better.widthPx;
  }
}

/**
 * Model-filtered listing fetch, used for one-off deep-dive batches (e.g. a
 * specific make's most popular models) run from a local script rather than
 * the Workers-deployed nightly unit. Deliberately skips the cover-image
 * upgrade step here — callers that want it should upgrade sequentially
 * themselves (see scripts/scrapeToyotaModels.ts): scrapeBeforwardUnit's
 * Promise.all-of-30 detail-page fetches is fine for a single nightly page
 * but tripped BE FORWARD's rate limiter when run repeatedly across many
 * pages in one sitting (confirmed while building fixLowResImages.ts).
 */
export async function scrapeBeforwardModelPage(makeId: number, make: string, modelId: number, page: number): Promise<ScrapedVehicle[] | "rate-limited"> {
  try {
    const html = await fetchPage(urlFor(makeId, page, modelId));
    return parsePage(html, make);
  } catch (err) {
    if (err instanceof RateLimitedError) return "rate-limited";
    console.error(`[beforward] failed make=${make} model=${modelId} page=${page}:`, err);
    return [];
  }
}
