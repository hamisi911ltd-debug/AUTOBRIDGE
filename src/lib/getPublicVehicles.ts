import { prisma } from "@/lib/prisma";
import { computeSellingPriceUsd } from "@/lib/pricing/engine";
import type { PublicVehicle } from "@/types/vehicle";

/**
 * Fetches every vehicle and the active pricing rules, resolves each
 * vehicle's selling price server-side, and strips sourcePriceUsd before
 * returning — no customer-facing code path ever sees the source cost.
 *
 * Only real, photographed, 2019+ listings are customer-facing: a vehicle
 * with no photo has nothing to show but a placeholder card, and anything
 * older than the import threshold isn't actually buyable — both used to be
 * stored and shown as "reference only", which just cluttered the site with
 * cars nobody can get. The admin panel queries Prisma directly and still
 * sees everything, including these, for inventory management.
 */
export async function getPublicVehicles(): Promise<PublicVehicle[]> {
  const [vehicles, rules] = await Promise.all([
    prisma.vehicle.findMany({
      where: { imageUrl: { not: null }, eligible: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pricingRule.findMany({ where: { active: true } }),
  ]);

  return vehicles.map((v) => {
    const { sellingPriceUsd } = computeSellingPriceUsd(v, rules);
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
      hqImage: v.sourceSite === "sbtjapan",
      condition: v.condition,
      badge: v.badge,
      lifestyle: JSON.parse(v.lifestyle) as string[],
      eligible: v.eligible,
      ineligibleReason: v.ineligibleReason,
    };
  });
}
