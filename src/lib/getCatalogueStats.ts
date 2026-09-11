import { prisma } from "@/lib/prisma";

export type CatalogueStats = {
  total: number;
  addedToday: number;
};

/**
 * Two cheap COUNT queries (not the full vehicle rows) for the homepage
 * promo banner's stats strip - real numbers, not a placeholder, matching
 * how the rest of the site avoids fabricated figures.
 */
export async function getCatalogueStats(): Promise<CatalogueStats> {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [total, addedToday] = await Promise.all([
    prisma.vehicle.count({ where: { eligible: true } }),
    prisma.vehicle.count({ where: { eligible: true, createdAt: { gte: startOfToday } } }),
  ]);

  return { total, addedToday };
}
