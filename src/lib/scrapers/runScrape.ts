import { prisma } from "@/lib/prisma";
import { BEFORWARD_MAKES, scrapeBeforwardUnit } from "@/lib/scrapers/beforward";
import { SBT_MAKES, scrapeSbtJapanUnit } from "@/lib/scrapers/sbtJapan";
import { DUBICARS_MAKES, scrapeDubicarsUnit } from "@/lib/scrapers/dubicars";
import { computeEligibility, deriveLifestyle } from "@/lib/scrapers/normalize";
import { measureImageWidthPx } from "@/lib/scrapers/coverImage";
import type { ScrapedVehicle } from "@/lib/scrapers/types";

export type ScrapeSite = "beforward" | "sbtjapan" | "dubicars";

/**
 * How many configured makes exist per site - lets orchestrators (the
 * cron-worker, the admin panel) enumerate every (site, makeIndex) unit
 * without duplicating the make lists. For dubicars, "make" is really a page
 * number (see dubicars.ts).
 *
 * sbtjapan pinned to 0 on purpose - BE FORWARD-only inventory was explicitly
 * requested (all 15,202 existing SBT Japan vehicles were deleted at the same
 * time), so this zeroes out every orchestrator's unit list for that site
 * without deleting scrapeSbtJapanUnit/SBT_MAKES themselves, in case it's
 * ever turned back on.
 */
export const SCRAPE_MAKE_COUNTS: Record<ScrapeSite, number> = {
  beforward: BEFORWARD_MAKES.length,
  sbtjapan: 0,
  dubicars: DUBICARS_MAKES.length,
};

export type UnitScrapeSummary = {
  site: ScrapeSite;
  make: string | null;
  found: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
};

// Same bar getPublicVehicles.ts used to require before swapping in a
// same-model stand-in photo - now that stand-ins are gone entirely, a photo
// this small (or missing) is never worth showing at all, so it's rejected
// right at scrape time instead of having to be pruned from the catalogue
// afterward.
const MIN_SHARP_WIDTH_PX = 500;

async function upsertVehicle(v: ScrapedVehicle, refreshOnly: boolean): Promise<"created" | "updated" | "skipped"> {
  // A price/accuracy refresh pass wants every existing row touched up, not
  // the catalogue quietly growing while it runs - checked first, before any
  // of the more expensive work below (the detail-page fetch this vehicle's
  // width measurement depends on), so a genuinely new listing costs nothing
  // extra when refreshOnly is on.
  if (refreshOnly) {
    const existing = await prisma.vehicle.findUnique({ where: { externalId: v.externalId }, select: { id: true } });
    if (!existing) return "skipped";
  }

  // beforward.ts already measures the width of any detail-page photo it
  // upgrades to (see fetchCoverImage) - only fall back to measuring here
  // when that didn't happen (sbtjapan's listing thumbnail, or an upgrade
  // that failed and left the original listing-page thumbnail in place).
  const imageWidthPx = v.imageWidthPx ?? (await measureImageWidthPx(v.imageUrl));

  if (!v.imageUrl || (imageWidthPx ?? 0) < MIN_SHARP_WIDTH_PX) {
    // A vehicle with no real photo, or one too small to look sharp on a
    // normal card, never gets written at all - no stand-in photo exists to
    // patch it over with any more, so it would only ever show the branded
    // placeholder. Better to just not list it.
    return "skipped";
  }

  const { eligible, ineligibleReason } = computeEligibility(v.year);
  const lifestyle = deriveLifestyle(v.bodyType, v.fuel, v.sourcePriceUsd);

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
    refNo: v.refNo,
    chassisNo: v.chassisNo,
    modelCode: v.modelCode,
    engineCode: v.engineCode,
    steering: v.steering,
    location: v.location,
    versionClass: v.versionClass,
    doors: v.doors,
    dimensions: v.dimensions,
    weightKg: v.weightKg,
    registrationYearMonth: v.registrationYearMonth,
    manufactureYearMonth: v.manufactureYearMonth,
    features: v.features ? JSON.stringify(v.features) : null,
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
 * by externalId so re-running never creates duplicates - only new listings
 * get created, previously-seen ones get their price/mileage/etc refreshed in
 * place. Hand-entered admin vehicles (externalId = null) are never touched.
 *
 * Deliberately scoped to one unit per call rather than looping over every
 * make internally: Cloudflare Workers' free-tier CPU budget is 10ms per
 * request, and parsing dozens of pages in a single invocation blew well past
 * that (confirmed live via "Worker exceeded CPU time limit"). Callers -
 * the cron-worker nightly, the admin "Run scrape now" button - loop over
 * every (site, makeIndex) pair themselves via SCRAPE_MAKE_COUNTS, so each
 * individual call's parsing work stays small.
 */
export async function runScrapeUnit(site: ScrapeSite, makeIndex: number, page = 1, refreshOnly = false): Promise<UnitScrapeSummary> {
  const makes = site === "beforward" ? BEFORWARD_MAKES : site === "sbtjapan" ? SBT_MAKES : DUBICARS_MAKES;
  const entry = makes[makeIndex];
  if (!entry) {
    return { site, make: null, found: 0, created: 0, updated: 0, skipped: 0, errors: 0 };
  }

  let vehicles: ScrapedVehicle[];
  try {
    const result =
      site === "beforward"
        ? await scrapeBeforwardUnit(makeIndex, page)
        : site === "sbtjapan"
          ? await scrapeSbtJapanUnit(makeIndex, page)
          : await scrapeDubicarsUnit(makeIndex);
    // A single nightly unit isn't worth a cooldown-and-retry loop - treat a
    // rate-limited page the same as "nothing found this run", same as any
    // other transient failure; the next scheduled run picks it up again.
    vehicles = result === "rate-limited" ? [] : result;
  } catch (err) {
    console.error(`[runScrapeUnit] ${site} make=${entry.make} page=${page} failed entirely:`, err);
    return { site, make: entry.make, found: 0, created: 0, updated: 0, skipped: 0, errors: 1 };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  for (const v of vehicles) {
    try {
      const result = await upsertVehicle(v, refreshOnly);
      if (result === "created") created++;
      else if (result === "updated") updated++;
      else skipped++;
    } catch (err) {
      errors++;
      console.error(`[runScrapeUnit] failed to upsert ${v.externalId}:`, err);
    }
  }

  return { site, make: entry.make, found: vehicles.length, created, updated, skipped, errors };
}
