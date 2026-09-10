"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Ship, ShieldCheck, Truck } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";

const ORANGE = "#F2782E";
const SLIDE_MS = 3800;

// Four real stages, four real photos. Shown one at a time with a cross-fade
// + rise-in on the caption, not a static 4-up grid — each stage gets a real
// moment on screen instead of competing for attention all at once.
const STEPS = [
  {
    icon: Search,
    label: "1. Choose your car",
    text: "Filter by budget, body type or lifestyle and see the full landed cost — not just the sticker price.",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/2011_Toyota_Land_Cruiser_%28UZJ200R%29_Sahara_wagon_%282011-11-18%29_01.jpg/960px-2011_Toyota_Land_Cruiser_%28UZJ200R%29_Sahara_wagon_%282011-11-18%29_01.jpg",
  },
  {
    icon: Ship,
    label: "2. We ship it",
    text: "Once reserved, we handle payment to the exporter, export inspection and ocean freight to Mombasa.",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/YANG_MING_Container_Ship_in_the_mediterranean_sea_towards_the_Suez_Canal.jpg/960px-YANG_MING_Container_Ship_in_the_mediterranean_sea_towards_the_Suez_Canal.jpg",
  },
  {
    icon: ShieldCheck,
    label: "3. Cleared at Mombasa",
    text: "Our clearing agents handle KRA duty, port charges and NTSA paperwork on your behalf.",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/A_general_view_of_Mombasa_Port_on_Kenya%27s_Indian_Ocean_coast.jpg/960px-A_general_view_of_Mombasa_Port_on_Kenya%27s_Indian_Ocean_coast.jpg",
  },
  {
    icon: Truck,
    label: "4. Delivered to you",
    text: "Your car arrives registered and ready to drive, anywhere in Kenya.",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/2018_Honda_CR-V_%28RW_MY18%29_%2BSport_2WD_wagon_%282018-10-22%29_01.jpg/960px-2018_Honda_CR-V_%28RW_MY18%29_%2BSport_2WD_wagon_%282018-10-22%29_01.jpg",
  },
];

export function SmallAdvertsSlider() {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % STEPS.length);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, []);

  const step = STEPS[index];
  const Icon = step.icon;

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <style>{`
        @keyframes captionIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="text-center mb-6">
        <div className="w-10 h-1 rounded-full mb-3 mx-auto" style={{ background: ORANGE }} />
        <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          From selection to your driveway
        </h2>
        <p className="text-sm mt-2 max-w-xl mx-auto" style={{ color: COLORS.slate }}>
          The same four-stage process behind every listing on this site.
        </p>
      </div>

      <div
        className="relative max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-lg aspect-[16/10] sm:aspect-[16/9]"
        style={{ background: "#111" }}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onTouchStart={() => (pausedRef.current = true)}
        onTouchEnd={() => (pausedRef.current = false)}
      >
        {STEPS.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- external Wikimedia Commons CDN
          <img
            key={s.label}
            src={s.image}
            alt={s.label}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === index ? 1 : 0 }}
          />
        ))}
        <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.05) 55%, transparent 100%)" }} />

        <div key={step.label} className="absolute inset-x-0 bottom-0 p-4 sm:p-7" style={{ animation: "captionIn 0.55s ease-out both" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-extrabold text-white shrink-0"
              style={{ background: ORANGE, fontFamily: FONT_DISPLAY }}
            >
              {index + 1}
            </span>
            <Icon size={16} color="#fff" />
            <span className="text-sm sm:text-base font-bold text-white">{step.label.replace(/^\d+\.\s*/, "")}</span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed max-w-md" style={{ color: "rgba(255,255,255,0.85)" }}>
            {step.text}
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-1.5 mt-4">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Show step ${i + 1}`}
            className="rounded-full transition-all"
            style={{ width: i === index ? 18 : 6, height: 6, background: i === index ? ORANGE : COLORS.line }}
          />
        ))}
      </div>
    </section>
  );
}
