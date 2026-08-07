import { prisma } from "@/lib/prisma";
import { computeSellingPriceUsd } from "@/lib/pricing/engine";
import type { PublicVehicle } from "@/types/vehicle";

/**
 * Fetches every vehicle and the active pricing rules, resolves each
 * vehicle's selling price server-side, and strips sourcePriceUsd before
 * returning — no customer-facing code path ever sees the source cost.
 */
export async function getPublicVehicles(): Promise<PublicVehicle[]> {
  const [vehicles, rules] = await Promise.all([
    prisma.vehicle.findMany({ orderBy: { createdAt: "desc" } }),
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
      condition: v.condition,
      badge: v.badge,
      lifestyle: JSON.parse(v.lifestyle) as string[],
      eligible: v.eligible,
      ineligibleReason: v.ineligibleReason,
    };
  });
}
