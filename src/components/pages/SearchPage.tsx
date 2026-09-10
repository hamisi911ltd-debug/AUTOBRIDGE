"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { COLORS, FONT_DISPLAY, type Filters } from "@/lib/constants";
import { matchesFilters, sortVehicles } from "@/lib/search";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import { FilterSidebar } from "@/components/vehicles/FilterSidebar";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { Pagination } from "@/components/vehicles/Pagination";

const PAGE_SIZE = 24;

export function SearchPage({
  vehicles,
  landedMap,
  filters,
  setFilters,
  favorites,
  goDetail,
  isLoadingFullCatalogue,
}: {
  vehicles: PublicVehicle[];
  landedMap: Record<string, LandedCost>;
  filters: Filters;
  setFilters: (updater: (f: Filters) => Filters) => void;
  favorites: Set<string>;
  goDetail: (id: string) => void;
  isLoadingFullCatalogue?: boolean;
}) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const facets = useMemo(() => {
    const makeCounts: Record<string, number> = {};
    const modelCounts: Record<string, number> = {};
    const sourceCountryCounts: Record<string, number> = {};
    // Once a make is selected, the model list should only offer that make's
    // own models, not every model across the whole catalogue.
    const modelPool = filters.makes.length > 0 ? vehicles.filter((v) => filters.makes.includes(v.make)) : vehicles;
    for (const v of vehicles) {
      makeCounts[v.make] = (makeCounts[v.make] ?? 0) + 1;
      sourceCountryCounts[v.sourceCountry] = (sourceCountryCounts[v.sourceCountry] ?? 0) + 1;
    }
    for (const v of modelPool) {
      const modelLabel = `${v.make} ${v.model}`;
      modelCounts[modelLabel] = (modelCounts[modelLabel] ?? 0) + 1;
    }
    const allMakes = Object.keys(makeCounts).sort((a, b) => makeCounts[b] - makeCounts[a]);
    const allModels = Object.keys(modelCounts).sort((a, b) => modelCounts[b] - modelCounts[a]);
    const allSourceCountries = Object.keys(sourceCountryCounts).sort((a, b) => sourceCountryCounts[b] - sourceCountryCounts[a]);

    return {
      allMakes,
      allModels,
      allBodyTypes: [...new Set(vehicles.map((v) => v.bodyType))].sort(),
      allFuels: [...new Set(vehicles.map((v) => v.fuel))],
      allTransmissions: [...new Set(vehicles.map((v) => v.transmission))],
      allDrives: [...new Set(vehicles.map((v) => v.drive))],
      allSourceCountries,
    };
  }, [vehicles, filters.makes]);

  const filtered = useMemo(() => {
    const list = vehicles.filter((v) => matchesFilters(v, filters, landedMap[v.id].total, favorites));
    return sortVehicles(list, filters.sort, landedMap);
  }, [vehicles, filters, landedMap, favorites]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    // Filters changed since the last page view — a stale page number could
    // point past the end of the new (usually shorter) result set.
    setPage(1);
  }, [filters]);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function goToPage(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Search vehicles
          </h1>
          <p className="text-sm mt-1" style={{ color: COLORS.slate }}>
            {isLoadingFullCatalogue
              ? "Loading the full inventory…"
              : `${filtered.length} vehicle${filtered.length !== 1 ? "s" : ""} match your filters`}
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
            <option value="priceAsc">Total price: low to high</option>
            <option value="priceDesc">Total price: high to low</option>
            <option value="mileageAsc">Mileage: low to high</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className={mobileFiltersOpen ? "block" : "hidden lg:block"}>
          <FilterSidebar filters={filters} setFilters={setFilters} {...facets} />
        </div>
        <div>
          {paged.length === 0 ? (
            <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: COLORS.line }}>
              <p className="font-medium mb-1">No vehicles match yet</p>
              <p className="text-sm" style={{ color: COLORS.slate }}>
                Try widening your year range or clearing a filter.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {paged.map((v) => (
                  <VehicleCard key={v.id} vehicle={v} onView={() => goDetail(v.id)} />
                ))}
              </div>
              <Pagination page={page} pageCount={pageCount} onPageChange={goToPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
