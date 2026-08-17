"use client";

import { useEffect, useMemo, useState } from "react";
import { COLORS, FONT_DISPLAY, type Filters } from "@/lib/constants";
import { matchesFilters, sortVehicles } from "@/lib/search";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { Pagination } from "@/components/vehicles/Pagination";

// LCM of 3 and 4 — the grid runs 3-across on mobile/tablet and 4-across on
// desktop, so a full page has to divide evenly into both to avoid a
// dangling gap in the last row.
const PAGE_SIZE = 24;

/**
 * The homepage's own catalogue grid — full width, no search bar or filter
 * chips (those live on the dedicated Search page now); this is a fast,
 * uncluttered scan of live inventory right below the offers rail.
 */
export function CatalogueSection({
  vehicles,
  landedMap,
  filters,
  favorites,
  goDetail,
}: {
  vehicles: PublicVehicle[];
  landedMap: Record<string, LandedCost>;
  filters: Filters;
  favorites: Set<string>;
  goDetail: (id: string) => void;
}) {
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const list = vehicles.filter((v) => matchesFilters(v, filters, landedMap[v.id].total, favorites));
    return sortVehicles(list, filters.sort, landedMap);
  }, [vehicles, filters, landedMap, favorites]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    setPage(1);
  }, [filters]);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function goToPage(p: number) {
    setPage(p);
    document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section id="catalogue" className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-14">
      <div className="mb-4">
        <div className="w-10 h-1 rounded-full mb-2" style={{ background: COLORS.gold }} />
        <h2 className="text-2xl sm:text-3xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Find your car
        </h2>
        <p className="text-sm mt-1" style={{ color: COLORS.slate }}>
          {filtered.length} vehicle{filtered.length !== 1 ? "s" : ""} in stock
        </p>
      </div>

      {paged.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: COLORS.line }}>
          <p className="font-medium mb-1">No vehicles match yet</p>
          <p className="text-sm" style={{ color: COLORS.slate }}>
            Check back soon — new stock arrives regularly.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-5">
            {paged.map((v) => (
              <VehicleCard key={v.id} vehicle={v} onView={() => goDetail(v.id)} />
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} onPageChange={goToPage} />
        </>
      )}
    </section>
  );
}
