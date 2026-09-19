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
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vehicles = await prisma.vehicle.findMany({
    where: { eligible: true, imageUrl: { not: null } },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
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
