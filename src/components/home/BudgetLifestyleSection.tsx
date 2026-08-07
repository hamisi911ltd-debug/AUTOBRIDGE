"use client";

import { Briefcase, Car, Crown, GraduationCap, Mountain, Users, type LucideIcon } from "lucide-react";
import { BUDGET_TILES, COLORS, FONT_DISPLAY, type Filters } from "@/lib/constants";

const LIFESTYLE_TILES: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "family", label: "Family", icon: Users },
  { key: "business", label: "Business", icon: Briefcase },
  { key: "off-road", label: "Off-Road", icon: Mountain },
  { key: "student", label: "Student & Budget", icon: GraduationCap },
  { key: "ride-hailing", label: "Ride-Hailing", icon: Car },
  { key: "luxury", label: "Luxury", icon: Crown },
];

export function BudgetLifestyleSection({ goSearch }: { goSearch: (patch: Partial<Filters>) => void }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Browse by budget
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {BUDGET_TILES.map((t) => (
              <button
                key={t.label}
                onClick={() => goSearch({ priceMinKes: t.min, priceMaxKes: t.max })}
                className="text-left p-4 rounded-xl border hover:shadow-md transition"
                style={{ borderColor: COLORS.line }}
              >
                <div className="font-semibold text-sm" style={{ color: COLORS.navy }}>
                  {t.label}
                </div>
                <div className="text-xs mt-1" style={{ color: COLORS.slate }}>
                  Landed in Kenya
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Browse by lifestyle
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {LIFESTYLE_TILES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => goSearch({ lifestyle: t.key })}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border hover:shadow-md transition"
                  style={{ borderColor: COLORS.line }}
                >
                  <Icon size={20} color={COLORS.burgundy} />
                  <span className="text-xs font-medium" style={{ color: COLORS.navy }}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
