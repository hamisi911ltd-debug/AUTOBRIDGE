"use client";

import { COLORS, FONT_DISPLAY, HOW_IT_WORKS } from "@/lib/constants";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16" style={{ background: COLORS.navy }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-10" style={{ fontFamily: FONT_DISPLAY }}>
          How importing with AutoBridge works
        </h2>
        <div className="grid md:grid-cols-5 gap-6">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.title}>
              <div className="text-3xl font-bold mb-3" style={{ fontFamily: FONT_DISPLAY, color: COLORS.gold }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="font-semibold text-white mb-2 text-sm">{s.title}</div>
              <p className="text-xs leading-relaxed" style={{ color: "#95A0B5" }}>
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
