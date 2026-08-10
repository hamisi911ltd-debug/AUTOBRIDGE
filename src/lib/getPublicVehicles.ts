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
export async function getPublicVehicles(): Promise<PublicVehicle[]> {
  const [vehicles, rules] = await Promise.all([
    prisma.vehicle.findMany({
      where: { imageUrl: { not: null }, imageWidthPx: { gte: MIN_IMAGE_WIDTH_PX }, eligible: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pricingRule.findMany({ where: { active: true } }),
  ]);

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
