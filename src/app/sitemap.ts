import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/app/layout";

export const dynamic = "force-dynamic";

/**
 * Every eligible, photographed vehicle now has a real, indexable page
 * (/car/[id], added alongside this) - listing them here is what actually
 * gets Google to find and index individual listings, not just the
 * homepage. A plain `id`-only select keeps this to the cheapest possible
 * D1 read (no vehicle data, just the column the URL needs) despite the
 * row count.
 *
 * Deliberately no `orderBy` - sitemap URL order has no SEO meaning, and
 * `orderBy: updatedAt` here (with no supporting index - the existing
 * composite index is on eligible+createdAt, see getPublicVehicles.ts) was
 * forcing D1 to sort ~4,700 rows on every single request, ~7s and 870KB
 * per fetch. That's the likely cause of Search Console's "Could not
 * fetch" on this sitemap - slow/unindexed enough to plausibly time out a
 * crawler's fetch, on top of needlessly burning D1 read quota per hit.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vehicles = await prisma.vehicle.findMany({
    where: { eligible: true, imageUrl: { not: null } },
    select: { id: true, updatedAt: true },
  });

  const vehicleEntries: MetadataRoute.Sitemap = vehicles.map((v) => ({
    url: `${SITE_URL}/car/${v.id}`,
    lastModified: v.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    ...vehicleEntries,
  ];
}
