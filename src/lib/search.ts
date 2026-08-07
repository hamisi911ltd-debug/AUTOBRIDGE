import type { Filters } from "@/lib/constants";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";

/**
 * In-memory filter/sort over an already-fetched vehicle list. Isolated here
 * so a real search index (Meilisearch etc.) can replace the implementation
 * later without touching callers — catalog is small and Kenya-only for now,
 * so this is plenty fast.
 */
export function matchesFilters(
  v: PublicVehicle,
  f: Filters,
  landedTotal: number,
  favorites: Set<string>
): boolean {
  if (f.eligibleOnly && !v.eligible) return false;
  if (v.year < f.yearMin || v.year > f.yearMax) return false;
  if (landedTotal < f.priceMinKes || landedTotal > f.priceMaxKes) return false;
  if (f.makes.length && !f.makes.includes(v.make)) return false;
  if (f.bodyTypes.length && !f.bodyTypes.includes(v.bodyType)) return false;
  if (f.fuels.length && !f.fuels.includes(v.fuel)) return false;
  if (f.transmissions.length && !f.transmissions.includes(v.transmission)) return false;
  if (f.sourceCountries.length && !f.sourceCountries.includes(v.sourceCountry)) return false;
  if (f.lifestyle && !v.lifestyle.includes(f.lifestyle)) return false;
  if (f.favoritesOnly && !favorites.has(v.id)) return false;
  if (f.keyword) {
    const k = f.keyword.toLowerCase();
    const hay = `${v.make} ${v.model} ${v.trim}`.toLowerCase();
    if (!hay.includes(k)) return false;
  }
  return true;
}

export function sortVehicles(
  list: PublicVehicle[],
  sort: Filters["sort"],
  landedMap: Record<string, LandedCost>
): PublicVehicle[] {
  const arr = [...list];
  if (sort === "priceAsc") arr.sort((a, b) => landedMap[a.id].total - landedMap[b.id].total);
  else if (sort === "priceDesc") arr.sort((a, b) => landedMap[b.id].total - landedMap[a.id].total);
  else if (sort === "mileageAsc") arr.sort((a, b) => a.mileageKm - b.mileageKm);
  else arr.sort((a, b) => b.year - a.year || a.id.localeCompare(b.id));
  return arr;
}
