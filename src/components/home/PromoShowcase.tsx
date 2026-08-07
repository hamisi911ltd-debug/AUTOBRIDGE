"use client";

import { useMemo } from "react";
import { Car, ChevronRight } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
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
    const eligible = vehicles.filter((v) => v.eligible && v.imageUrl);
    const badged = eligible.filter((v) => v.badge);
    const rest = eligible.filter((v) => !v.badge).sort((a, b) => b.sellingPriceUsd - a.sellingPriceUsd);
    return [...badged, ...rest].slice(0, 12);
  }, [vehicles]);

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
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-pl-4 sm:scroll-pl-6" style={{ scrollbarWidth: "thin" }}>
          {featured.map((v) => (
            <button
              key={v.id}
              onClick={() => goDetail(v.id)}
              className="relative shrink-0 w-64 sm:w-72 h-80 sm:h-96 rounded-2xl overflow-hidden snap-start text-left group"
            >
              {v.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external CDN, many hosts
                <img
                  src={v.imageUrl}
                  alt={`${v.year} ${v.make} ${v.model}`}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: COLORS.card }}>
                  <Car size={40} color={COLORS.slate} />
                </div>
              )}
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(7,21,39,0) 40%, rgba(7,21,39,0.92) 100%)" }} />
              {v.badge && (
                <span
                  className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: COLORS.gold, color: COLORS.navyDeep }}
                >
                  {v.badge}
                </span>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="text-white font-semibold leading-snug" style={{ fontFamily: FONT_DISPLAY }}>
                  {v.year} {v.make} {v.model}
                </div>
                <div className="text-xs mb-2" style={{ color: "#B9C2D4" }}>
                  {v.trim}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold" style={{ color: COLORS.goldLight, fontFamily: FONT_DISPLAY }}>
                    {formatUsd(v.sellingPriceUsd)}
                  </span>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                    <ChevronRight size={16} color="#fff" />
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
