"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import type { PublicVehicle } from "@/types/vehicle";

const SLIDE_MS = 4000;
const CARDS_PER_VIEW = 4;

/**
 * A dedicated strip for standout-value vehicles — distinct from
 * PromoShowcase's one-car-at-a-time hero, this reads as a classic "current
 * offers" rail: several deal cards visible at once, auto-advancing a page
 * at a time. No listing here actually carries a discount (nothing scraped
 * has real "was/now" pricing), so "offer" means the cheapest well-
 * photographed pick per body type instead of a fabricated markdown badge.
 */
export function OffersSlider({ vehicles, goDetail }: { vehicles: PublicVehicle[]; goDetail: (id: string) => void }) {
  const offers = useMemo(() => {
    const eligible = vehicles.filter((v) => v.eligible && v.imageUrl);
    const cheapestPerBodyType = new Map<string, PublicVehicle>();
    for (const v of eligible) {
      const current = cheapestPerBodyType.get(v.bodyType);
      if (!current || v.sellingPriceUsd < current.sellingPriceUsd) cheapestPerBodyType.set(v.bodyType, v);
    }
    return [...cheapestPerBodyType.values()].sort((a, b) => a.sellingPriceUsd - b.sellingPriceUsd).slice(0, 16);
  }, [vehicles]);

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
    <section className="py-10" style={{ background: `linear-gradient(135deg, ${COLORS.burgundy}, #7a1f34)` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Tag size={16} color={COLORS.goldLight} />
            <h2 className="text-lg sm:text-xl font-semibold text-white" style={{ fontFamily: FONT_DISPLAY }}>
              Current offers
            </h2>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => (p - 1 + pageCount) % pageCount)}
                aria-label="Previous offers"
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                <ChevronLeft size={16} color="#fff" />
              </button>
              <button
                onClick={() => setPage((p) => (p + 1) % pageCount)}
                aria-label="Next offers"
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                <ChevronRight size={16} color="#fff" />
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
              <div key={pageIdx} className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0 w-full">
                {offers.slice(pageIdx * CARDS_PER_VIEW, pageIdx * CARDS_PER_VIEW + CARDS_PER_VIEW).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => goDetail(v.id)}
                    className="bg-white rounded-xl overflow-hidden text-left group"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden" style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}>
                      <VehicleImage
                        src={v.imageUrl}
                        alt={`${v.year} ${v.make} ${v.model}`}
                        iconSize={28}
                        imgClassName="transition-transform duration-300 group-hover:scale-105"
                      />
                      <span
                        className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: COLORS.gold, color: COLORS.navyDeep }}
                      >
                        Best price · {v.bodyType}
                      </span>
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
