"use client";

import { COLORS, FONT_DISPLAY, HOW_IT_WORKS } from "@/lib/constants";
import {
  SearchIllustration,
  ReserveIllustration,
  ShipIllustration,
  ClearanceIllustration,
  DeliveredIllustration,
} from "@/components/home/StepIllustrations";

const ILLUSTRATIONS = [SearchIllustration, ReserveIllustration, ShipIllustration, ClearanceIllustration, DeliveredIllustration];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16" style={{ background: COLORS.navy }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-white mb-10" style={{ fontFamily: FONT_DISPLAY }}>
          How importing with AutoBridge works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {HOW_IT_WORKS.map((s, i) => {
            const Illustration = ILLUSTRATIONS[i];
            return (
              <div
                key={s.title}
                className="rounded-2xl p-5 flex flex-col"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <Illustration />
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full"
                    style={{ background: "rgba(198,149,44,0.15)", color: COLORS.goldLight }}
                  >
                    Step {i + 1}
                  </span>
                </div>
                <div className="font-semibold text-white mb-2 text-sm">{s.title}</div>
                <p className="text-xs leading-relaxed" style={{ color: "#95A0B5" }}>
                  {s.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
