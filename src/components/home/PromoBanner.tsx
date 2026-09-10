"use client";

import { useEffect, useRef, useState } from "react";

// Cropped to a shared height (letterboxed with each design's own background
// color, never cropped) so the auto-slide never jumps in size between slides.
const BANNERS = [
  { src: "/promo-banner.png", alt: "Discount: import from Japan to Kenya, shop now" },
  { src: "/promo-banner-2.png", alt: "High quality Japanese cars, shop now" },
  { src: "/promo-banner-3.png", alt: "Import from Japan to Kenya, reliable shipping, safe and secure, fast delivery, best prices" },
];

const SLIDE_MS = 4500;

/**
 * Auto-sliding header banner (designed image slides, not built from CSS) on
 * desktop; static (first slide only, no timer) on mobile, where a slide
 * changing under a thumb mid-scroll reads as jumpy rather than lively.
 * Pauses on hover/touch, same interaction pattern already used by the
 * homepage's other carousels.
 */
export function PromoBanner({ onGoSearch }: { onGoSearch: () => void }) {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (BANNERS.length <= 1 || typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 640px)");
    if (!mq.matches) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % BANNERS.length);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div
        className="relative overflow-hidden"
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onTouchStart={() => (pausedRef.current = true)}
        onTouchEnd={() => (pausedRef.current = false)}
      >
        <button onClick={onGoSearch} className="block w-full relative aspect-[2172/395]" aria-label="Search vehicles">
          {BANNERS.map((b, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- small static banner assets, full-bleed width
            <img
              key={b.src}
              src={b.src}
              alt={b.alt}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
              style={{ opacity: i === index ? 1 : 0 }}
            />
          ))}
        </button>
      </div>
    </div>
  );
}
