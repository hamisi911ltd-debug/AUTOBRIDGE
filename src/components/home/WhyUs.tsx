"use client";

import { Landmark, ShieldCheck, Ship, type LucideIcon } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";

const POINTS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ShieldCheck,
    title: "Transparent from the start",
    text: "Every listing shows the full landed cost, duty, VAT and shipping included, before you enquire.",
  },
  {
    icon: Landmark,
    title: "KRA-aligned estimates",
    text: "Our calculator follows the same duty, excise and VAT structure KRA applies at Mombasa.",
  },
  {
    icon: Ship,
    title: "End-to-end handling",
    text: "We coordinate purchase, freight, clearing and NTSA registration so you don't have to.",
  },
];

export function WhyUs() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <div className="grid md:grid-cols-3 gap-8">
        {POINTS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: COLORS.card }}>
                <Icon size={20} color={COLORS.burgundy} />
              </div>
              <h3 className="font-semibold mb-2" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
                {p.title}
              </h3>
              <p className="text-sm" style={{ color: COLORS.slate }}>
                {p.text}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
