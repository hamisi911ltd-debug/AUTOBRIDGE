import * as cheerio from "cheerio";
import type { ScrapedVehicle } from "@/lib/scrapers/types";
import { withRetry } from "@/lib/scrapers/http";
import {
  guessBodyType,
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

function parsePage(html: string, make: string): ScrapedVehicle[] {
  const $ = cheerio.load(html);
  const vehicles: ScrapedVehicle[] = [];

  $("li.search-result__item").each((_, el) => {
    const item = $(el);

    const stockId = item.find(".card-product__stock-value").first().text().trim();
    if (!stockId) return;

    const heading = item.find("h2.card-product__product").first().text().replace(/\s+/g, " ").trim();
    const [yearPart, ...rest] = heading.split(" ");
    const year = parseInt((yearPart || "").split("/")[0], 10) || 0;
    const words = rest.filter(Boolean);
    const modelWords = words.slice(1); // drop the repeated make token
    const { model, trim } = splitModelTrim(modelWords);

    const status = (cls: string) =>
      item.find(`.card-product__status.-${cls}`).first().text().trim();

    const mileageKm = Math.round(parseNumber(status("mileage")));
    const engineCc = Math.round(parseNumber(status("engine-capacity")));
    const transmission = normalizeTransmission(status("transmission") || "AT");
    const drive = normalizeDrive(status("drive-type") || "FWD");
    const fuel = normalizeFuel(status("fuel-type") || "Petrol");
    const colorRaw = status("body-color");
    const color = colorRaw && colorRaw !== "-" ? titleCase(colorRaw) : "White";
    const seatsRaw = status("seats");
    const seats = seatsRaw && seatsRaw !== "-" ? parseInt(seatsRaw, 10) || 5 : 5;

    const priceText = item.find(".card-product__vehicle-price .card-product__price").first().text();
    const sourcePriceUsd = Math.round(parseNumber(priceText));

    let imageUrl = item.find(".card-product__image img").first().attr("src") || null;
    if (imageUrl?.startsWith("//")) imageUrl = "https:" + imageUrl;
    // The listing page requests a 300px thumbnail; the CDN happily serves
    // full detail-page resolution off the same file via imwidth.
    if (imageUrl) imageUrl = imageUrl.replace(/imwidth=\d+/, "imwidth=1200");

    const detailHref = item.find(".card-product__wrap").first().attr("href");
    const sourceUrl = detailHref
      ? new URL(detailHref, "https://www.sbtjapan.com").toString()
      : `https://www.sbtjapan.com/used-cars/${stockId}`;

    if (!year || !sourcePriceUsd) return;

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
  });

  return vehicles;
}

export async function scrapeSbtJapan(pagesPerMake = 2): Promise<ScrapedVehicle[]> {
  const cookie = await establishSession();
  const all: ScrapedVehicle[] = [];
  for (const { id, make } of SBT_MAKES) {
    for (let page = 1; page <= pagesPerMake; page++) {
      try {
        const html = await fetchWithSession(urlFor(id, page), cookie);
        const found = parsePage(html, make);
        all.push(...found);
        if (found.length === 0) break;
      } catch (err) {
        console.error(`[sbtjapan] failed make=${make} page=${page}:`, err);
        break;
      }
    }
  }
  return all;
}
