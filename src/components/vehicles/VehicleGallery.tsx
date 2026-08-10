"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Car, ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS } from "@/lib/constants";

/**
 * Detail-page photo slideshow: a big main slide (with the same watermark
 * crop as VehicleCard's single-photo VehicleImage), arrow + dot navigation,
 * a clickable thumbnail strip, and gentle auto-advance that pauses on
 * hover/touch — mirrors the interaction pattern already used by the
 * homepage's PromoShowcase carousel. Falls back to a single placeholder
 * icon when a vehicle has no photos at all.
 */
export function VehicleGallery({ images, alt, overlay }: { images: string[]; alt: string; overlay?: ReactNode }) {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);

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
        className="h-72 sm:h-96 rounded-2xl flex items-center justify-center relative mb-6 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}
      >
        <Car size={96} color={COLORS.goldLight} strokeWidth={1.2} />
        {overlay}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div
        className="h-72 sm:h-96 rounded-2xl relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onTouchStart={() => (pausedRef.current = true)}
        onTouchEnd={() => (pausedRef.current = false)}
      >
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- external R2 CDN
          <img
            key={src}
            src={src}
            alt={`${alt} — photo ${i + 1} of ${images.length}`}
            loading={i === 0 ? "eager" : "lazy"}
            className="absolute inset-x-0 top-0 w-full object-cover transition-opacity duration-300"
            style={{ height: "116%", opacity: i === index ? 1 : 0, pointerEvents: i === index ? "auto" : "none" }}
          />
        ))}

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

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
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
                outline: i === index ? `2px solid ${COLORS.gold}` : `1px solid ${COLORS.line}`,
                outlineOffset: "-1px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external R2 CDN */}
              <img src={src} alt="" className="absolute inset-x-0 top-0 w-full object-cover" style={{ height: "116%" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
