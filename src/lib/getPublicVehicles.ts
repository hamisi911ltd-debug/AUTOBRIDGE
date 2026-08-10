import { prisma } from "@/lib/prisma";
import { computeSellingPriceUsd } from "@/lib/pricing/engine";
import type { PublicVehicle } from "@/types/vehicle";

// scripts/verifyImageQuality.ts measures every stored cover photo's real
// pixel width; the result is sharply bimodal (~513 vehicles under 300px —
// leftover small listing thumbnails — vs. ~290 at 600px+ from the gallery/
// cover-photo backfills), so 500 cleanly separates "genuinely sharp" from
// "still a thumbnail" with no vehicles landing near the boundary.
const MIN_IMAGE_WIDTH_PX = 500;

/**
 * Fetches every vehicle and the active pricing rules, resolves each
 * vehicle's selling price server-side, and strips sourcePriceUsd before
 * returning — no customer-facing code path ever sees the source cost.
 *
 * Only real, photographed, 2019+, verified-sharp listings are customer-
 * facing: a vehicle with no photo has nothing to show but a placeholder
 * card, a low-res thumbnail looks broken blown up on a card or hero slide,
 * and anything older than the import threshold isn't actually buyable —
 * all three used to be stored and shown as "reference only" or with a soft
 * thumbnail, which just cluttered the site. The admin panel queries Prisma
 * directly and still sees everything, including these, for inventory
 * management.
 */
type VehicleRow = Awaited<ReturnType<typeof prisma.vehicle.findMany>>[number];

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

export async function getPublicVehicles(): Promise<PublicVehicle[]> {
  const [rawVehicles, rules] = await Promise.all([
    prisma.vehicle.findMany({
      where: { imageUrl: { not: null }, imageWidthPx: { gte: MIN_IMAGE_WIDTH_PX }, eligible: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pricingRule.findMany({ where: { active: true } }),
  ]);

  const vehicles = groupIdenticalUnits(rawVehicles);

  return vehicles.map((v) => {
    const { sellingPriceUsd } = computeSellingPriceUsd(v, rules);
    const imageUrls = v.imageUrls ? (JSON.parse(v.imageUrls) as string[]) : [];
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
      imageUrl: v.imageUrl,
      imageUrls,
      // A real multi-photo gallery is the strongest signal that this is a
      // genuine large photo, not a capped listing thumbnail.
      hqImage: imageUrls.length > 1,
      condition: v.condition,
      badge: v.badge,
      lifestyle: JSON.parse(v.lifestyle) as string[],
      eligible: v.eligible,
      ineligibleReason: v.ineligibleReason,
    };
  });
}
