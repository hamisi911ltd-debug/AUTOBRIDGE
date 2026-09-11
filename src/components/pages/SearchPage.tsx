"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, Bell, CheckCircle2 } from "lucide-react";
import { COLORS, FONT_DISPLAY, type Filters } from "@/lib/constants";
import { matchesFilters, sortVehicles } from "@/lib/search";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import { FilterSidebar } from "@/components/vehicles/FilterSidebar";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { Pagination } from "@/components/vehicles/Pagination";

// Kept small enough that a page of results roughly fits one screen (3-across
// on desktop, so 15 is 5 rows) rather than requiring a long scroll before
// "Next page" ever comes into view, while still filling out the height of
// the filter sidebar next to it instead of trailing off much shorter.
const PAGE_SIZE = 15;

// Below this count, a shopper has likely found the right model but not
// enough actual units to choose from - worth actively offering to go find
// more, rather than leaving them to just scroll a short list.
const FEW_RESULTS_THRESHOLD = 5;

/** Plain-language summary of the active search, for the enquiry message - whatever the shopper actually typed/picked, not the raw filter object. */
function describeSearch(filters: Filters): string {
  const parts: string[] = [];
  if (filters.makes.length > 0) parts.push(filters.makes.join(", "));
  if (filters.models.length > 0) parts.push(filters.models.join(", "));
  if (filters.keyword.trim()) parts.push(`"${filters.keyword.trim()}"`);
  if (filters.bodyTypes.length > 0) parts.push(filters.bodyTypes.join(", "));
  return parts.length > 0 ? parts.join(" · ") : "their current search";
}

/** Compact inline request card - asks us to source more of a model that's thin in stock right now, without leaving the search results. */
function RequestMoreStock({ vehicleId, searchLabel }: { vehicleId: string; searchLabel: string }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSending(true);
    try {
      await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          name: data.get("name"),
          phone: data.get("phone"),
          message: `[More stock request] Looking for more options matching: ${searchLabel}`,
        }),
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border p-3 sm:p-4 mb-4 flex items-center gap-2 text-sm font-medium" style={{ borderColor: COLORS.line, color: COLORS.burgundy }}>
        <CheckCircle2 size={18} /> Thanks, we&apos;ll reach out as soon as more come in.
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-3 sm:p-4 mb-4" style={{ borderColor: COLORS.line, background: COLORS.card }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.burgundy }}>
            <Bell size={15} color="#fff" />
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: COLORS.navy }}>
              Only a few of these in stock right now
            </p>
            <p className="text-xs mt-0.5" style={{ color: COLORS.slate }}>
              Ask us to find more matching {searchLabel} and we&apos;ll notify you when new units arrive.
            </p>
          </div>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-full text-white"
            style={{ background: COLORS.burgundy }}
          >
            Request more
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 mt-3">
          <input name="name" required placeholder="Full name" className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "#D8DCE3" }} />
          <input name="phone" required placeholder="Phone number" className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "#D8DCE3" }} />
          <button
            type="submit"
            disabled={sending}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: COLORS.burgundy }}
          >
            {sending ? "Sending…" : "Notify me"}
          </button>
        </form>
      )}
    </div>
  );
}

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

    // Same "Make Model" labels as allModels, just grouped under their own
    // make instead of one long mixed list - lets the sidebar show models
    // nested under each make so finding one doesn't mean scanning past
    // every other brand's models first.
    const modelsByMake: Record<string, string[]> = {};
    for (const make of allMakes) modelsByMake[make] = [];
    for (const label of allModels) {
      const make = allMakes.find((m) => label.startsWith(`${m} `));
      if (make) modelsByMake[make].push(label);
    }

    return {
      allMakes,
      allModels,
      modelsByMake,
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
    // Filters changed since the last page view - a stale page number could
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

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] lg:items-start gap-6">
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
              {filtered.length <= FEW_RESULTS_THRESHOLD && (
                <RequestMoreStock key={filtered[0].id} vehicleId={filtered[0].id} searchLabel={describeSearch(filters)} />
              )}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {paged.map((v, i) => (
                  <VehicleCard key={v.id} vehicle={v} onView={() => goDetail(v.id)} priority={page === 1 && i === 0} />
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
