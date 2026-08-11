"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { COLORS, FONT_DISPLAY, type Filters } from "@/lib/constants";
import { matchesFilters, sortVehicles } from "@/lib/search";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import { FilterSidebar } from "@/components/vehicles/FilterSidebar";
import { VehicleCard } from "@/components/vehicles/VehicleCard";

const PAGE_SIZE = 20;

/**
 * The homepage's own full, filterable catalogue — the same sidebar used on
 * the dedicated search page, embedded directly on the landing page so
 * browsing the whole live inventory doesn't require a page change first.
 */
export function CatalogueSection({
  vehicles,
  landedMap,
  filters,
  setFilters,
  favorites,
  toggleFavorite,
  compareList,
  toggleCompare,
  goDetail,
}: {
  vehicles: PublicVehicle[];
  landedMap: Record<string, LandedCost>;
  filters: Filters;
  setFilters: (updater: (f: Filters) => Filters) => void;
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  compareList: string[];
  toggleCompare: (id: string) => void;
  goDetail: (id: string) => void;
}) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const facets = useMemo(() => {
    const makeCounts: Record<string, number> = {};
    for (const v of vehicles) makeCounts[v.make] = (makeCounts[v.make] ?? 0) + 1;
    const allMakes = Object.keys(makeCounts).sort((a, b) => makeCounts[b] - makeCounts[a]);

    return {
      allMakes,
      makeCounts,
      allBodyTypes: [...new Set(vehicles.map((v) => v.bodyType))].sort(),
      allFuels: [...new Set(vehicles.map((v) => v.fuel))],
      allTransmissions: [...new Set(vehicles.map((v) => v.transmission))],
      allSourceCountries: [...new Set(vehicles.map((v) => v.sourceCountry))],
    };
  }, [vehicles]);

  const filtered = useMemo(() => {
    const list = vehicles.filter((v) => matchesFilters(v, filters, landedMap[v.id].total, favorites));
    return sortVehicles(list, filters.sort, landedMap);
  }, [vehicles, filters, landedMap, favorites]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Browse the full catalogue
          </h2>
          <p className="text-sm mt-1" style={{ color: COLORS.slate }}>
            {filtered.length} vehicle{filtered.length !== 1 ? "s" : ""} match your filters
          </p>
        </div>
        <button
          onClick={() => setMobileFiltersOpen((o) => !o)}
          className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium"
          style={{ borderColor: "#D8DCE3" }}
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className={mobileFiltersOpen ? "block" : "hidden lg:block"}>
          <FilterSidebar filters={filters} setFilters={setFilters} {...facets} />
        </div>
        <div>
          {visible.length === 0 ? (
            <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: COLORS.line }}>
              <p className="font-medium mb-1">No vehicles match yet</p>
              <p className="text-sm" style={{ color: COLORS.slate }}>
                Try widening your year range or clearing a filter.
              </p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {visible.map((v) => (
                  <VehicleCard
                    key={v.id}
                    vehicle={v}
                    isFavorite={favorites.has(v.id)}
                    onFavorite={() => toggleFavorite(v.id)}
                    inCompare={compareList.includes(v.id)}
                    onCompare={() => toggleCompare(v.id)}
                    onView={() => goDetail(v.id)}
                  />
                ))}
              </div>
              {visibleCount < filtered.length && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="px-6 py-2.5 rounded-full text-sm font-semibold border"
                    style={{ borderColor: COLORS.line, color: COLORS.navy }}
                  >
                    Show more ({filtered.length - visibleCount} left)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
