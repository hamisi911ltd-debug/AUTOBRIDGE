import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicVehicles, getPublicVehicleById } from "@/lib/getPublicVehicles";
import { getPublishedReviews } from "@/lib/getPublishedReviews";
import { getCatalogueStats } from "@/lib/getCatalogueStats";
import { computeLandedCost } from "@/lib/landedCost";
import { formatUsd } from "@/lib/format";
import { AutoBridgeApp } from "@/components/AutoBridgeApp";
import { SITE_URL } from "@/app/layout";

export const dynamic = "force-dynamic";

// Same bounded pool the homepage uses - this route renders the same SPA
// shell (just opened straight to one vehicle), so it needs the same
// browsing data, not a second, differently-shaped payload.
const VEHICLE_LIMIT = 150;

function absoluteImage(url: string | null): string {
  if (!url) return "/og-image.jpg";
  return url.startsWith("http") ? url : `${SITE_URL}${url}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await getPublicVehicleById(id);
  if (!vehicle) return {};

  const landed = computeLandedCost(vehicle, 1);
  const totalUsd = vehicle.sellingPriceUsd + landed.freight + landed.insurance;
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? " " + vehicle.trim : ""} - ${formatUsd(totalUsd)}`;
  const description = `${formatUsd(totalUsd)} incl. freight & insurance to Mombasa - ${vehicle.mileageKm.toLocaleString()} km, ${vehicle.transmission}, ${vehicle.fuel}, sourced from ${vehicle.sourceCountry}. Ferbil Car Imports.`;
  const image = absoluteImage(vehicle.imageUrl);

  return {
    title,
    description,
    alternates: { canonical: `/car/${vehicle.id}` },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/car/${vehicle.id}`,
      siteName: "Ferbil Car Imports",
      title,
      description,
      images: [{ url: image, width: 1200, height: 900, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function CarSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [vehicle, vehicles, reviews, stats] = await Promise.all([
    getPublicVehicleById(id),
    getPublicVehicles({ limit: VEHICLE_LIMIT, diverse: true }),
    getPublishedReviews(),
    getCatalogueStats(),
  ]);
  if (!vehicle) notFound();

  // The bounded/diverse homepage pool won't reliably include this exact
  // vehicle - without it, AutoBridgeApp's `vehicles.find(id)` for the
  // detail page comes back empty and renders nothing. Prepending it (and
  // dropping any duplicate) guarantees it's there regardless.
  const initialVehicles = [vehicle, ...vehicles.filter((v) => v.id !== vehicle.id)];

  return <AutoBridgeApp initialVehicles={initialVehicles} reviews={reviews} totalCount={stats.total} initialVehicleId={vehicle.id} />;
}
