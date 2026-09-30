import type { ScrapedVehicle } from "@/lib/scrapers/types";
import { withRetry } from "@/lib/scrapers/http";
import { guessBodyType, IMPORT_ELIGIBLE_FROM_YEAR, normalizeTransmission, parseNumber, titleCase } from "@/lib/scrapers/normalize";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const BASE = "https://delights.jp";

/**
 * DELIGHTS (Kobe) exports mainly to Kenya and prices every car as C&F
 * Mombasa. Small stock - a few pages of 40 - so the list page gives the
 * candidates and each car's detail page gives its price.
 */
async function fetchText(url: string): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`Delights request failed: ${res.status} ${url}`);
    return res.text();
  });
}

/** Detail-page URLs of the unsold, 2019-or-newer cars on one list page. */
export async function listDelightsPage(page: number): Promise<string[]> {
  const html = await fetchText(`${BASE}/www/stocks/?p=${Math.max(1, page)}`);
  const urls: string[] = [];
  for (const block of html.split('<div class="item">').slice(1)) {
    const href = block.match(/href="(\/www\/stocks\/detail\/[^"]+)"/)?.[1];
    if (!href || block.includes("img_Sold")) continue;
    const year = parseInt(block.match(/<p class="year">\s*(\d{4})/)?.[1] ?? "", 10);
    if (!year || year < IMPORT_ELIGIBLE_FROM_YEAR) continue;
    urls.push(new URL(href, BASE).toString());
  }
  return urls;
}

export async function fetchDelightsVehicle(url: string): Promise<ScrapedVehicle | null> {
  const html = await fetchText(url);
  const desc = (html.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? "").replace(/&amp;/g, "&");
  // "DAIHATSU HIJET TRUCK STANDARD (2019/9, 201,610 km, 5MT, White, 660cc). US$ 4,200 C&F Mombasa. ..."
  const m = desc.match(/^(.+?) \((\d{4})\/?(\d{0,2}), ([\d,]+) km, ([^,]+), ([^,]+), ([\d,]+)cc\)\. US\$ ([\d,]+) C&F Mombasa/);
  if (!m) return null; // sold, price hidden, or layout changed
  const [, name, yearStr, month, km, shift, colour, cc, price] = m;
  const year = parseInt(yearStr, 10);
  if (year < IMPORT_ELIGIBLE_FROM_YEAR) return null;

  // URL: /www/stocks/detail/Daihatsu/Hijet_Truck/50889
  const [makeSlug = "", modelSlug = "", stockId = ""] = new URL(url).pathname.split("/").slice(-3);
  const make = makeSlug === "Mercedes_Benz" ? "Mercedes-Benz" : titleCase(makeSlug.replace(/_/g, " "));
  const model = titleCase(modelSlug.replace(/_/g, " "));
  const nameWords = name.split(" ").filter(Boolean);
  const grade = nameWords.slice(make.split(/[ -]/).length + model.split(" ").length).join(" ");
  const trim = grade ? titleCase(grade) : "Standard";

  const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const driveRaw = text.match(/\bDrive\s+(\S+)/)?.[1] ?? "";
  const upper = name.toUpperCase();
  // DELIGHTS' own detail page carries a real photo gallery (often 8-10+
  // shots) beyond the single og:image meta tag every listing was reduced
  // to before - free to collect from this same already-fetched page.
  const galleryUrls = [...new Set([...html.matchAll(/https:\/\/cdn\.delights\.jp\/img\/stock\/[^\s"'<>]+\.jpe?g/gi)].map((m) => m[0]))].slice(0, 5);

  return {
    sourceSite: "delights",
    externalId: `delights:${stockId}`,
    sourceUrl: url,
    make,
    model,
    trim,
    year,
    mileageKm: Math.round(parseNumber(km)),
    fuel: /HYBRID|E-POWER/.test(upper) ? "Hybrid" : /DIESEL/.test(upper) ? "Diesel" : "Petrol",
    transmission: normalizeTransmission(shift),
    engineCc: Math.round(parseNumber(cc)),
    bodyType: guessBodyType(name),
    drive: /4WD|AWD/i.test(driveRaw) || /4WD/.test(upper) ? "4WD" : "2WD",
    seats: 5,
    color: titleCase(colour),
    sourceCountry: "Japan",
    // C&F Mombasa already includes freight, so landed-cost maths mustn't add it again.
    sourcePriceUsd: Math.round(parseNumber(price)),
    freightIncluded: true,
    imageUrl: html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? null,
    imageUrls: galleryUrls.length > 0 ? galleryUrls : undefined,
    steering: "Right",
    registrationYearMonth: month ? `${yearStr}/${month}` : undefined,
  };
}
