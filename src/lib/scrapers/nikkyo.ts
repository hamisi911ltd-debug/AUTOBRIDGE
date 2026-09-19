import type { ScrapedVehicle } from "@/lib/scrapers/types";
import { withRetry } from "@/lib/scrapers/http";
import { computeEligibility, normalizeFuel, normalizeTransmission, normalizeDrive, parseNumber, titleCase } from "@/lib/scrapers/normalize";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

async function fetchText(url: string): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`Nikkyo request failed: ${res.status} ${url}`);
    return res.text();
  });
}

/**
 * Nikkyo's own listing photos are served through a Cloudinary fetch proxy
 * that overlays "www.nikkyocars.com Ref:XXXXX" text onto every image
 * (`l_text:...` in the transform chain) - the real, unwatermarked photo is
 * the URL Cloudinary is itself fetching, embedded as the last `https://`
 * segment of that same string. Using that directly instead needs no
 * watermark-hiding strip at all for this source, unlike every other one.
 */
function unwrapCloudinaryImage(src: string): string | null {
  // The real path has multiple directory levels (pic/2026/NS/NS395225-26.jpg)
  // - match everything up to the extension, stopping only at a comma (a
  // Cloudinary transform-parameter separator, never a real path character).
  const matches = [...src.matchAll(/https:\/\/www\.nikkyocars\.com\/pic\/[^,]+\.jpe?g/gi)];
  return matches.length > 0 ? matches[matches.length - 1][0] : null;
}

function extractField(row: string, pattern: RegExp): string {
  const m = row.match(pattern);
  return m ? m[1].trim() : "";
}

/**
 * Nikkyo's list page (unlike BE FORWARD/SBT Japan) already carries every
 * field this catalogue needs per listing - mileage, year, engine, trans,
 * location, model code, steering, fuel, seats, shape, color, drive train,
 * doors, and both the discounted and pre-discount C&F price - so this
 * doesn't need a second per-vehicle detail-page fetch the way those do.
 */
function parseRow(row: string): ScrapedVehicle | null {
  const codeMatch = row.match(/class="list_code">#([A-Z0-9]+)</);
  const detailMatch = row.match(/stock-view\.asp\?lang=en&(?:amp;)?code=(\d+)/);
  if (!codeMatch || !detailMatch) return null;
  const stockCode = codeMatch[1];
  const detailCode = detailMatch[1];

  const titleMatch = row.match(/<h4>\s*<a[^>]*>\s*<b>(\d{4})\s+([A-Z0-9 .-]+?)<\/b>/i);
  if (!titleMatch) return null;
  const year = parseInt(titleMatch[1], 10);
  const makeModelWords = titleMatch[2].trim().split(/\s+/);
  const make = titleCase(makeModelWords[0] ?? "");
  const model = titleCase(makeModelWords.slice(1).join(" ")) || "Unknown";
  if (!make) return null;

  if (!computeEligibility(year).eligible) return null; // matches every other scraper: don't even store known-ineligible stock

  const mileageKm = Math.round(parseNumber(extractField(row, /<th>Mileage<\/th>[\s\S]*?<td><b>([\d,]+)km<\/b>/)));
  const engineCc = Math.round(parseNumber(extractField(row, /<th>Engine<\/th>[\s\S]*?<td><b>([\d,]+)cc<\/b>/)));
  const transRaw = extractField(row, /<th>Trans<\/th>[\s\S]*?<td><b>([A-Za-z]+)<\/b>/);
  const location = extractField(row, /class="img_loc_[A-Z]+"[^>]*\/>\s*<b>([^<]+)<\/b>/);

  const modelCode = extractField(row, /<th>Model<\/th>\s*<td><b>([^<]+)<\/b>/);
  const steering = extractField(row, /<th>Steering<\/th>\s*<td><b>([^<]+)<\/b>/);
  const fuelRaw = extractField(row, /<th>Fuel<\/th>\s*<td><b>([^<]+)<\/b>/);
  const seats = parseInt(extractField(row, /<th>Seats<\/th>\s*<td><b>(\d+)<\/b>/), 10) || 5;
  const shape = extractField(row, /<th>Shape<\/th>\s*<td><b>([^<]+)<\/b>/);
  const color = extractField(row, /<th>Color<\/th>\s*<td><b>([A-Za-z ]+)/);
  const driveRaw = extractField(row, /<th>Drive Train<\/th>\s*<td><b>([^<]+)<\/b>/);
  const doors = parseInt(extractField(row, /<th>Doors<\/th>\s*<td><b>(\d+)<\/b>/), 10) || undefined;

  // "C&F Price" = Cost & Freight - already inclusive of shipping, same
  // semantics as SBT Japan's own freight-inclusive "Total Price".
  const priceBlock = row.match(/fob_usd[^>]*>([\s\S]*?)<\/span>/);
  const sourcePriceUsd = Math.round(parseNumber(priceBlock ? priceBlock[1].replace(/<del[^>]*>[\s\S]*?<\/del>/, "") : ""));
  if (!sourcePriceUsd) return null;

  const imgMatch = row.match(/class="car_img"[^>]*data-original="([^"]+)"/) ?? row.match(/data-original="([^"]+)"[^>]*class="car_img"/);
  const imageUrl = imgMatch ? unwrapCloudinaryImage(imgMatch[1]) : null;

  return {
    sourceSite: "nikkyo",
    externalId: `nikkyo:${stockCode}`,
    sourceUrl: `https://www.nikkyocars.com/n2014/stock/stock-view.asp?lang=en&code=${detailCode}`,
    make,
    model,
    trim: shape ? titleCase(shape) : "Standard",
    year,
    mileageKm,
    fuel: normalizeFuel(fuelRaw || "Petrol"),
    transmission: normalizeTransmission(transRaw || "Automatic"),
    engineCc,
    bodyType: shape ? titleCase(shape) : "Sedan",
    drive: normalizeDrive(driveRaw || "2WD"),
    seats,
    color: color ? titleCase(color) : "White",
    sourceCountry: "Japan",
    sourcePriceUsd,
    freightIncluded: true,
    imageUrl,
    modelCode: modelCode || undefined,
    steering: steering || undefined,
    location: location ? titleCase(location) : undefined,
    doors,
  };
}

/**
 * Splits the list page on each card's own `<td class="td_photo">` start
 * marker rather than trying to regex-balance `<tr>`/`</tr>` tags - each
 * card's markup nests a *second* table (tbl_km/tbl_model) with its own
 * inner `<tr>` rows, so a naive "up to the next `</tr>`" match stops at
 * that inner table's first row and truncates before the actual data
 * (price, mileage value, etc.) that follows it.
 */
function extractRows(html: string): string[] {
  const marker = '<td class="td_photo">';
  const starts: number[] = [];
  for (let i = html.indexOf(marker); i !== -1; i = html.indexOf(marker, i + 1)) starts.push(i);
  return starts.map((s, idx) => html.slice(s, idx + 1 < starts.length ? starts[idx + 1] : s + 6000));
}

/**
 * Scrapes one page (~25 listings) of Nikkyo's full stock list - no
 * make/model filter needed, unlike beforward/sbtjapan, since this site's
 * own pagination already walks the entire catalogue on one axis.
 */
export async function scrapeNikkyoPage(page: number): Promise<ScrapedVehicle[]> {
  const html = await fetchText(`https://www.nikkyocars.com/n2014/stock/?lang=en&page=${page}`);
  const rows = extractRows(html);
  const vehicles: ScrapedVehicle[] = [];
  for (const row of rows) {
    try {
      const v = parseRow(row);
      if (v) vehicles.push(v);
    } catch (err) {
      console.error("[nikkyo] failed to parse a row:", err);
    }
  }
  return vehicles;
}
