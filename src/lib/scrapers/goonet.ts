import type { ScrapedVehicle } from "@/lib/scrapers/types";
import { withRetry } from "@/lib/scrapers/http";
import { guessBodyType, IMPORT_ELIGIBLE_FROM_YEAR, normalizeTransmission, parseNumber, titleCase } from "@/lib/scrapers/normalize";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const BASE = "https://www.goo-net-exchange.com";

/**
 * Goo-net Exchange is the export front-end of Goo-net, Japan's largest
 * used-car portal - roughly 290,000 dealer-stock cars across these makes
 * (counts checked live). Slugs are the site's own URL segments.
 */
export const GOONET_MAKES: { slug: string; make: string }[] = [
  { slug: "TOYOTA", make: "Toyota" },
  { slug: "NISSAN", make: "Nissan" },
  { slug: "HONDA", make: "Honda" },
  { slug: "MAZDA", make: "Mazda" },
  { slug: "MITSUBISHI", make: "Mitsubishi" },
  { slug: "SUBARU", make: "Subaru" },
  { slug: "SUZUKI", make: "Suzuki" },
  { slug: "DAIHATSU", make: "Daihatsu" },
  { slug: "ISUZU", make: "Isuzu" },
  { slug: "LEXUS", make: "Lexus" },
  { slug: "HINO", make: "Hino" },
  { slug: "MITSUBISHI_FUSO", make: "Mitsubishi Fuso" },
  { slug: "MERCEDES_BENZ", make: "Mercedes-Benz" },
  { slug: "BMW", make: "BMW" },
  { slug: "VOLKSWAGEN", make: "Volkswagen" },
  { slug: "AUDI", make: "Audi" },
  { slug: "LAND_ROVER", make: "Land Rover" },
  { slug: "VOLVO", make: "Volvo" },
  { slug: "PEUGEOT", make: "Peugeot" },
  { slug: "PORSCHE", make: "Porsche" },
  { slug: "MINI", make: "Mini" },
  { slug: "JAGUAR", make: "Jaguar" },
  { slug: "FORD", make: "Ford" },
  // High-end makes, added at the owner's explicit request.
  { slug: "BENTLEY", make: "Bentley" },
  { slug: "ROLLS-ROYCE", make: "Rolls-Royce" },
  { slug: "MASERATI", make: "Maserati" },
  { slug: "FERRARI", make: "Ferrari" },
  { slug: "LAMBORGHINI", make: "Lamborghini" },
  { slug: "ASTON_MARTIN", make: "Aston Martin" },
  { slug: "MCLAREN", make: "McLaren" },
];

export class GoonetRateLimited extends Error {}

async function fetchText(url: string): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.status === 429 || res.status === 403 || res.status === 503) throw new GoonetRateLimited(`Goo-net ${res.status} ${url}`);
    if (!res.ok) throw new Error(`Goo-net request failed: ${res.status} ${url}`);
    return res.text();
  });
}

function decode(text: string): string {
  return text.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}

function parseListing(block: string, href: string, make: string): ScrapedVehicle | null {
  // href: /usedcars/TOYOTA/LAND_CRUISER_PRADO/975026092200303276001/
  const parts = href.split("/").filter(Boolean);
  const modelSlug = parts[2] ?? "";
  const id = parts[3] ?? "";
  if (!id || !modelSlug) return null;

  const details = [...block.matchAll(/<li>\s*([^<]*?)\s*<\/li>/g)].map((m) => decode(m[1]));
  // Always six cells, in this order: year.month, colour, mileage, cc, steering, transmission.
  const [yearMonth = "", colorRaw = "", mileageRaw = "", ccRaw = "", steering = "", transRaw = ""] = details;
  const year = parseInt(yearMonth.slice(0, 4), 10);
  if (!year || year < IMPORT_ELIGIBLE_FROM_YEAR) return null;
  // Kenya drives on the left, so only right-hand-drive stock is importable.
  if (steering && !/right/i.test(steering)) return null;

  const priceJson = block.match(/name="currency-price" value='([^']+)'/)?.[1];
  let sourcePriceUsd = 0;
  if (priceJson) {
    try {
      sourcePriceUsd = Math.round(parseNumber(JSON.parse(priceJson).USD ?? ""));
    } catch {
      // malformed price blob - treated as no price below
    }
  }
  if (!sourcePriceUsd) return null; // "ASK" listings - nothing to show a buyer

  const title = decode(block.match(/class="title">([^<]*)</)?.[1] ?? "");
  const model = titleCase(modelSlug.replace(/_/g, " "));
  // Title is "TOYOTA LAND CRUISER PRADO TX" - whatever follows make + model is the grade.
  const titleWords = title.split(" ").filter(Boolean);
  const skip = make.replace("-", " ").split(" ").length + model.split(" ").length;
  const trim = titleCase(titleWords.slice(skip).join(" ")) || "Standard";

  const upper = title.toUpperCase();
  const fuel = /HYBRID|\bHV\b|E-POWER/.test(upper) ? "Hybrid" : /\bEV\b|ELECTRIC/.test(upper) ? "Electric" : /DIESEL/.test(upper) ? "Diesel" : "Petrol";
  const drive = /4WD|AWD|4X4/.test(upper) ? "4WD" : "2WD";

  const imageUrl = block.match(/data-src="(https:\/\/picture\d*\.goo-net\.com\/[^"]+\.jpe?g)"/i)?.[1] ?? null;

  return {
    sourceSite: "goonet",
    externalId: `goonet:${id}`,
    sourceUrl: `${BASE}${href}`,
    make,
    model,
    trim,
    year,
    mileageKm: Math.round(parseNumber(mileageRaw)),
    fuel,
    transmission: normalizeTransmission(transRaw || "AT"),
    engineCc: Math.round(parseNumber(ccRaw)),
    bodyType: guessBodyType(title),
    drive,
    seats: 5,
    color: colorRaw ? titleCase(colorRaw) : "White",
    sourceCountry: "Japan",
    sourcePriceUsd,
    imageUrl,
    steering: "Right",
    registrationYearMonth: yearMonth.replace(".", "/"),
  };
}

/**
 * One results page (20 cars) of one make, newest first. Goo-net ignores
 * year filters in the URL, so pre-2019 cars are dropped here instead - its
 * newest-first pages are mostly recent stock, so little is wasted.
 * Everything needed is on the list page itself: no per-car detail fetch.
 */
export async function scrapeGoonetPage(makeIndex: number, page: number): Promise<ScrapedVehicle[] | "rate-limited"> {
  const entry = GOONET_MAKES[makeIndex];
  if (!entry) return [];
  let html: string;
  try {
    html = await fetchText(`${BASE}/usedcars/${entry.slug}/index-${Math.max(1, page)}.html`);
  } catch (err) {
    if (err instanceof GoonetRateLimited) return "rate-limited";
    throw err;
  }

  const listStart = html.indexOf('class="list-listview"');
  if (listStart === -1) return [];
  const vehicles: ScrapedVehicle[] = [];
  const re = /<a class="spread_link_new_tab" href="(\/usedcars\/[^"]+)">([\s\S]*?)<\/a>\s*<\/li>/g;
  re.lastIndex = listStart;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const v = parseListing(m[2], m[1], entry.make);
    if (v) vehicles.push(v);
  }
  return vehicles;
}
