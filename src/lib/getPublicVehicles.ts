import { prisma } from "@/lib/prisma";
import { computeSellingPriceUsd } from "@/lib/pricing/engine";
import { computeInsuranceUsd } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";

/**
 * Fetches vehicles (optionally capped via `opts.limit`, newest first) and
 * the active pricing rules, resolves each vehicle's selling price
 * server-side, and strips sourcePriceUsd before returning — no
 * customer-facing code path ever sees the source cost.
 *
 * Every eligible vehicle is a candidate — regardless of photo presence or
 * resolution (the user explicitly asked for maximum visible inventory over
 * a photo-quality gate). `eligible` stays as the one real filter here since
 * it's a legal constraint (KRA's 8-year import-age cap), not a cosmetic one.
 *
 * Unbounded, this runs to 27,000+ rows — too large to embed in every page's
 * initial payload. The homepage calls this with a `limit` (freshest-first,
 * plenty for the promo/browse sections); `/api/vehicles/full` calls it
 * unbounded for Search and Ferbot, which genuinely need the whole catalogue,
 * fetched lazily only once those are actually used.
 *
 * Every vehicle shows only its own real photo, or none at all — an earlier
 * version borrowed a same-model unit's sharper photo as a labeled "stand-in"
 * for photo-less/blurry listings, but that read as misleading (a shopper
 * deciding on a specific car shouldn't be shown a different unit's photo).
 * A vehicle with no usable photo of its own falls back to VehicleImage's
 * branded placeholder instead. Genuinely low-quality photos (under 500px)
 * are pruned from the catalogue directly rather than patched over here.
 */
// Only the columns the code below actually reads — sourceSite, externalId,
// sourceUrl, lastScrapedAt, updatedAt were being pulled and transferred out
// of D1 on every request for no reason, adding real D1 read + serialization
// cost that multiplies badly under concurrent traffic.
const VEHICLE_SELECT = {
  id: true,
  make: true,
  model: true,
  trim: true,
  year: true,
  mileageKm: true,
  fuel: true,
  transmission: true,
  engineCc: true,
  bodyType: true,
  drive: true,
  seats: true,
  color: true,
  sourceCountry: true,
  sourcePriceUsd: true,
  freightIncluded: true,
  imageUrl: true,
  imageUrls: true,
  imageWidthPx: true,
  condition: true,
  badge: true,
  lifestyle: true,
  eligible: true,
  ineligibleReason: true,
  refNo: true,
  chassisNo: true,
  modelCode: true,
  engineCode: true,
  steering: true,
  location: true,
  versionClass: true,
  doors: true,
  dimensions: true,
  weightKg: true,
  registrationYearMonth: true,
  manufactureYearMonth: true,
  features: true,
} as const;

type VehicleRow = Awaited<ReturnType<typeof prisma.vehicle.findMany<{ select: typeof VEHICLE_SELECT }>>>[number];

/**
 * Dealers commonly stock several physically-identical units of the same new
 * model (same trim, same price, mileage 0, different stock/ref numbers) —
 * confirmed live: BE FORWARD had 4 separate 2026 Kia Sorento listings, same
 * spec and price down to the dollar, each with its own photo. Shown as
 * separate cards that reads as spammy duplication rather than real choice,
 * so identical-spec units are grouped into a single listing here, with
 * every unit's photo folded into one gallery — one post per distinct car,
 * not one post per stock unit.
 */
function dedupeKey(v: VehicleRow): string {
  return [v.make, v.model, v.year, v.trim, v.mileageKm, v.sourcePriceUsd].join("|");
}

function groupIdenticalUnits(vehicles: VehicleRow[]): VehicleRow[] {
  const groups = new Map<string, VehicleRow[]>();
  for (const v of vehicles) {
    const key = dedupeKey(v);
    const group = groups.get(key);
    if (group) group.push(v);
    else groups.set(key, [v]);
  }

  return [...groups.values()].map((group) => {
    if (group.length === 1) return group[0];

    // The sharpest-photographed unit represents the group; every unit's
    // photo(s) still make it into the merged gallery.
    const primary = group.reduce((best, v) => ((v.imageWidthPx ?? 0) > (best.imageWidthPx ?? 0) ? v : best));
    const allPhotos = group.flatMap((v) => (v.imageUrls ? (JSON.parse(v.imageUrls) as string[]) : v.imageUrl ? [v.imageUrl] : []));
    const merged = [...new Set(allPhotos)].slice(0, 5);

    return { ...primary, imageUrl: merged[0] ?? primary.imageUrl, imageUrls: JSON.stringify(merged) };
  });
}

/**
 * A plain "newest N overall" fetch, bounded by `opts.limit`, badly starves
 * whichever makes weren't scraped most recently — confirmed live: a growth
 * crawl that happened to finish on Jaguar and Hyundai last left the
 * homepage's bounded pool almost entirely those two makes, since every one
 * of their rows was newer than everything else. `opts.diverse` fetches per
 * make instead (one small indexed query each, `[make, model]` already has
 * an index) and interleaves the results, so the bounded pool always spans
 * every make in the catalogue regardless of scrape order.
 */
async function fetchDiverseVehicles(limit: number): Promise<VehicleRow[]> {
  const makeRows = await prisma.vehicle.findMany({ where: { eligible: true }, distinct: ["make"], select: { make: true } });
  const makes = makeRows.map((m) => m.make);
  if (makes.length === 0) return [];

  const perMake = Math.max(1, Math.ceil(limit / makes.length));
  const groups = await Promise.all(
    makes.map((make) =>
      prisma.vehicle.findMany({
        where: { eligible: true, make },
        orderBy: { createdAt: "desc" },
        select: VEHICLE_SELECT,
        take: perMake,
      })
    )
  );

  // Round-robin across makes (one pick per make per round) rather than
  // concatenating each make's block wholesale, so the pool is evenly mixed
  // even before groupIdenticalUnits/diverseByMake ever see it.
  const out: VehicleRow[] = [];
  for (let i = 0; i < perMake; i++) {
    for (const group of groups) {
      if (i < group.length) out.push(group[i]);
    }
  }
  return out.slice(0, limit);
}

export async function getPublicVehicles(opts?: { limit?: number; diverse?: boolean }): Promise<PublicVehicle[]> {
  const [rawVehicles, rules] = await Promise.all([
    opts?.diverse && opts.limit
      ? fetchDiverseVehicles(opts.limit)
      : prisma.vehicle.findMany({
          where: { eligible: true },
          orderBy: { createdAt: "desc" },
          select: VEHICLE_SELECT,
          ...(opts?.limit ? { take: opts.limit } : {}),
        }),
    prisma.pricingRule.findMany({ where: { active: true } }),
  ]);

  const vehicles = groupIdenticalUnits(rawVehicles);

  return vehicles.map((v) => {
    const { sellingPriceUsd } = computeSellingPriceUsd(v, rules);
    const insuranceUsd = computeInsuranceUsd(v.sourcePriceUsd);
    const imageUrl = v.imageUrl;
    let imageUrls = v.imageUrls ? (JSON.parse(v.imageUrls) as string[]) : [];

    if (imageUrl && !imageUrls.includes(imageUrl)) imageUrls = [imageUrl, ...imageUrls];

    return {
      id: v.id,
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
      sellingPriceUsd,
      insuranceUsd,
      freightIncluded: v.freightIncluded,
      imageUrl,
      imageUrls,
      // A real multi-photo gallery is the strongest signal that this is a
      // genuine large photo, not a capped listing thumbnail.
      hqImage: imageUrls.length > 1,
      isRepresentativePhoto: false,
      condition: v.condition,
      badge: v.badge,
      lifestyle: JSON.parse(v.lifestyle) as string[],
      eligible: v.eligible,
      ineligibleReason: v.ineligibleReason,
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
      features: v.features ? (JSON.parse(v.features) as string[]) : [],
    };
  });
}
