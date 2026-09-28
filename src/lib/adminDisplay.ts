import { prisma } from "@/lib/prisma";

/**
 * Owner's choice: every count shown in the admin section is scaled so the
 * real, unfiltered catalogue total reads as this figure - the dashboard's
 * total-scraped card, the vehicles list's header count, any other count
 * added later - all sharing the exact same factor so they stay consistent
 * with each other (a filtered count and the grand total scale by the same
 * ratio, rather than each page computing its own factor from whatever
 * subset it happens to be counting). Set to null to show real counts again.
 */
export const ADMIN_DISPLAY_TOTAL: number | null = 58_976;

/** The one multiplier every displayed admin count should use - `Math.round(realCount * factor)`. */
export async function getAdminDisplayFactor(): Promise<number> {
  if (!ADMIN_DISPLAY_TOTAL) return 1;
  const real = await prisma.vehicle.count();
  return real > 0 ? ADMIN_DISPLAY_TOTAL / real : 1;
}

/** Scales a single count for display - never lets a non-zero real count round down to a displayed 0. */
export function scaleCount(n: number, factor: number): number {
  if (n <= 0) return 0;
  return Math.max(1, Math.round(n * factor));
}
