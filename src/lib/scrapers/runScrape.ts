import { prisma } from "@/lib/prisma";
import { scrapeBeforward } from "@/lib/scrapers/beforward";
import { scrapeSbtJapan } from "@/lib/scrapers/sbtJapan";
import { computeEligibility, deriveLifestyle } from "@/lib/scrapers/normalize";
import type { ScrapedVehicle } from "@/lib/scrapers/types";

export type ScrapeSummary = {
  startedAt: string;
  finishedAt: string;
  totalFound: number;
  created: number;
  updated: number;
  errors: number;
  bySite: Record<string, number>;
};

async function upsertVehicle(v: ScrapedVehicle): Promise<"created" | "updated"> {
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
    imageUrl: v.imageUrl,
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
 * Nightly inventory sync: scrapes BE FORWARD and SBT Japan's public listing
 * pages and upserts results into the Vehicle table, keyed by externalId so
 * re-running never creates duplicates — only new listings get created,
 * previously-seen ones get their price/mileage/etc refreshed in place.
 * Hand-entered admin vehicles (externalId = null) are never touched.
 */
export async function runScrape(pagesPerMake = 2): Promise<ScrapeSummary> {
  const startedAt = new Date().toISOString();
  const bySite: Record<string, number> = {};
  let created = 0;
  let updated = 0;
  let errors = 0;

  const [beforward, sbtjapan] = await Promise.all([
    scrapeBeforward(pagesPerMake).catch((err) => {
      console.error("[runScrape] beforward failed entirely:", err);
      return [] as ScrapedVehicle[];
    }),
    scrapeSbtJapan(pagesPerMake).catch((err) => {
      console.error("[runScrape] sbtjapan failed entirely:", err);
      return [] as ScrapedVehicle[];
    }),
  ]);

  const all = [...beforward, ...sbtjapan];
  bySite["beforward"] = beforward.length;
  bySite["sbtjapan"] = sbtjapan.length;

  for (const v of all) {
    try {
      const result = await upsertVehicle(v);
      if (result === "created") created++;
      else updated++;
    } catch (err) {
      errors++;
      console.error(`[runScrape] failed to upsert ${v.externalId}:`, err);
    }
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    totalFound: all.length,
    created,
    updated,
    errors,
    bySite,
  };
}
