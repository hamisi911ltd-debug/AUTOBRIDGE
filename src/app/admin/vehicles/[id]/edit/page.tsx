import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeSellingPriceUsd } from "@/lib/pricing/engine";
import { VehicleForm } from "@/app/admin/vehicles/VehicleForm";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [v, rules, enquiryCount] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id } }),
    prisma.pricingRule.findMany({ where: { active: true } }),
    prisma.enquiry.count({ where: { vehicleId: id } }),
  ]);
  if (!v) notFound();

  const { sellingPriceUsd, appliedRule } = computeSellingPriceUsd(v, rules);

  return (
    <VehicleForm
      initial={{
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
        sourcePriceUsd: v.sourcePriceUsd,
        imageUrl: v.imageUrl,
        condition: v.condition,
        badge: v.badge,
        lifestyle: JSON.parse(v.lifestyle) as string[],
        eligible: v.eligible,
        ineligibleReason: v.ineligibleReason,
        sourceSite: v.sourceSite,
        sourceUrl: v.sourceUrl,
        externalId: v.externalId,
        lastScrapedAt: v.lastScrapedAt ? v.lastScrapedAt.toISOString() : null,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
        sellingPriceUsd,
        appliedRuleName: appliedRule?.name ?? null,
        enquiryCount,
      }}
    />
  );
}
