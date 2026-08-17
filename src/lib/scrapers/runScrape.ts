import { prisma } from "@/lib/prisma";
import { BEFORWARD_MAKES, scrapeBeforwardUnit } from "@/lib/scrapers/beforward";
import { SBT_MAKES, scrapeSbtJapanUnit } from "@/lib/scrapers/sbtJapan";
import { DUBICARS_MAKES, scrapeDubicarsUnit } from "@/lib/scrapers/dubicars";
import { computeEligibility, deriveLifestyle } from "@/lib/scrapers/normalize";
import { measureImageWidthPx } from "@/lib/scrapers/coverImage";
import type { ScrapedVehicle } from "@/lib/scrapers/types";

export type ScrapeSite = "beforward" | "sbtjapan" | "dubicars";

/** How many configured makes exist per site — lets orchestrators (the cron-worker, the admin panel) enumerate every (site, makeIndex) unit without duplicating the make lists. For dubicars, "make" is really a page number (see dubicars.ts). */
export const SCRAPE_MAKE_COUNTS: Record<ScrapeSite, number> = {
  beforward: BEFORWARD_MAKES.length,
  sbtjapan: SBT_MAKES.length,
  dubicars: DUBICARS_MAKES.length,
};

export type UnitScrapeSummary = {
  site: ScrapeSite;
  make: string | null;
  found: number;
  created: number;
  updated: number;
  errors: number;
};

async function upsertVehicle(v: ScrapedVehicle): Promise<"created" | "updated"> {
  const { eligible, ineligibleReason } = computeEligibility(v.year);
  const lifestyle = deriveLifestyle(v.bodyType, v.fuel, v.sourcePriceUsd);
  // beforward.ts already measures the width of any detail-page photo it
  // upgrades to (see fetchCoverImage) — only fall back to measuring here
  // when that didn't happen (sbtjapan's listing thumbnail, or an upgrade
  // that failed and left the original listing-page thumbnail in place).
  const imageWidthPx = v.imageWidthPx ?? (await measureImageWidthPx(v.imageUrl));

  const data = {
    make: v.make,
    model: v.model,
    trim: v.trim,
    year: v.year,
    mileageKm: v.mileageKm,
    fuel: v.fuel,
    transmission: v.transmission,
    engineCc: v.engineCc,
    bodyType: v.bodyType,
    drive: v.drive,
    seats: v.seats,
    color: v.color,
    sourceCountry: v.sourceCountry,
    sourcePriceUsd: v.sourcePriceUsd,
    freightIncluded: v.freightIncluded ?? false,
    imageUrl: v.imageUrl,
    imageWidthPx,
    condition: "Foreign Used",
    lifestyle: JSON.stringify(lifestyle),
    eligible,
    ineligibleReason,
    sourceSite: v.sourceSite,
    externalId: v.externalId,
    sourceUrl: v.sourceUrl,
    lastScrapedAt: new Date(),
  };

  const existing = await prisma.vehicle.findUnique({ where: { externalId: v.externalId } });
  await prisma.vehicle.upsert({
    where: { externalId: v.externalId },
    create: data,
    update: data,
  });
  return existing ? "updated" : "created";
}

/**
 * Nightly inventory sync, one (site, make, page) unit at a time: scrapes a
 * single listing page and upserts its vehicles into the Vehicle table, keyed
 * by externalId so re-running never creates duplicates — only new listings
 * get created, previously-seen ones get their price/mileage/etc refreshed in
 * place. Hand-entered admin vehicles (externalId = null) are never touched.
 *
 * Deliberately scoped to one unit per call rather than looping over every
 * make internally: Cloudflare Workers' free-tier CPU budget is 10ms per
 * request, and parsing dozens of pages in a single invocation blew well past
 * that (confirmed live via "Worker exceeded CPU time limit"). Callers —
 * the cron-worker nightly, the admin "Run scrape now" button — loop over
 * every (site, makeIndex) pair themselves via SCRAPE_MAKE_COUNTS, so each
 * individual call's parsing work stays small.
 */
export async function runScrapeUnit(site: ScrapeSite, makeIndex: number, page = 1): Promise<UnitScrapeSummary> {
  const makes = site === "beforward" ? BEFORWARD_MAKES : site === "sbtjapan" ? SBT_MAKES : DUBICARS_MAKES;
  const entry = makes[makeIndex];
  if (!entry) {
    return { site, make: null, found: 0, created: 0, updated: 0, errors: 0 };
  }

  let vehicles: ScrapedVehicle[];
  try {
    const result =
      site === "beforward"
        ? await scrapeBeforwardUnit(makeIndex, page)
        : site === "sbtjapan"
          ? await scrapeSbtJapanUnit(makeIndex, page)
          : await scrapeDubicarsUnit(makeIndex);
    // A single nightly unit isn't worth a cooldown-and-retry loop — treat a
    // rate-limited page the same as "nothing found this run", same as any
    // other transient failure; the next scheduled run picks it up again.
    vehicles = result === "rate-limited" ? [] : result;
  } catch (err) {
    console.error(`[runScrapeUnit] ${site} make=${entry.make} page=${page} failed entirely:`, err);
    return { site, make: entry.make, found: 0, created: 0, updated: 0, errors: 1 };
  }

  let created = 0;
  let updated = 0;
  let errors = 0;
  for (const v of vehicles) {
    try {
      const result = await upsertVehicle(v);
      if (result === "created") created++;
      else updated++;
    } catch (err) {
      errors++;
      console.error(`[runScrapeUnit] failed to upsert ${v.externalId}:`, err);
    }
  }

  return { site, make: entry.make, found: vehicles.length, created, updated, errors };
}
