import { prisma } from "@/lib/prisma";
import { computeSellingPriceUsd } from "@/lib/pricing/engine";
import type { PublicVehicle } from "@/types/vehicle";

/**
 * Insurance estimate computed from the REAL source price — must run here,
 * server-side, while sourcePriceUsd is still in scope. Only the resulting
 * number (not sourcePriceUsd itself) makes it into the returned
 * PublicVehicle.
 */
function computeInsuranceUsd(sourcePriceUsd: number): number {
  return Math.round(sourcePriceUsd * 0.01);
}

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
 * A real check of the live catalogue found 62% of eligible vehicles have no
 * photo of their own — VehicleImage's icon fallback keeps those from
 * rendering broken, but at that volume it reads as a catalogue full of
 * blank cards. 80% of those photo-less vehicles share a make+model with
 * some other in-stock unit that DOES have a real photo, so those borrow
 * that unit's photo as a stand-in (`isRepresentativePhoto: true`) — the UI
 * must label this clearly, since it isn't a photo of this exact car.
 *
 * The same stand-in also covers a narrower case: a vehicle whose own photo
 * is real but stuck under 500px (the original BE FORWARD listing sold or
 * was delisted before the nightly re-fetch could grab a sharper one, so
 * there's nothing left to upgrade from) — rather than leave it visibly
 * blurry forever, it borrows a sharp same-model photo the same way a
 * no-photo vehicle does.
 */
type VehicleRow = Awaited<ReturnType<typeof prisma.vehicle.findMany>>[number];

const MIN_SHARP_WIDTH_PX = 500;

function makeModelKey(make: string, model: string): string {
  return `${make.toLowerCase()}|${model.toLowerCase()}`;
}

/** Best (widest) real photo set per make+model, drawn from every eligible vehicle that has one — used to stand in for units with no (or only a blurry) photo of their own. */
function buildRepresentativePhotos(vehicles: VehicleRow[]): Map<string, { imageUrl: string; imageUrls: string[]; widthPx: number }> {
  const best = new Map<string, VehicleRow>();
  for (const v of vehicles) {
    if (!v.imageUrl) continue;
    const key = makeModelKey(v.make, v.model);
    const current = best.get(key);
    if (!current || (v.imageWidthPx ?? 0) > (current.imageWidthPx ?? 0)) best.set(key, v);
  }
  const result = new Map<string, { imageUrl: string; imageUrls: string[]; widthPx: number }>();
  for (const [key, v] of best) {
    const imageUrls = v.imageUrls ? (JSON.parse(v.imageUrls) as string[]) : v.imageUrl ? [v.imageUrl] : [];
    result.set(key, { imageUrl: v.imageUrl as string, imageUrls, widthPx: v.imageWidthPx ?? 0 });
  }
  return result;
}

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

export async function getPublicVehicles(opts?: { limit?: number }): Promise<PublicVehicle[]> {
  const [rawVehicles, rules] = await Promise.all([
    prisma.vehicle.findMany({
      where: { eligible: true },
      orderBy: { createdAt: "desc" },
      ...(opts?.limit ? { take: opts.limit } : {}),
    }),
    prisma.pricingRule.findMany({ where: { active: true } }),
  ]);

  const representativePhotos = buildRepresentativePhotos(rawVehicles);
  const vehicles = groupIdenticalUnits(rawVehicles);

  return vehicles.map((v) => {
    const { sellingPriceUsd } = computeSellingPriceUsd(v, rules);
    const insuranceUsd = computeInsuranceUsd(v.sourcePriceUsd);
    let imageUrl = v.imageUrl;
    let imageUrls = v.imageUrls ? (JSON.parse(v.imageUrls) as string[]) : [];
    let isRepresentativePhoto = false;

    const needsStandIn = !imageUrl || (v.imageWidthPx ?? 0) < MIN_SHARP_WIDTH_PX;
    if (needsStandIn) {
      const standIn = representativePhotos.get(makeModelKey(v.make, v.model));
      // Only swap in the stand-in if it's actually sharper than what this
      // vehicle already has — no point trading one blurry photo for another.
      if (standIn && standIn.widthPx >= MIN_SHARP_WIDTH_PX && standIn.widthPx > (v.imageWidthPx ?? 0)) {
        imageUrl = standIn.imageUrl;
        imageUrls = standIn.imageUrls;
        isRepresentativePhoto = true;
      }
    }

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
      isRepresentativePhoto,
      condition: v.condition,
      badge: v.badge,
      lifestyle: JSON.parse(v.lifestyle) as string[],
      eligible: v.eligible,
      ineligibleReason: v.ineligibleReason,
    };
  });
}
