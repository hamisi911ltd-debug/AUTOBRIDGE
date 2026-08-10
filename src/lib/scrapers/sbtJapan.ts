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
export const SBT_MAKES: { id: number; make: string }[] = [
  { id: 2, make: "Toyota" },
  { id: 3, make: "Nissan" },
  { id: 4, make: "Honda" },
  { id: 5, make: "Mazda" },
  { id: 6, make: "Mitsubishi" },
  { id: 7, make: "Subaru" },
  { id: 9, make: "Suzuki" },
  { id: 12, make: "Isuzu" },
  { id: 8, make: "Daihatsu" },
  { id: 69, make: "Hino" },
  { id: 13, make: "Lexus" },
  { id: 72, make: "Mercedes-Benz" },
  { id: 45, make: "BMW" },
  { id: 53, make: "Volkswagen" },
  { id: 44, make: "Audi" },
  { id: 41, make: "Peugeot" },
  { id: 21, make: "Ford" },
  { id: 67, make: "Volvo" },
  { id: 33, make: "Land Rover" },
  { id: 32, make: "Jaguar" },
  { id: 65, make: "Hyundai" },
  { id: 79, make: "Kia" },
];

function urlFor(makeId: number, page: number): string {
  return `https://www.sbtjapan.com/used-cars/search?make_id=${makeId}&page=${page}`;
}

function parseSetCookie(setCookie: string): string {
  return setCookie
    .split(/,(?=[^;]+=[^;]+)/) // split multiple Set-Cookie values, not the ; inside one
    .map((c) => c.split(";")[0].trim())
    .join("; ");
}

/**
 * sbtjapan.com issues a self-redirecting 302 on the first hit of a session
 * (it's setting a cookie). The cookie isn't tied to make/page, so one scrape
 * run establishes it once and reuses it for every subsequent request —
 * halves the outbound request count versus re-doing the redirect dance per
 * page, which matters for platforms (Cloudflare Pages Functions on the free
 * tier) that cap subrequests per invocation.
 */
async function establishSession(): Promise<string | null> {
  const res = await fetch(urlFor(SBT_MAKES[0].id, 1), {
    headers: { "User-Agent": USER_AGENT },
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  if (!(res.status >= 300 && res.status < 400) || !setCookie) return null;
  return parseSetCookie(setCookie);
}

async function fetchWithSession(url: string, cookie: string | null): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, ...(cookie ? { Cookie: cookie } : {}) },
      redirect: "manual",
    });

    // The session cookie can expire mid-run; if we get redirected again,
    // re-establish it once and retry this single request.
    if (res.status >= 300 && res.status < 400) {
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        const fresh = parseSetCookie(setCookie);
        const retry = await fetch(url, { headers: { "User-Agent": USER_AGENT, Cookie: fresh } });
        if (!retry.ok) throw new Error(`SBT Japan request failed: ${retry.status} ${url}`);
        return retry.text();
      }
    }

    if (!res.ok) throw new Error(`SBT Japan request failed: ${res.status} ${url}`);
    return res.text();
  });
}

/**
 * SBT Japan's own photos (img.sbtjapan.com/img/carphoto/...) are clean and
 * scale to 1200px+ on request. A chunk of listings instead point at
 * img.sbtjapan.com/dealercarphoto/... — third-party dealer-network photos
 * that carry another used-car platform's watermark baked into the image —
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

    const priceText = item.querySelector(".card-product__vehicle-price .card-product__price")?.text ?? "";
    const sourcePriceUsd = Math.round(parseNumber(priceText));

    let imageUrl = item.querySelector(".card-product__image img")?.getAttribute("src") || null;
    if (imageUrl?.startsWith("//")) imageUrl = "https:" + imageUrl;
    imageUrl = cleanSbtImage(imageUrl);

    const detailHref = item.querySelector(".card-product__wrap")?.getAttribute("href");
    const sourceUrl = detailHref
      ? new URL(detailHref, "https://www.sbtjapan.com").toString()
      : `https://www.sbtjapan.com/used-cars/${stockId}`;

    if (!year || !sourcePriceUsd) continue;
    if (year < IMPORT_ELIGIBLE_FROM_YEAR) continue; // older than Kenya's import threshold — not buyable, don't store it

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
      imageUrl,
    });
  }

  return vehicles;
}

/**
 * Scrapes a single page for a single configured make. Re-establishes the
 * session cookie on every call rather than sharing it across a whole run —
 * one extra request per unit, but it's I/O wait, not CPU, so it doesn't
 * threaten the per-request CPU budget the way parsing many pages in one
 * invocation would (see runScrapeUnit).
 */
export async function scrapeSbtJapanUnit(makeIndex: number, page: number): Promise<ScrapedVehicle[]> {
  const entry = SBT_MAKES[makeIndex];
  if (!entry) return [];
  try {
    const cookie = await establishSession();
    const html = await fetchWithSession(urlFor(entry.id, page), cookie);
    return parsePage(html, entry.make);
    // Deliberately not upgrading via fetchCoverImage here, unlike beforward:
    // SBT's listing thumbnail already reliably serves a real ?imwidth=1200
    // photo (unlike beforward's ?w= param, which some listings silently
    // ignore), and this site's units are already hitting Workers' CPU limit
    // on a meaningful fraction of runs — adding another fetch+parse per
    // vehicle here would only make that worse for no real quality gain.
  } catch (err) {
    console.error(`[sbtjapan] failed make=${entry.make} page=${page}:`, err);
    return [];
  }
}
