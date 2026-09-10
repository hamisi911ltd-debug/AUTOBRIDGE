"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Car, ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS } from "@/lib/constants";
import { getVisibleImageIndices } from "@/lib/carousel";

/**
 * Detail-page photo slideshow: a big main slide, arrow + dot navigation, a
 * clickable thumbnail strip, and gentle auto-advance that pauses on
 * hover/touch — mirrors the interaction pattern already used by the
 * homepage's PromoShowcase carousel. Falls back to a single placeholder
 * icon when a vehicle has no photos at all. `images` should only ever be
 * this exact vehicle's own real photos (other angles/features) — never
 * photos borrowed from a similar unit, which would misrepresent the car a
 * visitor is about to enquire about.
 */
export function VehicleGallery({
  images,
  alt,
  overlay,
  year,
  country,
}: {
  images: string[];
  alt: string;
  overlay?: ReactNode;
  /** Shown as a thin banner along the bottom of the main photo, doubling as
   * cover for the source site's watermark logo that tends to sit there. */
  year?: number;
  country?: string;
}) {
  const [index, setIndex] = useState(0);
  const [loadedIdx, setLoadedIdx] = useState<Set<number>>(() => new Set());
  const pausedRef = useRef(false);
  const visibleIndices = useMemo(() => getVisibleImageIndices(images.length, index, 1), [images.length, index]);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % images.length);
    }, 4500);
    return () => clearInterval(id);
  }, [images.length]);

  // Reset to the first slide if the photo set itself changes (navigating
  // between vehicles reuses this component instance).
  useEffect(() => setIndex(0), [images]);

  if (images.length === 0) {
    return (
      <div
        className="aspect-[4/3] max-h-[420px] rounded-2xl flex flex-col items-center justify-center gap-3 relative mb-6 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}
      >
        <div
          className="rounded-full flex items-center justify-center"
          style={{ width: 176, height: 176, background: "rgba(255,255,255,0.06)" }}
        >
          <Car size={96} color={COLORS.goldLight} strokeWidth={1.2} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: COLORS.goldLight }}>
            Photo unavailable
          </p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(220,227,236,0.75)" }}>
            A photo isn&apos;t linked to this exact unit — every other detail below is real.
          </p>
        </div>
        {overlay}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div
        className="aspect-[4/3] max-h-[420px] rounded-2xl relative overflow-hidden shadow-xl"
        style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onTouchStart={() => (pausedRef.current = true)}
        onTouchEnd={() => (pausedRef.current = false)}
      >
        {index < images.length && !loadedIdx.has(index) && <div className="absolute inset-0 img-shimmer" />}
        {visibleIndices.map((i) => (
          // object-cover, no letterbox gaps — the aspect-[4/3] box above
          // already closely matches typical car-listing photos, so this
          // only crops a sliver off the edges.
          // eslint-disable-next-line @next/next/no-img-element -- external R2 CDN
          <img
            key={`${images[i]}-${i}`}
            src={images[i]}
            alt={`${alt} — photo ${i + 1} of ${images.length}`}
            loading={i === index ? "eager" : "lazy"}
            fetchPriority={i === index ? "high" : "auto"}
            decoding="async"
            onLoad={() => setLoadedIdx((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? "auto" : "none" }}
          />
        ))}
        {(year || country) && (
          <div className="absolute bottom-0 inset-x-0 h-6 sm:h-7 bg-white/95 flex items-center justify-center gap-1 z-10">
            <span className="text-[11px] sm:text-xs font-bold" style={{ color: "#F2762E" }}>
              {year}
              {year && country ? " · " : ""}
              {country}
            </span>
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(7,21,39,0.55)", backdropFilter: "blur(2px)" }}
            >
              <ChevronLeft size={18} color="#fff" />
            </button>
            <button
              onClick={() => setIndex((i) => (i + 1) % images.length)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(7,21,39,0.55)", backdropFilter: "blur(2px)" }}
            >
              <ChevronRight size={18} color="#fff" />
            </button>

            <div className="absolute bottom-9 sm:bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to photo ${i + 1}`}
                  className="rounded-full transition-all"
                  style={{
                    width: i === index ? 16 : 6,
                    height: 6,
                    background: i === index ? COLORS.goldLight : "rgba(255,255,255,0.5)",
                  }}
                />
              ))}
            </div>
          </>
        )}

        {overlay}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setIndex(i)}
              className="relative shrink-0 w-16 h-12 rounded-lg overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})`,
                outline: i === index ? `2px solid ${COLORS.gold}` : `1px solid ${COLORS.line}`,
                outlineOffset: "-1px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external R2 CDN */}
              <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
