"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Ship, Sparkles } from "lucide-react";
import { FONT_DISPLAY } from "@/lib/constants";

// Built from CSS (gradient + icon + text), not designed image assets — the
// image slides this replaced came in at whatever aspect ratio the PNGs
// actually were, which rendered far taller than intended; a fixed height
// here can never blow up vertically regardless of content or screen width.
const SLIDES = [
  { icon: Sparkles, headline: "Import from Japan, at a discount", sub: "Shop the catalogue now" },
  { icon: ShieldCheck, headline: "High-quality Japanese cars", sub: "Every listing, real and import-eligible" },
  { icon: Ship, headline: "Reliable shipping to Mombasa", sub: "Safe, secure, on time" },
];

const SLIDE_MS = 4500;
const GRADIENT = "linear-gradient(90deg, #F2762E 0%, #D6336C 55%, #3B1F63 100%)";

/**
 * Auto-sliding header banner — a short strip of rotating one-line offers,
 * not a full-bleed image. Fixed, small height on every screen size (h-11 on
 * mobile up to h-14 on desktop) so it never dominates the top of the page.
 * Pauses on hover/touch, same interaction pattern as the homepage's other
 * carousels.
 */
export function PromoBanner({ onGoSearch }: { onGoSearch: () => void }) {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (SLIDES.length <= 1) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % SLIDES.length);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <button
      onClick={onGoSearch}
      aria-label="Search vehicles"
      className="block w-full relative h-11 sm:h-12 lg:h-14 overflow-hidden"
      style={{ background: GRADIENT }}
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onTouchStart={() => (pausedRef.current = true)}
      onTouchEnd={() => (pausedRef.current = false)}
    >
      {SLIDES.map((s, i) => {
        const Icon = s.icon;
        return (
          <div
            key={s.headline}
            className="absolute inset-0 flex items-center justify-center gap-2 sm:gap-2.5 px-3 transition-opacity duration-700"
            style={{ opacity: i === index ? 1 : 0 }}
          >
            <Icon size={15} className="text-white/90 shrink-0" />
            <span className="text-[11px] sm:text-[13px] font-bold text-white truncate" style={{ fontFamily: FONT_DISPLAY }}>
              {s.headline}
            </span>
            <span className="hidden sm:inline text-[11px] text-white/80 truncate">· {s.sub}</span>
          </div>
        );
      })}
      <div className="absolute bottom-1 inset-x-0 flex items-center justify-center gap-1">
        {SLIDES.map((_, i) => (
          <span
            key={i}
            className="rounded-full transition-all"
            style={{ width: i === index ? 10 : 4, height: 3, background: i === index ? "#fff" : "rgba(255,255,255,0.4)" }}
          />
        ))}
      </div>
    </button>
  );
}

