import { getPublicVehicles } from "@/lib/getPublicVehicles";
import { getPublishedReviews } from "@/lib/getPublishedReviews";
import { getCatalogueStats } from "@/lib/getCatalogueStats";
import { AutoBridgeApp } from "@/components/AutoBridgeApp";

// Deliberately force-dynamic, not ISR. A 60s revalidate window was tried
// here first, but this app's R2-backed incremental cache (OpenNext on
// Cloudflare) turned out to hang unpredictably on both cache writes (seen
// directly in deploy logs: "Failed to send request to R2 worker: timeout")
// and reads (a plain, non-concurrent follow-up request hung for 2+ minutes
// in testing) - the cache layer itself was the unreliable part, not the
// page's own cost. With HOME_VEHICLE_LIMIT cut down and the D1 query
// trimmed to only the columns actually used, a fresh render is now cheap
// enough (well under a second of real work) that depending on a flaky
// cache isn't worth the risk it introduces.
export const dynamic = "force-dynamic";

// The homepage's promo/browse sections don't need all 27,000+ eligible
// vehicles - this cap keeps the initial page payload small. Search fetches
// the unbounded list lazily (see /api/vehicles/full) only once actually
// used. History: 800 → 400 → 250, each cut after a fresh "Exceeded CPU
// Limit" outage on plain GET / with zero concurrent load, always following
// real catalogue growth - the query's WHERE eligible / ORDER BY createdAt
// had no supporting index, so cost scaled with total table size regardless
// of this LIMIT. Added a composite index (Vehicle_eligible_createdAt_idx,
// 2026-08-29) to fix that at the root, but cutting to 150 here too since
// the outage didn't clear the moment the index landed - D1 may take a beat
// to actually pick the new index up, or there's a second contributor. Raise
// this back once a real stretch of stable traffic confirms the index alone
// is holding. "Best sellers by category" thins out more at this size -
// availability wins over that.
const HOME_VEHICLE_LIMIT = 150;

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  // diverse: true fetches evenly across every make instead of strictly
  // newest-first - otherwise whichever make a scrape happened to finish on
  // most recently silently crowds out every other brand within this bounded
  // pool (confirmed live: a growth crawl ending on Jaguar/Hyundai left the
  // homepage showing almost nothing else).
  const [{ q }, vehicles, reviews, stats] = await Promise.all([
    searchParams,
    getPublicVehicles({ limit: HOME_VEHICLE_LIMIT, diverse: true }),
    getPublishedReviews(),
    getCatalogueStats(),
  ]);
  // ?q= makes the homepage's own SearchAction structured data (layout.tsx)
  // an actually-functional sitelinks search box target, not just a schema
  // claim - landing here with one jumps straight into a real search
  // instead of requiring a click through the home page first.
  return <AutoBridgeApp initialVehicles={vehicles} reviews={reviews} totalCount={stats.total} initialSearchQuery={q || null} />;
}
