import * as cheerio from "cheerio";
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
  { id: 313, make: "Kia" },
];

function urlFor(makeId: number, page: number): string {
  const base = `https://www.beforward.jp/stocklist/make=${makeId}`;
  return page <= 1 ? `${base}/sortkey=n` : `${base}/page=${page}/sortkey=n`;
}

function detailedSpecMap($: cheerio.CheerioAPI, row: ReturnType<typeof $>): Record<string, string> {
  const map: Record<string, string> = {};
  row.find("table.table-detailed-spec tr").each((_, tr) => {
    const cells = $(tr).children("th, td");
    for (let i = 0; i + 1 < cells.length; i += 2) {
      const label = $(cells[i]).text().trim();
      const value = $(cells[i + 1]).text().trim();
      if (label) map[label] = value;
    }
  });
  return map;
}

async function fetchPage(url: string): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`BE FORWARD request failed: ${res.status} ${url}`);
    return res.text();
  });
}

function parsePage(html: string, make: string): ScrapedVehicle[] {
  const $ = cheerio.load(html);
  const vehicles: ScrapedVehicle[] = [];

  $("tr.stocklist-row").each((_, el) => {
    const row = $(el);

    const refNo = row.find(".veh-stock-no span").first().text().replace(/Ref No\.?/i, "").trim();
    if (!refNo) return;

    const nameText = row.find(".make-model a").first().text().replace(/\s+/g, " ").trim();
    const yearMatch = nameText.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? parseInt(yearMatch[0], 10) : 0;
    const afterYear = yearMatch ? nameText.slice(nameText.indexOf(yearMatch[0]) + 4).trim() : nameText;
    // afterYear is roughly "TOYOTA REGIUSACE VAN LONG SUPER GL" — first word is
    // the make (already known from the search facet), rest splits model/trim.
    const words = afterYear.split(" ").filter(Boolean);
    const rest = words.slice(1); // drop the repeated make token
    const { model, trim } = splitModelTrim(rest);

    const mileageKm = Math.round(parseNumber(row.find(".basic-spec-col.mileage .val").first().text()));
    const engineCc = Math.round(parseNumber(row.find(".basic-spec-col.engine .val").first().text()));
    const transmission = normalizeTransmission(row.find(".basic-spec-col.trans .val").first().text().trim() || "AT");

    const priceText = row.find(".vehicle-price .price").first().text();
    const sourcePriceUsd = Math.round(parseNumber(priceText));

    const spec = detailedSpecMap($, row);
    const fuel = normalizeFuel(spec["Fuel"] || "Petrol");
    const drive = normalizeDrive(spec["Drive"] || "FWD");
    const color = spec["Color"] ? titleCase(spec["Color"]) : "White";
    const seats = parseInt(spec["Seats"] || "5", 10) || 5;

    let imageUrl = row.find("img").first().attr("src") || null;
    if (imageUrl?.startsWith("//")) imageUrl = "https:" + imageUrl;
    // The listing page requests a 200px thumbnail (?w=200); the "medium"
    // folder's native resolution is closer to 480px, so ask for that
    // instead — same file, no extra request, noticeably sharper.
    if (imageUrl) imageUrl = imageUrl.replace(/([?&])w=\d+/, "$1w=640");

    const detailHref = row.find(".veh-stock-no a").first().attr("href") || row.find(".make-model a").first().attr("href");
    const sourceUrl = detailHref ? new URL(detailHref, "https://www.beforward.jp").toString() : "https://www.beforward.jp";

    if (!year || !sourcePriceUsd) return; // incomplete listing — skip rather than store junk
    if (year < IMPORT_ELIGIBLE_FROM_YEAR) return; // older than Kenya's import threshold — not buyable, don't store it

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
  });

  return vehicles;
}

/**
 * Scrapes a bounded number of pages per configured make from beforward.jp's
 * public stocklist. No auth, no API — this is a plain HTML scrape, so it's
 * intentionally conservative (few pages, one request at a time) to be a
 * light, respectful visitor rather than a bulk crawler.
 */
export async function scrapeBeforward(pagesPerMake = 2): Promise<ScrapedVehicle[]> {
  const all: ScrapedVehicle[] = [];
  for (const { id, make } of BEFORWARD_MAKES) {
    for (let page = 1; page <= pagesPerMake; page++) {
      try {
        const html = await fetchPage(urlFor(id, page));
        const found = parsePage(html, make);
        all.push(...found);
        if (found.length === 0) break; // ran out of pages for this make
      } catch (err) {
        console.error(`[beforward] failed make=${make} page=${page}:`, err);
        break;
      }
    }
  }
  return all;
}
