"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import type { PublicVehicle } from "@/types/vehicle";

const SLIDE_MS = 4000;
const CARDS_PER_VIEW = 12; // LCM of 3 and 4 — the grid runs 3-across on mobile, 4-across from sm: up, so a page always fills both evenly
const MAX_OFFERS = 60;

/**
 * A dedicated strip for standout-value vehicles — distinct from
 * PromoShowcase's one-car-at-a-time hero, this reads as a classic "current
 * offers" rail: several deal cards visible at once, auto-advancing a page
 * at a time. No listing here actually carries a discount (nothing scraped
 * has real "was/now" pricing), so "offer" means the cheapest well-
 * photographed pick per make+model instead of a fabricated markdown badge —
 * deliberately per-model (not per body type, which caps out around 7 cards
 * no matter how big the catalogue gets) so this rail can actually grow with
 * the inventory. The catalogue has far more distinct models than fit in
 * MAX_OFFERS, so instead of always showing the same globally-cheapest set,
 * a random sample is drawn from a generous good-value pool (3x the display
 * count) — a page refresh surfaces a different lineup rather than the
 * identical one every visit, while still skewing toward the better deals
 * rather than being fully random.
 */
function pickOffers(vehicles: PublicVehicle[], randomize: boolean): PublicVehicle[] {
  // Each tile pitches one specific car's own price and photo — a stand-in
  // photo borrowed from a different unit doesn't belong in a deals rail.
  const eligible = vehicles.filter((v) => v.eligible && v.imageUrl && !v.isRepresentativePhoto);
  const cheapestPerModel = new Map<string, PublicVehicle>();
  for (const v of eligible) {
    const key = `${v.make} ${v.model}`;
    const current = cheapestPerModel.get(key);
    if (!current || v.sellingPriceUsd < current.sellingPriceUsd) cheapestPerModel.set(key, v);
  }
  const sorted = [...cheapestPerModel.values()].sort((a, b) => a.sellingPriceUsd - b.sellingPriceUsd);
  if (!randomize) return sorted.slice(0, MAX_OFFERS);

  const pool = sorted.slice(0, MAX_OFFERS * 3);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, MAX_OFFERS).sort((a, b) => a.sellingPriceUsd - b.sellingPriceUsd);
}

export function OffersSlider({ vehicles, goDetail }: { vehicles: PublicVehicle[]; goDetail: (id: string) => void }) {
  // Deterministic on the very first render (server and client must match to
  // avoid a hydration mismatch), then reshuffled once on the client right
  // after mount — that reshuffle is what makes each page load look
  // different, without touching Math.random() during SSR.
  const [offers, setOffers] = useState(() => pickOffers(vehicles, false));
  useEffect(() => {
    setOffers(pickOffers(vehicles, true));
    // Deliberately mount-only — re-shuffling every time `vehicles` merely
    // gets a fresh reference (same data) would visibly reorder the rail
    // mid-browse, which reads as a glitch rather than a refresh-only effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageCount = Math.max(1, Math.ceil(offers.length / CARDS_PER_VIEW));
  const [page, setPage] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (pageCount <= 1) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setPage((p) => (p + 1) % pageCount);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [pageCount]);

  if (offers.length === 0) return null;

  return (
    <section className="py-5 sm:py-10" style={{ background: COLORS.paper }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Tag size={16} color={COLORS.burgundy} />
            <h2 className="text-lg sm:text-xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
              Current offers
            </h2>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => (p - 1 + pageCount) % pageCount)}
                aria-label="Previous offers"
                className="w-8 h-8 rounded-full border flex items-center justify-center"
                style={{ borderColor: COLORS.line }}
              >
                <ChevronLeft size={16} color={COLORS.navy} />
              </button>
              <button
                onClick={() => setPage((p) => (p + 1) % pageCount)}
                aria-label="Next offers"
                className="w-8 h-8 rounded-full border flex items-center justify-center"
                style={{ borderColor: COLORS.line }}
              >
                <ChevronRight size={16} color={COLORS.navy} />
              </button>
            </div>
          )}
        </div>

        <div
          className="overflow-hidden"
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
          onTouchStart={() => (pausedRef.current = true)}
          onTouchEnd={() => (pausedRef.current = false)}
        >
          <div
            className="flex transition-transform duration-500"
            style={{ transform: `translateX(-${page * 100}%)` }}
          >
            {Array.from({ length: pageCount }, (_, pageIdx) => (
              <div key={pageIdx} className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-4 shrink-0 w-full">
                {offers.slice(pageIdx * CARDS_PER_VIEW, pageIdx * CARDS_PER_VIEW + CARDS_PER_VIEW).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => goDetail(v.id)}
                    className="bg-white rounded-xl overflow-hidden text-left group border"
                    style={{ borderColor: COLORS.line }}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden" style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}>
                      <VehicleImage
                        src={v.imageUrl}
                        alt={`${v.year} ${v.make} ${v.model}`}
                        iconSize={28}
                        imgClassName="transition-transform duration-300 group-hover:scale-105"
                        banner={{ year: v.year, country: v.sourceCountry }}
                      />
                    </div>
                    <div className="p-2.5">
                      <div className="text-xs font-semibold truncate" style={{ color: COLORS.navy }}>
                        {v.year} {v.make} {v.model}
                      </div>
                      <div className="text-sm font-bold mt-0.5" style={{ color: COLORS.burgundy, fontFamily: FONT_DISPLAY }}>
                        {formatUsd(v.sellingPriceUsd)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
