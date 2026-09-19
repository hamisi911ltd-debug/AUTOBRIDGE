import type { ScrapedVehicle } from "@/lib/scrapers/types";
import { withRetry } from "@/lib/scrapers/http";
import { computeEligibility, normalizeFuel, titleCase } from "@/lib/scrapers/normalize";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

// MYK Auto Trader publishes no steering-side field anywhere (list or
// detail page, confirmed by hand) despite shipping to both left- and
// right-hand-drive markets - a real risk for a Kenya-only (RHD-only)
// catalogue, since nothing on the site itself rules out an LHD unit. The
// one signal it does publish is each listing's own destination "Country",
// and exporters don't ship LHD stock to RHD markets - so this is used as
// a steering-side proxy: only listings tagged for a confirmed RHD country
// are kept, everything else (including unrecognized/unlisted countries)
// is dropped rather than risk an LHD car in a RHD-only catalogue.
const RHD_COUNTRIES = new Set(
  [
    "Jamaica", "Trinidad", "Trinidad and Tobago", "Guyana", "Barbados", "Bahamas", "Suriname",
    "Kenya", "Tanzania", "Uganda", "South Africa", "Mozambique", "Zambia", "Zimbabwe", "Botswana",
    "Namibia", "Malawi", "Rwanda", "Mauritius", "Seychelles", "Lesotho", "Eswatini",
    "United Kingdom", "Ireland", "Australia", "New Zealand", "India", "Pakistan", "Bangladesh",
    "Sri Lanka", "Nepal", "Bhutan", "Thailand", "Indonesia", "Malaysia", "Singapore", "Hong Kong",
    "Japan", "Cyprus", "Malta", "Fiji", "Papua New Guinea", "Timor Leste", "East Timor",
  ].map((c) => c.toUpperCase())
);

async function fetchText(url: string): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`MYK Auto Trader request failed: ${res.status} ${url}`);
    return res.text();
  });
}

function extractField(row: string, label: string): string {
  const m = row.match(new RegExp(`<div class="name">${label}</div>[\\s\\S]*?<div class="value">\\s*([^<]+?)\\s*</div>`));
  return m ? m[1].trim() : "";
}

/**
 * Splits the listing page on each card's own start marker, same reasoning
 * as nikkyo.ts's extractRows - safer than trying to regex-balance nested
 * tags across a card that isn't flat markup.
 */
function extractRows(html: string): string[] {
  const marker = "listing-list-loop stm-listing-directory-list-loop stm-isotope-listing-item";
  const starts: number[] = [];
  for (let i = html.indexOf(marker); i !== -1; i = html.indexOf(marker, i + 1)) starts.push(i);
  return starts.map((s, idx) => html.slice(s, idx + 1 < starts.length ? starts[idx + 1] : s + 8000));
}

function parseRow(row: string): ScrapedVehicle | null {
  const country = extractField(row, "Country");
  if (!RHD_COUNTRIES.has(country.toUpperCase())) return null; // the actual safety gate - see RHD_COUNTRIES above

  const stockMatch = row.match(/class="stock-num heading-font"><span>stock# <\/span>([A-Z0-9]+)</);
  const detailMatch = row.match(/href="(https:\/\/www\.mykautotrader\.com\/japanese-used-cars\/[a-z0-9-]+\/)"/);
  if (!stockMatch || !detailMatch) return null;
  const stockCode = stockMatch[1];
  const detailUrl = detailMatch[1];

  const titleMatch = row.match(/<div class="labels">([^<]+)<\/div>\s*(\d{4})/);
  if (!titleMatch) return null;
  const fullTitle = titleMatch[1].trim();
  const year = parseInt(titleMatch[2], 10);
  if (!computeEligibility(year).eligible) return null;

  const make = extractField(row, "Make") || titleCase(fullTitle.split(/\s+/)[0] ?? "");
  const model = extractField(row, "Model") || titleCase(fullTitle.split(/\s+/).slice(1).join(" ")) || "Unknown";
  if (!make) return null;

  const body = extractField(row, "Body");
  const engineRaw = extractField(row, "Engine"); // e.g. "1200 cc"
  const engineCc = Math.round(parseFloat(engineRaw.replace(/[^\d.]/g, "")) || 0);

  const priceMatch = row.match(/class="normal-font">\$?([\d ,]+)</);
  const sourcePriceUsd = Math.round(parseFloat((priceMatch?.[1] ?? "").replace(/[^\d.]/g, ""))) || 0;
  if (!sourcePriceUsd) return null;

  // The largest srcset variant (plain filename, no "-WxH" suffix) rather
  // than the small listing thumbnail the bare `src` attribute points to.
  const srcsetMatch = row.match(/srcset="([^"]+)"/);
  let imageUrl: string | null = null;
  if (srcsetMatch) {
    const candidates = srcsetMatch[1].split(",").map((c) => c.trim().split(/\s+/));
    const best = candidates.reduce<{ url: string; w: number } | null>((acc, [url, wTok]) => {
      const w = parseInt(wTok ?? "0", 10) || 0;
      return !acc || w > acc.w ? { url, w } : acc;
    }, null);
    imageUrl = best?.url ?? null;
  }
  if (!imageUrl) {
    const srcMatch = row.match(/<img\s+src="([^"]+)"/);
    imageUrl = srcMatch ? srcMatch[1] : null;
  }

  return {
    sourceSite: "mykautotrader",
    externalId: `mykautotrader:${stockCode}`,
    sourceUrl: detailUrl,
    make,
    model,
    trim: body ? titleCase(body) : "Standard",
    year,
    // Not published anywhere on this site (list or detail page, confirmed
    // by hand) - 0 is this codebase's existing "unknown" convention for a
    // missing numeric field (same as AUTOCOM's occasional gaps), not a
    // real claim of zero kilometers.
    mileageKm: 0,
    fuel: normalizeFuel("Petrol"), // not on the list card; detail page has it but isn't fetched here (see module comment)
    transmission: "Automatic",
    engineCc,
    bodyType: body ? titleCase(body) : "Sedan",
    drive: "FWD",
    seats: 5,
    color: "White",
    sourceCountry: "Japan",
    sourcePriceUsd,
    imageUrl,
  };
}

/**
 * Scrapes one page (~10 listings) of MYK Auto Trader's Japanese-used-cars
 * catalogue. Deliberately list-page-only, no detail-page fetch - the
 * fields a detail page would add (fuel type, transmission, drive) aren't
 * worth a second request per car on top of the mileage/steering gaps this
 * source already has; fuel/transmission are left at sane Kenya-market
 * defaults (Petrol/Automatic) rather than guessed from partial data.
 */
export async function scrapeMykAutoTraderPage(page: number): Promise<ScrapedVehicle[]> {
  const url = page <= 1 ? "https://www.mykautotrader.com/japanese-used-cars/" : `https://www.mykautotrader.com/japanese-used-cars/page/${page}/`;
  const html = await fetchText(url);
  const rows = extractRows(html);
  const vehicles: ScrapedVehicle[] = [];
  for (const row of rows) {
    try {
      const v = parseRow(row);
      if (v) vehicles.push(v);
    } catch (err) {
      console.error("[mykautotrader] failed to parse a row:", err);
    }
  }
  return vehicles;
}
