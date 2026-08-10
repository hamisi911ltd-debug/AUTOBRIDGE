"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { COLORS, FONT_DISPLAY, type Filters } from "@/lib/constants";
import { matchesFilters, sortVehicles } from "@/lib/search";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import { FilterSidebar } from "@/components/vehicles/FilterSidebar";
import { VehicleCard } from "@/components/vehicles/VehicleCard";

export function SearchPage({
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Search vehicles
          </h1>
          <p className="text-sm mt-1" style={{ color: COLORS.slate }}>
            {filtered.length} vehicle{filtered.length !== 1 ? "s" : ""} match your filters
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.slate }} />
            <input
              type="text"
              value={filters.keyword}
              onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
              placeholder="Search make, model, trim…"
              className="border rounded-full pl-9 pr-4 py-2 text-sm w-56"
              style={{ borderColor: "#D8DCE3" }}
            />
          </div>
          <button
            onClick={() => setMobileFiltersOpen((o) => !o)}
            className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium"
            style={{ borderColor: "#D8DCE3" }}
          >
            <SlidersHorizontal size={16} /> Filters
          </button>
          <select
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as Filters["sort"] }))}
            className="border rounded-full px-4 py-2 text-sm"
            style={{ borderColor: "#D8DCE3" }}
          >
            <option value="recent">Recently added</option>
            <option value="priceAsc">Landed cost: low to high</option>
            <option value="priceDesc">Landed cost: high to low</option>
            <option value="mileageAsc">Mileage: low to high</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className={mobileFiltersOpen ? "block" : "hidden lg:block"}>
          <FilterSidebar filters={filters} setFilters={setFilters} {...facets} />
        </div>
        <div>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: COLORS.line }}>
              <p className="font-medium mb-1">No vehicles match yet</p>
              <p className="text-sm" style={{ color: COLORS.slate }}>
                Try widening your year range or clearing a filter.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((v) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
