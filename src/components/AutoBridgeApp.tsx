"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COLORS, DEFAULT_FILTERS, FONT_BODY, type Filters } from "@/lib/constants";
import { computeLandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import type { PublicReview } from "@/types/review";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { ConsentGate } from "@/components/layout/ConsentGate";
import { HomePage } from "@/components/pages/HomePage";
import { SearchPage } from "@/components/pages/SearchPage";
import { DetailPage } from "@/components/pages/DetailPage";
import { InvoicePage } from "@/components/pages/InvoicePage";
import { CartPage } from "@/components/pages/CartPage";
import { CartProvider } from "@/lib/cartContext";

export type Page = "home" | "search" | "detail" | "quote" | "cart";

// Bumped to v2 to start every visitor fresh (a one-off reset, requested
// directly) - old data under the v1 keys is simply never read again.
const FAVORITES_KEY = "ferbil:favorites:v2";
const CART_KEY = "ferbil:cart:v1";

export function AutoBridgeApp({
  initialVehicles,
  reviews,
  totalCount,
}: {
  initialVehicles: PublicVehicle[];
  reviews: PublicReview[];
  totalCount: number;
}) {
  const [page, setPage] = useState<Page>("home");
  // Kept only to derive landed.freight / landed.insurance (both USD, so the
  // rate is irrelevant); the site shows USD, no KES conversion anymore.
  const fx = 1;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [cart, setCart] = useState<Set<string>>(() => new Set());
  const [quoteVehicleId, setQuoteVehicleId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // The home page only gets a recent-first slice of the catalogue (see
  // src/app/page.tsx) so the initial payload stays small. Search needs the
  // real, unbounded inventory to answer correctly, so this swaps in the
  // full list - fetched once, lazily - the first time it's actually opened,
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
        // Leave the bounded initial set in place - Search/Ferbot still work,
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
      const savedCart = localStorage.getItem(CART_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedCart) setCart(new Set(JSON.parse(savedCart)));
    } catch {
      // localStorage unavailable - favorites/cart just stay session-only
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify([...cart]));
  }, [cart]);

  useEffect(() => {
    // Also keyed on selectedId - clicking a "similar vehicles" card at the
    // bottom of a detail page calls goDetail() without changing `page`
    // (it's already "detail"), so scrolling only on `page` changing left
    // the browser sitting wherever the click happened instead of jumping
    // to the newly-selected car's own photo/details at the top.
    window.scrollTo({ top: 0 });
  }, [page, selectedId]);

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
  function toggleCart(id: string) {
    setCart((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function goDetail(id: string) {
    setSelectedId(id);
    setPage("detail");
  }
  function goCart() {
    setPage("cart");
  }
  function goSearch(patch: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage("search");
  }
  function goQuote(id?: string) {
    setQuoteVehicleId(id ?? null);
    setPage("quote");
  }

  // In-app back navigation - this SPA has no real browser routes (every
  // "page" is just this one component's own state), so the browser's own
  // back button can't help. Tracks a simple history stack instead: whenever
  // `page` actually changes, the previous value gets pushed here first, so
  // goBack can pop it and return there directly.
  const pageHistoryRef = useRef<Page[]>([]);
  const prevPageRef = useRef<Page>("home");
  useEffect(() => {
    if (page !== prevPageRef.current) {
      pageHistoryRef.current.push(prevPageRef.current);
      prevPageRef.current = page;
    }
  }, [page]);
  const [canGoBack, setCanGoBack] = useState(false);
  useEffect(() => {
    setCanGoBack(pageHistoryRef.current.length > 0);
  }, [page]);

  function goBack() {
    const prev = pageHistoryRef.current.pop();
    if (!prev) return;
    prevPageRef.current = prev;
    setPage(prev);
    setCanGoBack(pageHistoryRef.current.length > 0);
  }

  const selectedVehicle = vehicles.find((v) => v.id === selectedId) || null;

  return (
    <CartProvider value={{ cart, toggleCart }}>
    <div
      style={{ fontFamily: FONT_BODY, background: COLORS.paper, minHeight: "100vh", color: COLORS.ink }}
      className="w-full flex flex-col"
    >
      <ConsentGate />

      {/* Only the header itself stays pinned while the page scrolls. Page
         content below it needs exactly its real rendered height reserved
         above it, but that varies slightly by viewport - rather than
         measuring it in JS (which leaves a gap between SSR's first paint and
         the post-hydration correction, during which the fixed header covers
         the top of the page), an identical, invisible copy is rendered in
         normal document flow right below it. The browser's own layout
         engine gives that copy the exact same height as the fixed one for
         free, on the very first paint, with no JS and no guessing. */}
      <div className="fixed top-0 inset-x-0 z-30">
        <Header
          setPage={setPage}
          cartCount={cart.size}
          onGoSearch={() => goSearch({})}
          onGoQuote={() => goQuote()}
          onGoCart={goCart}
          totalCount={totalCount}
        />
      </div>
      <div aria-hidden className="invisible">
        <Header
          setPage={setPage}
          cartCount={cart.size}
          onGoSearch={() => {}}
          onGoQuote={() => {}}
          onGoCart={() => {}}
          totalCount={totalCount}
        />
      </div>

      <main className="flex-1">
        {page === "home" && (
          <HomePage
            vehicles={vehicles}
            landedMap={landedMap}
            filters={filters}
            favorites={favorites}
            goDetail={goDetail}
            goSearch={goSearch}
            reviews={reviews}
            canGoBack={canGoBack}
            onBack={goBack}
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
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            vehicles={vehicles}
            goDetail={goDetail}
            setPage={setPage}
            goQuote={() => goQuote(selectedVehicle.id)}
          />
        )}
        {page === "quote" && (
          <InvoicePage vehicles={vehicles} landedMap={landedMap} preselectedId={quoteVehicleId} goDetail={goDetail} />
        )}
        {page === "cart" && <CartPage vehicles={vehicles} landedMap={landedMap} goDetail={goDetail} goQuote={goQuote} goSearch={goSearch} />}
      </main>

      <Footer setPage={setPage} onGoSearch={() => goSearch({})} onGoQuote={() => goQuote()} />
      <WhatsAppButton />
      <BottomNav page={page} setPage={setPage} onGoSearch={() => goSearch({})} onGoQuote={() => goQuote()} />
    </div>
    </CartProvider>
  );
}
