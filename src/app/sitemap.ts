import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/app/layout";

// Confirmed by timing the same SELECT directly against D1 (bypassing the
// app entirely): reading back ~4,700 rows costs several real seconds no
// matter the query shape - D1's own transfer cost for a result set this
// size, not something indexing or query-side changes move. revalidate
// caches the *response*, though this project's R2-backed cache has been
// unreliable for that in practice (see src/app/page.tsx's own history)
// so it's kept here as a no-harm attempt, not the actual fix - the select
// below (id only, no updatedAt) is what actually cuts the payload.
export const revalidate = 3600;

/**
 * Every eligible, photographed vehicle now has a real, indexable page
 * (/car/[id], added alongside this) - listing them here is what actually
 * gets Google to find and index individual listings, not just the
 * homepage. `id`-only (no `updatedAt`, no `orderBy` - neither has any SEO
 * value here) keeps the per-row payload as small as this can get, given
 * the row count itself is the real cost.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vehicles = await prisma.vehicle.findMany({
    where: { eligible: true, imageUrl: { not: null } },
    select: { id: true },
  });

  const vehicleEntries: MetadataRoute.Sitemap = vehicles.map((v) => ({
    url: `${SITE_URL}/car/${v.id}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    ...vehicleEntries,
  ];
}
