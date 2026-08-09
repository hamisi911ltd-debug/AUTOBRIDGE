"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import type { PublicVehicle } from "@/types/vehicle";

/**
 * The top-of-page advertising strip — real inventory photos front and
 * centre, badge vehicles first, no search chrome. Search lives in the
 * header nav and the browse grids below; this section's only job is to
 * sell the cars.
 */
export function PromoShowcase({
  vehicles,
  goDetail,
}: {
  vehicles: PublicVehicle[];
  goDetail: (id: string) => void;
}) {
  const featured = useMemo(() => {
    // Only the sharpest available photos go in the hero slides — this CDN
    // reliably serves 1200px+ images, so a car actually looks good full-bleed
    // at this size instead of a soft, upscaled thumbnail.
    const sharp = vehicles.filter((v) => v.eligible && v.imageUrl && v.hqImage);
    const pool = sharp.length >= 8 ? sharp : vehicles.filter((v) => v.eligible && v.imageUrl);
    const badged = pool.filter((v) => v.badge);
    const rest = pool.filter((v) => !v.badge).sort((a, b) => b.sellingPriceUsd - a.sellingPriceUsd);
    return [...badged, ...rest].slice(0, 12);
  }, [vehicles]);

  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || featured.length === 0) return;

    const id = setInterval(() => {
      if (pausedRef.current) return;
      const cardWidth = track.firstElementChild?.clientWidth ?? 0;
      const gap = 16; // matches gap-4
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      track.scrollBy({ left: atEnd ? -track.scrollLeft : cardWidth + gap, behavior: "smooth" });
    }, 3200);

    return () => clearInterval(id);
  }, [featured.length]);

  if (featured.length === 0) return null;

  return (
    <section className="py-10 sm:py-12" style={{ background: `linear-gradient(180deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: COLORS.goldLight }}>
              On the lot right now
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white" style={{ fontFamily: FONT_DISPLAY }}>
              Real cars, real photos, ready to import
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div
          ref={trackRef}
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
          onTouchStart={() => (pausedRef.current = true)}
          onTouchEnd={() => (pausedRef.current = false)}
          className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-pl-4 sm:scroll-pl-6"
          style={{ scrollbarWidth: "thin" }}
        >
          {featured.map((v) => (
            <button
              key={v.id}
              onClick={() => goDetail(v.id)}
              className="relative shrink-0 w-44 sm:w-52 h-56 sm:h-64 rounded-2xl overflow-hidden snap-start text-left group"
            >
              <VehicleImage
                src={v.imageUrl}
                alt={`${v.year} ${v.make} ${v.model}`}
                iconSize={32}
                imgClassName="transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(7,21,39,0) 40%, rgba(7,21,39,0.92) 100%)" }} />
              {v.badge && (
                <span
                  className="absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: COLORS.gold, color: COLORS.navyDeep }}
                >
                  {v.badge}
                </span>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="text-white text-sm font-semibold leading-snug truncate" style={{ fontFamily: FONT_DISPLAY }}>
                  {v.year} {v.make} {v.model}
                </div>
                <div className="text-[11px] mb-1.5 truncate" style={{ color: "#B9C2D4" }}>
                  {v.trim}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: COLORS.goldLight, fontFamily: FONT_DISPLAY }}>
                    {formatUsd(v.sellingPriceUsd)}
                  </span>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
                    <ChevronRight size={13} color="#fff" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
