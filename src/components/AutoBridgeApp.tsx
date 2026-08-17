"use client";

import { useEffect, useMemo, useState } from "react";
import { COLORS, DEFAULT_FILTERS, FONT_BODY, type Filters } from "@/lib/constants";
import { computeLandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import type { PublicReview } from "@/types/review";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { HomePage } from "@/components/pages/HomePage";
import { SearchPage } from "@/components/pages/SearchPage";
import { DetailPage } from "@/components/pages/DetailPage";
import { ComparePage } from "@/components/pages/ComparePage";

export type Page = "home" | "search" | "detail" | "compare";

// Bumped to v2 to start every visitor fresh (a one-off reset, requested
// directly) — old data under the v1 keys is simply never read again.
const FAVORITES_KEY = "ferbil:favorites:v2";
const COMPARE_KEY = "ferbil:compare:v2";

export function AutoBridgeApp({ initialVehicles, reviews }: { initialVehicles: PublicVehicle[]; reviews: PublicReview[] }) {
  const [page, setPage] = useState<Page>("home");
  const [fx, setFx] = useState(129);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [compareList, setCompareList] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // The home page only gets a recent-first slice of the catalogue (see
  // src/app/page.tsx) so the initial payload stays small. Search needs the
  // real, unbounded inventory to answer correctly, so this swaps in the
  // full list — fetched once, lazily — the first time it's actually opened,
  // rather than paying that cost on every visit.
  const [vehicles, setVehicles] = useState<PublicVehicle[]>(initialVehicles);
  const [fullCatalogueLoaded, setFullCatalogueLoaded] = useState(false);
  const [fullCatalogueLoading, setFullCatalogueLoading] = useState(false);

  const needsFullCatalogue = page === "search";
  useEffect(() => {
    if (!needsFullCatalogue || fullCatalogueLoaded || fullCatalogueLoading) return;
    setFullCatalogueLoading(true);
    fetch("/api/vehicles/full")
      .then((r) => r.json())
      .then((data: { vehicles: PublicVehicle[] }) => {
        setVehicles(data.vehicles);
        setFullCatalogueLoaded(true);
      })
      .catch(() => {
        // Leave the bounded initial set in place — Search/Ferbot still work,
        // just over a smaller pool, rather than breaking outright.
      })
      .finally(() => setFullCatalogueLoading(false));
  }, [needsFullCatalogue, fullCatalogueLoaded, fullCatalogueLoading]);

  useEffect(() => {
    // One-time hydration from a browser-only API: this can't run during SSR
    // (no localStorage on the server) or in a useState initializer without
    // causing a hydration mismatch, so a post-mount effect is the correct
    // place for it, even though it triggers one extra render.
    try {
      const savedFavorites = localStorage.getItem(FAVORITES_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedFavorites) setFavorites(new Set(JSON.parse(savedFavorites)));
      const savedCompare = localStorage.getItem(COMPARE_KEY);
      if (savedCompare) setCompareList(JSON.parse(savedCompare));
    } catch {
      // localStorage unavailable — favorites/compare just stay session-only
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(compareList));
  }, [compareList]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);

  const landedMap = useMemo(() => {
    const m: Record<string, ReturnType<typeof computeLandedCost>> = {};
    vehicles.forEach((v) => {
      m[v.id] = computeLandedCost(v, fx);
    });
    return m;
  }, [vehicles, fx]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleCompare(id: string) {
    setCompareList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 4 ? prev : [...prev, id]));
  }
  function goDetail(id: string) {
    setSelectedId(id);
    setPage("detail");
  }
  function goSearch(patch: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage("search");
  }

  const selectedVehicle = vehicles.find((v) => v.id === selectedId) || null;

  return (
    <div style={{ fontFamily: FONT_BODY, background: COLORS.paper, minHeight: "100vh", color: COLORS.ink }} className="w-full pb-16 md:pb-0 pt-[3.25rem] sm:pt-[4.5rem]">
      <Header
        setPage={setPage}
        favoritesCount={favorites.size}
        compareCount={compareList.length}
        onGoSearch={() => goSearch({})}
        onGoFavorites={() => goSearch({ favoritesOnly: true })}
        onGoCompare={() => setPage("compare")}
      />

      <main>
        {page === "home" && (
          <HomePage
            vehicles={vehicles}
            landedMap={landedMap}
            filters={filters}
            favorites={favorites}
            goDetail={goDetail}
            goSearch={goSearch}
            reviews={reviews}
          />
        )}
        {page === "search" && (
          <SearchPage
            vehicles={vehicles}
            landedMap={landedMap}
            filters={filters}
            setFilters={setFilters}
            favorites={favorites}
            goDetail={goDetail}
            isLoadingFullCatalogue={fullCatalogueLoading && !fullCatalogueLoaded}
          />
        )}
        {page === "detail" && selectedVehicle && (
          <DetailPage
            vehicle={selectedVehicle}
            landed={landedMap[selectedVehicle.id]}
            fx={fx}
            setFx={setFx}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            compareList={compareList}
            toggleCompare={toggleCompare}
            vehicles={vehicles}
            goDetail={goDetail}
            setPage={setPage}
          />
        )}
        {page === "compare" && (
          <ComparePage
            vehicles={vehicles.filter((v) => compareList.includes(v.id))}
            landedMap={landedMap}
            toggleCompare={toggleCompare}
            onClearAll={() => setCompareList([])}
            setPage={setPage}
          />
        )}
      </main>

      <Footer />
      <WhatsAppButton />
      <BottomNav
        page={page}
        setPage={setPage}
        favoritesCount={favorites.size}
        compareCount={compareList.length}
        onGoSearch={() => goSearch({})}
        onGoFavorites={() => goSearch({ favoritesOnly: true })}
        onGoCompare={() => setPage("compare")}
      />
    </div>
  );
}
