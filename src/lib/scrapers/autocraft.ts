import type { ScrapedVehicle } from "@/lib/scrapers/types";
import { withRetry } from "@/lib/scrapers/http";
import {
  guessBodyType,
  IMPORT_ELIGIBLE_FROM_YEAR,
  normalizeFuel,
  normalizeTransmission,
  parseNumber,
  splitModelTrim,
  titleCase,
} from "@/lib/scrapers/normalize";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const BASE = "https://www.autocraftjapan.com";

/**
 * Autocraft Japan's stock (about 140,000 cars) is browsed one model year at
 * a time: its /car-year/YYYY link sets a year filter in the visitor's
 * session, and /cars/search/p=N then pages through that filtered list. So
 * the scrape "groups" here are years, from the import cut-off to this year.
 */
export const AUTOCRAFT_YEARS: number[] = Array.from(
  { length: new Date().getFullYear() - IMPORT_ELIGIBLE_FROM_YEAR + 1 },
  (_, i) => new Date().getFullYear() - i
);

// Makes whose name is more than one word in the listing title.
const MULTI_WORD_MAKES = ["LAND ROVER", "MERCEDES BENZ", "ALFA ROMEO", "ROLLS ROYCE", "ASTON MARTIN", "MITSUBISHI FUSO", "UD TRUCKS"];
const MAKE_DISPLAY: Record<string, string> = { BMW: "BMW", "MERCEDES BENZ": "Mercedes-Benz", MINI: "Mini", "UD TRUCKS": "UD Trucks" };

export class AutocraftRateLimited extends Error {}

type Jar = Map<string, string>;

function storeCookies(jar: Jar, headers: Headers) {
  const h = headers as Headers & { getSetCookie?: () => string[] };
  const list = typeof h.getSetCookie === "function" ? h.getSetCookie() : (headers.get("set-cookie") ?? "").split(/,(?=[^;]+=[^;]+)/);
  for (const c of list) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

/** GET that follows redirects by hand so session cookies survive every hop. */
async function get(url: string, jar: Jar): Promise<string> {
  let current = url;
  for (let hop = 0; hop < 6; hop++) {
    const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetch(current, { headers: { "User-Agent": USER_AGENT, ...(cookie ? { Cookie: cookie } : {}) }, redirect: "manual" });
    storeCookies(jar, res.headers);
    if (res.status === 429 || res.status === 403 || res.status === 503) throw new AutocraftRateLimited(`Autocraft ${res.status} ${current}`);
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      current = new URL(loc, current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`Autocraft request failed: ${res.status} ${current}`);
    return res.text();
  }
  throw new Error(`Autocraft too many redirects ${url}`);
}

function clean(text: string): string {
  return text.replace(/&amp;/g, "&").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseItem(block: string): ScrapedVehicle | null {
  const href = block.match(/href="(https:\/\/www\.autocraftjapan\.com\/car\/[^"]+)"/)?.[1];
  const heading = clean(block.match(/<h2>([\s\S]*?)<\/h2>/)?.[1] ?? "");
  const stockId = block.match(/Stock ID:\s*([A-Z]+-\d+)/)?.[1];
  if (!href || !heading || !stockId) return null;

  const feats: Record<string, string> = {};
  for (const m of block.matchAll(/<div class="label">([^<]+)<\/div>\s*<div class="value[^"]*">([\s\S]*?)<\/div>/g)) {
    feats[clean(m[1])] = clean(m[2]);
  }
  // Left-hand-drive stock can't be registered in Kenya; "-" means not stated (JDM stock is RHD).
  if (feats["Drive"] === "LHD") return null;

  const fob = clean(block.match(/FOB Price:[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? "");
  const sourcePriceUsd = Math.round(parseNumber(fob));
  if (!sourcePriceUsd) return null; // "$ ASK"

  // Heading: "TOYOTA TOWNACE van 4WD 2020"
  const words = heading.split(" ").filter(Boolean);
  const yearWord = words[words.length - 1];
  const year = /^(19|20)\d{2}$/.test(yearWord) ? parseInt(yearWord, 10) : 0;
  if (!year || year < IMPORT_ELIGIBLE_FROM_YEAR) return null;
  const nameWords = words.slice(0, -1);
  const upperName = nameWords.join(" ").toUpperCase();
  const multi = MULTI_WORD_MAKES.find((m) => upperName.startsWith(m + " ") || upperName === m);
  const makeWordCount = multi ? multi.split(" ").length : 1;
  const makeKey = nameWords.slice(0, makeWordCount).join(" ").toUpperCase();
  const make = MAKE_DISPLAY[makeKey] ?? titleCase(makeKey);
  const { model, trim } = splitModelTrim(nameWords.slice(makeWordCount));

  // Photos come through Autocraft's own image proxy: the original host
  // refuses direct requests (403), while the proxy URL loads normally.
  const imageUrl = (block.match(/data-image-url="([^"]+)"/)?.[1] ?? block.match(/data-src="([^"]+)"/)?.[1] ?? "").replace(/&amp;/g, "&") || null;

  return {
    sourceSite: "autocraft",
    externalId: `autocraft:${stockId}`,
    sourceUrl: href,
    make,
    model,
    trim,
    year,
    mileageKm: Math.round(parseNumber(feats["Kms"] ?? "")),
    fuel: normalizeFuel(feats["Fuel"] || "Petrol"),
    transmission: normalizeTransmission(feats["Transmission"] || "AT"),
    engineCc: Math.round(parseNumber(feats["CC"] ?? "")),
    bodyType: guessBodyType(heading),
    drive: /4WD|AWD|4X4/i.test(heading) ? "4WD" : "2WD",
    seats: 5,
    color: feats["Color"] && feats["Color"] !== "-" ? titleCase(feats["Color"]) : "White",
    sourceCountry: "Japan",
    sourcePriceUsd,
    imageUrl,
    steering: "Right",
    chassisNo: feats["Chassis Number"] || undefined,
  };
}

/** One results page (20 cars) of one model year. */
export async function scrapeAutocraftPage(yearIndex: number, page: number): Promise<ScrapedVehicle[] | "rate-limited"> {
  const year = AUTOCRAFT_YEARS[yearIndex];
  if (!year) return [];
  let html: string;
  try {
    html = await withRetry(async () => {
      const jar: Jar = new Map();
      const first = await get(`${BASE}/car-year/${year}`, jar);
      return page <= 1 ? first : get(`${BASE}/cars/search/p=${page}`, jar);
    });
  } catch (err) {
    if (err instanceof AutocraftRateLimited) return "rate-limited";
    throw err;
  }
  // Guard against the session filter not sticking - a page for another year
  // would still be valid stock, but would repeat across every year group.
  if (!html.includes(`Year: ${year}~${year}`)) throw new Error(`Autocraft year filter ${year} not applied on page ${page}`);

  const vehicles: ScrapedVehicle[] = [];
  for (const block of html.split('<div class="item row"').slice(1)) {
    const v = parseItem(block.slice(0, 8000));
    if (v) vehicles.push(v);
  }
  return vehicles;
}
