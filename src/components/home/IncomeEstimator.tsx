"use client";

import { useState } from "react";
import { COLORS, FONT_DISPLAY, type Filters } from "@/lib/constants";
import { formatKes } from "@/lib/format";

export function IncomeEstimator({ goSearch }: { goSearch: (patch: Partial<Filters>) => void }) {
  const [salary, setSalary] = useState(150000);
  const suggested = salary * 40;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14">
      <div className="rounded-2xl p-6 sm:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center" style={{ background: COLORS.card }}>
        <div>
          <h3 className="font-semibold mb-1" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            What can I afford?
          </h3>
          <p className="text-sm mb-4" style={{ color: COLORS.slate }}>
            A rough guide only, not financial advice. Tell us your gross monthly income and we&apos;ll suggest a
            landed-cost range to start from.
          </p>
          <div className="flex items-center gap-3 max-w-sm">
            <span className="text-sm" style={{ color: COLORS.slate }}>
              KSh
            </span>
            <input
              type="number"
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value) || 0)}
              className="border rounded-lg px-3 py-2 text-sm flex-1"
              style={{ borderColor: "#D8DCE3" }}
            />
            <span className="text-sm" style={{ color: COLORS.slate }}>
              / month
            </span>
          </div>
        </div>
        <div className="text-center md:text-right">
          <div className="text-xs mb-1" style={{ color: COLORS.slate }}>
            Suggested budget
          </div>
          <div className="text-2xl font-bold mb-3" style={{ fontFamily: FONT_DISPLAY, color: COLORS.burgundy }}>
            up to {formatKes(suggested)}
          </div>
          <button
            onClick={() => goSearch({ priceMinKes: 0, priceMaxKes: suggested })}
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{ background: COLORS.navy }}
          >
            See cars in range
          </button>
        </div>
      </div>
    </section>
  );
}
