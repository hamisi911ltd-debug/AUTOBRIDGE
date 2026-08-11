"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS, FONT_DISPLAY, HOW_IT_WORKS, FAQS } from "@/lib/constants";

const SLIDE_MS = 3500;

// How-it-works steps, the "why us" trust points and the FAQ answers are all
// real, useful information — just not the site's core job (finding a car),
// so they're condensed into one small auto-sliding strip instead of five
// separate full-width sections a visitor has to scroll past.
const WHY_US_POINTS = [
  { title: "Transparent from the start", text: "Every listing shows the full landed cost, duty, VAT and shipping included, before you enquire." },
  { title: "KRA-aligned estimates", text: "Our calculator follows the same duty, excise and VAT structure KRA applies at Mombasa." },
  { title: "End-to-end handling", text: "We coordinate purchase, freight, clearing and NTSA registration so you don't have to." },
];

const SLIDES = [
  ...HOW_IT_WORKS.map((s, i) => ({ tag: `Step ${i + 1}`, title: s.title, text: s.text })),
  ...WHY_US_POINTS.map((p) => ({ tag: "Why AutoBridge", title: p.title, text: p.text })),
  ...FAQS.map((f) => ({ tag: "FAQ", title: f.q, text: f.a })),
];

export function SmallAdvertsSlider() {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % SLIDES.length);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, []);

  const slide = SLIDES[index];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div
        className="relative rounded-2xl border px-5 py-4 sm:px-6 flex items-center gap-4"
        style={{ borderColor: COLORS.line, background: COLORS.card }}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
      >
        <button
          onClick={() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
          aria-label="Previous"
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center border"
          style={{ borderColor: COLORS.line }}
        >
          <ChevronLeft size={14} color={COLORS.navy} />
        </button>

        <div className="flex-1 min-w-0">
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: COLORS.gold, color: COLORS.navyDeep }}
          >
            {slide.tag}
          </span>
          <div className="text-sm font-semibold mt-1.5 truncate" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            {slide.title}
          </div>
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: COLORS.slate }}>
            {slide.text}
          </p>
        </div>

        <button
          onClick={() => setIndex((i) => (i + 1) % SLIDES.length)}
          aria-label="Next"
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center border"
          style={{ borderColor: COLORS.line }}
        >
          <ChevronRight size={14} color={COLORS.navy} />
        </button>
      </div>
    </section>
  );
}
