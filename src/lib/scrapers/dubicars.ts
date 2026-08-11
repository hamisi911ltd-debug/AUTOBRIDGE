import type { ScrapedVehicle } from "@/lib/scrapers/types";
import { withRetry } from "@/lib/scrapers/http";
import { IMPORT_ELIGIBLE_FROM_YEAR, normalizeFuel, normalizeTransmission, titleCase } from "@/lib/scrapers/normalize";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Dubicars' "export cars" category lists every make together on one
// page=N sequence (no per-make URL, unlike beforward/sbtjapan) — 331 pages
// / ~15,000 listings as of the last check. Rather than add a second
// orchestration shape alongside the site+makeIndex+page model the
// cron-worker and admin panel already loop over, PAGE_COUNT vehicles worth
// of pages are exposed as "makes" here: makeIndex N simply means page N+1.
// Kept modest deliberately — the site occasionally serves a Cloudflare bot
// challenge instead of the real page, so wide, slow coverage beats trying
// to grab everything in one run.
export const DUBICARS_PAGE_COUNT = 150;
export const DUBICARS_MAKES: { id: number; make: string }[] = Array.from({ length: DUBICARS_PAGE_COUNT }, (_, i) => ({
  id: i + 1,
  make: `page-${i + 1}`,
}));

async function fetchText(url: string): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`Dubicars request failed: ${res.status} ${url}`);
    return res.text();
  });
}

function isBotChallenge(html: string): boolean {
  return html.includes("Just a moment") || html.includes("challenges.cloudflare.com");
}

function extractCarJsonLd(html: string): Record<string, unknown> | null {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1]);
      const graph = Array.isArray(data["@graph"]) ? data["@graph"] : [data];
      const car = graph.find((g: Record<string, unknown>) => typeof g["@id"] === "string" && (g["@id"] as string).includes("#car"));
      if (car) return car;
    } catch {
      // malformed block — try the next one
    }
  }
  return null;
}

function slugFromId(id: unknown, pattern: RegExp): string | null {
  if (typeof id !== "string") return null;
  const match = id.match(pattern);
  return match ? match[1] : null;
}

const DRIVE_MAP: Record<string, string> = {
  FourWheelDriveConfiguration: "4WD",
  AllWheelDriveConfiguration: "AWD",
  RearWheelDriveConfiguration: "RWD",
  FrontWheelDriveConfiguration: "FWD",
};

const BODY_TYPE_MAP: Record<string, string> = {
  "SUV/Crossover": "SUV",
  SUV: "SUV",
  Sedan: "Sedan",
  Hatchback: "Hatchback",
  "Pick Up Truck": "Pickup",
  Pickup: "Pickup",
  Truck: "Truck",
  Van: "Van",
  Minivan: "Van",
  Wagon: "Wagon",
  "Station Wagon": "Wagon",
  Coupe: "Sedan",
  Convertible: "Sedan",
};

const AED_TO_USD = 1 / 3.6725;

function parseVehicleFromDetail(html: string, detailUrl: string): ScrapedVehicle | null {
  const car = extractCarJsonLd(html);
  if (!car) return null;

  // Kenya drives on the left, so only right-hand-drive stock is buyable —
  // Dubicars is one of the few sources that states this directly rather
  // than needing it inferred.
  if (car.steeringPosition !== "https://schema.org/RightHandDriving") return null;

  const year = parseInt(String(car.vehicleModelDate ?? ""), 10);
  if (!year || year < IMPORT_ELIGIBLE_FROM_YEAR) return null;

  const offers = car.offers as { price?: string; priceCurrency?: string } | undefined;
  const rawPrice = parseFloat(offers?.price ?? "0");
  if (!rawPrice) return null; // "price on request" listings — nothing to show
  const sourcePriceUsd = Math.round(offers?.priceCurrency === "AED" ? rawPrice * AED_TO_USD : rawPrice);
  if (!sourcePriceUsd) return null;

  const brand = car.brand as { "@id"?: string } | undefined;
  const model = car.model as { "@id"?: string } | undefined;
  const makeSlug = slugFromId(brand?.["@id"], /new-cars\/([a-z0-9-]+)#brand/);
  const modelSlug = slugFromId(model?.["@id"], /new-cars\/[a-z0-9-]+\/([a-z0-9-]+)#model/);
  if (!makeSlug || !modelSlug) return null;

  const make = titleCase(makeSlug.replace(/-/g, " "));
  const modelName = titleCase(modelSlug.replace(/-/g, " "));

  // Dubicars' "name" field is the full listing title (e.g. "Toyota Hilux
  // ADVENTURE", occasionally prefixed "New ...") — strip the make/model
  // words already captured above and keep whatever's left as the trim.
  const nameWords = String(car.name ?? "")
    .replace(/^New\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  const makeModelWordCount = make.split(" ").length + modelName.split(" ").length;
  const trim = nameWords.slice(makeModelWordCount).join(" ") || "Standard";

  const mileage = car.mileageFromOdometer as { value?: string | number } | undefined;
  const mileageKm = Math.round(parseFloat(String(mileage?.value ?? "0")));

  const idMatch = detailUrl.match(/-(\d+)\.html$/);
  const externalId = idMatch ? idMatch[1] : detailUrl;

  const bodyType = BODY_TYPE_MAP[String(car.bodyType ?? "")] ?? "Sedan";
  const driveRaw = typeof car.driveWheelConfiguration === "string" ? car.driveWheelConfiguration.split("/").pop() ?? "" : "";

  return {
    sourceSite: "dubicars",
    externalId: `dubicars:${externalId}`,
    sourceUrl: detailUrl,
    make,
    model: modelName,
    trim,
    year,
    mileageKm,
    fuel: normalizeFuel(String(car.fuelType ?? "Petrol")),
    transmission: normalizeTransmission(String(car.vehicleTransmission ?? "Automatic")),
    engineCc: 0, // not exposed by Dubicars' structured data
    bodyType,
    drive: DRIVE_MAP[driveRaw] ?? "FWD",
    seats: parseInt(String(car.seatingCapacity ?? "5"), 10) || 5,
    color: car.color ? titleCase(String(car.color)) : "White",
    sourceCountry: "UAE",
    sourcePriceUsd,
    imageUrl: typeof car.image === "string" ? car.image : null,
  };
}

function extractDetailUrls(listHtml: string): string[] {
  const blocks = [...listHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1]);
      const graph = Array.isArray(data["@graph"]) ? data["@graph"] : [];
      const itemList = graph.find((g: Record<string, unknown>) => g["@type"] === "ItemList");
      if (itemList && Array.isArray(itemList.itemListElement)) {
        return itemList.itemListElement
          .map((li: Record<string, unknown>) => (li.item as Record<string, unknown> | undefined)?.url)
          .filter((u: unknown): u is string => typeof u === "string");
      }
    } catch {
      // try next block
    }
  }
  return [];
}

/**
 * Scrapes one page (~30 listings) of Dubicars' UAE export-cars category:
 * fetches the search-results page for its list of detail-page URLs (the
 * visible card grid itself is client-rendered, but this JSON-LD block is
 * server-rendered), then fetches each detail page — which *is* fully
 * server-rendered with a schema.org Car/Product block carrying price,
 * specs and a real photo — one at a time.
 */
export async function scrapeDubicarsUnit(makeIndex: number): Promise<ScrapedVehicle[]> {
  const entry = DUBICARS_MAKES[makeIndex];
  if (!entry) return [];
  const page = entry.id;

  let listHtml: string;
  try {
    listHtml = await fetchText(`https://www.dubicars.com/uae/used/export-cars?page=${page}`);
  } catch (err) {
    console.error(`[dubicars] failed to fetch page=${page}:`, err);
    return [];
  }

  if (isBotChallenge(listHtml)) {
    console.error(`[dubicars] bot challenge on list page=${page}, skipping this run`);
    return [];
  }

  const detailUrls = extractDetailUrls(listHtml);
  const vehicles: ScrapedVehicle[] = [];

  for (const url of detailUrls) {
    try {
      const html = await fetchText(url);
      if (isBotChallenge(html)) continue; // transient — the local backfill sweep re-tries these later
      const vehicle = parseVehicleFromDetail(html, url);
      if (vehicle) vehicles.push(vehicle);
    } catch (err) {
      console.error(`[dubicars] failed detail fetch ${url}:`, err);
    }
  }

  return vehicles;
}
