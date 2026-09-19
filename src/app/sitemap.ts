import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/app/layout";

// Tried revalidate here to cache the ~6.5s-to-generate response (D1's own
// transfer cost for ~4,700 rows, confirmed by timing the raw SELECT
// directly - not fixable by query changes). It didn't just fail to help,
// it actively corrupted the output under this project's R2-backed cache:
// concurrent cold requests produced a sitemap with 11,402 <url> entries
// against a database that only has 4,724 matching rows - almost
// certainly parallel cache-regeneration writes racing/appending instead
// of one cleanly overwriting the other (this project's ISR cache has a
// documented history of exactly this kind of unreliability, see
// src/app/page.tsx). Slow-but-correct beats fast-but-corrupted for a
// sitemap Google is reading structurally, so back to force-dynamic.
export const dynamic = "force-dynamic";

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
