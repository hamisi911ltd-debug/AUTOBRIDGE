"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import type { PublicVehicle } from "@/types/vehicle";

const SLIDE_MS = 5000;

/**
 * The top-of-page advertising strip — one full-bleed photo at a time,
 * auto-advancing like a real dealership's hero banner, rather than a strip
 * of small cards. Badge vehicles first, no search chrome here; search lives
 * in the header nav and the browse grids below — this section's only job is
 * to sell the cars.
 */
export function PromoShowcase({
  vehicles,
  goDetail,
}: {
  vehicles: PublicVehicle[];
  goDetail: (id: string) => void;
}) {
  const featured = useMemo(() => {
    // Only vehicles with a real photo gallery go in the hero — this is the
    // one place on the site where a soft, upscaled thumbnail would be most
    // visible, so it's worth being selective.
    const sharp = vehicles.filter((v) => v.eligible && v.imageUrl && v.hqImage);
    const pool = sharp.length >= 6 ? sharp : vehicles.filter((v) => v.eligible && v.imageUrl);
    const badged = pool.filter((v) => v.badge);
    const rest = pool.filter((v) => !v.badge).sort((a, b) => b.sellingPriceUsd - a.sellingPriceUsd);
    return [...badged, ...rest].slice(0, 10);
  }, [vehicles]);

  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (featured.length <= 1) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % featured.length);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [featured.length]);

  if (featured.length === 0) return null;

  const current = featured[index];

  return (
    <section className="relative" style={{ background: COLORS.navyDeep }}>
      <div
        className="relative h-72 sm:h-[380px] overflow-hidden"
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onTouchStart={() => (pausedRef.current = true)}
        onTouchEnd={() => (pausedRef.current = false)}
      >
        {featured.map((v, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- external R2 CDN
          <img
            key={v.id}
            src={v.imageUrl!}
            alt={`${v.year} ${v.make} ${v.model}`}
            loading={i === 0 ? "eager" : "lazy"}
            className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700"
            style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? "auto" : "none" }}
          />
        ))}

        {/* A light scrim only at the very bottom, just enough to keep the
            caption readable where it happens to sit over the photo — the
            image itself shows whole and un-zoomed (object-contain) rather
            than filling the frame by cropping into it. */}
        <div className="absolute inset-x-0 bottom-0 h-28" style={{ background: "linear-gradient(0deg, rgba(7,21,39,0.85) 0%, rgba(7,21,39,0) 100%)" }} />

        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col justify-end pb-6 sm:pb-8">
          <div className="text-xs font-semibold tracking-wide uppercase mb-2" style={{ color: COLORS.goldLight }}>
            On the lot right now
          </div>
          {current.badge && (
            <span
              className="inline-block w-fit text-[11px] font-semibold px-2.5 py-1 rounded-full mb-3"
              style={{ background: COLORS.gold, color: COLORS.navyDeep }}
            >
              {current.badge}
            </span>
          )}
          <h1 className="text-2xl sm:text-4xl font-semibold text-white max-w-2xl" style={{ fontFamily: FONT_DISPLAY }}>
            {current.year} {current.make} {current.model}
          </h1>
          <p className="text-sm mt-2 flex items-center gap-3 flex-wrap" style={{ color: "#C6CEDD" }}>
            <span>{current.trim}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} /> Sourced from {current.sourceCountry}
            </span>
          </p>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-2xl sm:text-3xl font-bold" style={{ color: COLORS.goldLight, fontFamily: FONT_DISPLAY }}>
              {formatUsd(current.sellingPriceUsd)}
            </span>
            <button
              onClick={() => goDetail(current.id)}
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-white"
              style={{ background: COLORS.burgundy }}
            >
              View details
            </button>
          </div>
        </div>

        {featured.length > 1 && (
          <>
            <button
              onClick={() => setIndex((i) => (i - 1 + featured.length) % featured.length)}
              aria-label="Previous vehicle"
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(7,21,39,0.55)", backdropFilter: "blur(2px)" }}
            >
              <ChevronLeft size={20} color="#fff" />
            </button>
            <button
              onClick={() => setIndex((i) => (i + 1) % featured.length)}
              aria-label="Next vehicle"
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(7,21,39,0.55)", backdropFilter: "blur(2px)" }}
            >
              <ChevronRight size={20} color="#fff" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {featured.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="rounded-full transition-all"
                  style={{ width: i === index ? 20 : 6, height: 6, background: i === index ? COLORS.goldLight : "rgba(255,255,255,0.5)" }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
