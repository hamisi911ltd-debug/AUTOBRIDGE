import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicVehicles, getPublicVehicleById } from "@/lib/getPublicVehicles";
import { getPublishedReviews } from "@/lib/getPublishedReviews";
import { getCatalogueStats } from "@/lib/getCatalogueStats";
import { computeLandedCost } from "@/lib/landedCost";
import { formatUsd } from "@/lib/format";
import { AutoBridgeApp } from "@/components/AutoBridgeApp";
import { SITE_URL } from "@/app/layout";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

// Same bounded pool the homepage uses - this route renders the same SPA
// shell (just opened straight to one vehicle), so it needs the same
// browsing data, not a second, differently-shaped payload.
const VEHICLE_LIMIT = 150;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await getPublicVehicleById(id);
  if (!vehicle) return {};

  const landed = computeLandedCost(vehicle, 1);
  const totalUsd = vehicle.sellingPriceUsd + landed.freight + landed.insurance;
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? " " + vehicle.trim : ""} - ${formatUsd(totalUsd)}`;
  const description = `${formatUsd(totalUsd)} incl. freight & insurance to Mombasa - ${vehicle.mileageKm.toLocaleString()} km, ${vehicle.transmission}, ${vehicle.fuel}, sourced from ${vehicle.sourceCountry}. ${BRAND.siteName}.`;
  // Proxied through our own domain rather than linked straight at the
  // source site's CDN - several of them serve a plain <img> fine but
  // reject link-preview crawlers specifically (see the route's own
  // comment), which was leaving shared links with no image at all.
  const image = vehicle.imageUrl ? `${SITE_URL}/api/og-image/${vehicle.id}` : `${SITE_URL}${BRAND.isTemplate ? "/og-image-template.jpg" : "/og-image.jpg"}`;

  return {
    title,
    description,
    alternates: { canonical: `/car/${vehicle.id}` },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/car/${vehicle.id}`,
      siteName: BRAND.siteName,
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

  const landed = computeLandedCost(vehicle, 1);
  const totalUsd = vehicle.sellingPriceUsd + landed.freight + landed.insurance;
  // schema.org Vehicle (a Product subtype) - what makes Google eligible to
  // show a price/availability rich result for this specific listing in
  // search, not just a plain blue link.
  const vehicleSchema = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? " " + vehicle.trim : ""}`,
    image: vehicle.imageUrl ? `${SITE_URL}/api/og-image/${vehicle.id}` : undefined,
    description: `${vehicle.mileageKm.toLocaleString()} km, ${vehicle.transmission}, ${vehicle.fuel}, sourced from ${vehicle.sourceCountry}.`,
    brand: { "@type": "Brand", name: vehicle.make },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: vehicle.mileageKm, unitCode: "KMT" },
    vehicleTransmission: vehicle.transmission,
    fuelType: vehicle.fuel,
    vehicleEngine: vehicle.engineCc ? { "@type": "EngineSpecification", engineDisplacement: { "@type": "QuantitativeValue", value: vehicle.engineCc, unitCode: "CMQ" } } : undefined,
    color: vehicle.color || undefined,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/car/${vehicle.id}`,
      priceCurrency: "USD",
      price: Math.round(totalUsd),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/UsedCondition",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(vehicleSchema) }} />
      <AutoBridgeApp initialVehicles={initialVehicles} reviews={reviews} totalCount={stats.total} initialVehicleId={vehicle.id} />
    </>
  );
}
