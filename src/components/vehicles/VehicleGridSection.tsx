"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import type { PublicVehicle } from "@/types/vehicle";
import { VehicleCard } from "@/components/vehicles/VehicleCard";

const CARDS_PER_VIEW = 24; // LCM of 3/4/6 — the grid runs 3-across on mobile, 4-across from sm:, 6-across from lg:, so a page always fills evenly at every size
const SLIDE_MS = 4200;

/** Auto-advancing, as many cards per page as the viewport allows — same sliding-page pattern as the homepage's "Current offers" rail. */
export function VehicleGridSection({
  title,
  subtitle,
  vehicles,
  goDetail,
  onViewAll,
}: {
  title: string;
  subtitle?: string;
  vehicles: PublicVehicle[];
  goDetail: (id: string) => void;
  onViewAll?: () => void;
}) {
  const pageCount = Math.max(1, Math.ceil(vehicles.length / CARDS_PER_VIEW));
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

  if (vehicles.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-14">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm mt-1" style={{ color: COLORS.slate }}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onViewAll && (
            <button onClick={onViewAll} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: COLORS.burgundy }}>
              View all vehicles <ChevronRight size={15} />
            </button>
          )}
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => (p - 1 + pageCount) % pageCount)}
                aria-label="Previous"
                className="w-8 h-8 rounded-full border flex items-center justify-center"
                style={{ borderColor: COLORS.line }}
              >
                <ChevronLeft size={16} color={COLORS.navy} />
              </button>
              <button
                onClick={() => setPage((p) => (p + 1) % pageCount)}
                aria-label="Next"
                className="w-8 h-8 rounded-full border flex items-center justify-center"
                style={{ borderColor: COLORS.line }}
              >
                <ChevronRight size={16} color={COLORS.navy} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className="overflow-hidden"
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onTouchStart={() => (pausedRef.current = true)}
        onTouchEnd={() => (pausedRef.current = false)}
      >
        <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${page * 100}%)` }}>
          {Array.from({ length: pageCount }, (_, pageIdx) => (
            <div key={pageIdx} className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-5 shrink-0 w-full">
              {vehicles.slice(pageIdx * CARDS_PER_VIEW, pageIdx * CARDS_PER_VIEW + CARDS_PER_VIEW).map((v) => (
                <VehicleCard key={v.id} vehicle={v} onView={() => goDetail(v.id)} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
