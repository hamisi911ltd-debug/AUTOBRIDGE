"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { COLORS, DEFAULT_FILTERS, FONT_BODY, type Filters } from "@/lib/constants";
import { computeLandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CompareBar } from "@/components/layout/CompareBar";
import { AIAssistant } from "@/components/assistant/AIAssistant";
import { HomePage } from "@/components/pages/HomePage";
import { SearchPage } from "@/components/pages/SearchPage";
import { DetailPage } from "@/components/pages/DetailPage";
import { ComparePage } from "@/components/pages/ComparePage";

export type Page = "home" | "search" | "detail" | "compare";

const FAVORITES_KEY = "autobridge:favorites";
const COMPARE_KEY = "autobridge:compare";

export function AutoBridgeApp({ vehicles }: { vehicles: PublicVehicle[] }) {
  const [page, setPage] = useState<Page>("home");
  const [fx, setFx] = useState(129);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [compareList, setCompareList] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

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
    <div style={{ fontFamily: FONT_BODY, background: COLORS.paper, minHeight: "100vh", color: COLORS.ink }} className="w-full">
      {bannerOpen && (
        <div className="text-xs text-center py-2 px-4 flex items-center justify-center gap-3" style={{ background: COLORS.gold, color: COLORS.navyDeep }}>
          <span>Kenya&apos;s import marketplace — the AI assistant runs locally against current listings.</span>
          <button onClick={() => setBannerOpen(false)}>
            <X size={13} />
          </button>
        </div>
      )}
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
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            compareList={compareList}
            toggleCompare={toggleCompare}
            goDetail={goDetail}
            goSearch={goSearch}
          />
        )}
        {page === "search" && (
          <SearchPage
            vehicles={vehicles}
            landedMap={landedMap}
            filters={filters}
            setFilters={setFilters}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            compareList={compareList}
            toggleCompare={toggleCompare}
            goDetail={goDetail}
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
            setPage={setPage}
          />
        )}
      </main>

      <Footer />
      {compareList.length > 0 && page !== "compare" && (
        <CompareBar count={compareList.length} onView={() => setPage("compare")} onClear={() => setCompareList([])} />
      )}
      <AIAssistant vehicles={vehicles} landedMap={landedMap} open={chatOpen} setOpen={setChatOpen} goDetail={goDetail} />
    </div>
  );
}
