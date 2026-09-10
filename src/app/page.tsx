import { getPublicVehicles } from "@/lib/getPublicVehicles";
import { getPublishedReviews } from "@/lib/getPublishedReviews";
import { AutoBridgeApp } from "@/components/AutoBridgeApp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// The homepage's promo/browse sections don't need all 27,000+ eligible
// vehicles — this cap keeps the initial page payload small. Search and
// Ferbot fetch the unbounded list lazily (see /api/vehicles/full) only once
// a visitor actually uses them.
const HOME_VEHICLE_LIMIT = 1500;

export default async function Page() {
  const [vehicles, reviews] = await Promise.all([
    getPublicVehicles({ limit: HOME_VEHICLE_LIMIT }),
    getPublishedReviews(),
  ]);
  return <AutoBridgeApp initialVehicles={vehicles} reviews={reviews} />;
}
