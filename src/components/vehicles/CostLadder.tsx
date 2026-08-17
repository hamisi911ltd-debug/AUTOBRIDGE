"use client";

import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatKes } from "@/lib/format";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";

/** A classic invoice-style price card — navy header bar, dotted-leader rows, a bold total rule — rather than a dashboard-style progress-bar breakdown. */
export function CostLadder({
  vehicle,
  landed,
  fx,
}: {
  vehicle: Pick<PublicVehicle, "sellingPriceUsd">;
  landed: LandedCost;
  fx: number;
}) {
  const rows = [
    { label: "Vehicle price", value: vehicle.sellingPriceUsd * fx },
    { label: "Freight & insurance", value: (landed.freight + landed.insurance) * fx },
  ];

  return (
    <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: COLORS.line }}>
      <div className="px-3.5 lg:px-6 py-2.5 lg:py-4 flex items-center justify-between gap-1" style={{ background: COLORS.navy }}>
        <h3 className="text-xs lg:text-base font-semibold text-white" style={{ fontFamily: FONT_DISPLAY }}>
          Total price
        </h3>
        <span className="text-[9px] lg:text-[11px] px-2 py-0.5 lg:py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
          Mombasa delivery
        </span>
      </div>

      <div className="p-3.5 lg:p-6">
        <div className="space-y-2 lg:space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-baseline gap-1.5 text-[11px] lg:text-sm">
              <span className="shrink-0" style={{ color: COLORS.slate }}>
                {r.label}
              </span>
              <span className="flex-1 border-b" style={{ borderBottomStyle: "dotted", borderColor: "#C9BFD6" }} />
              <span className="font-semibold shrink-0" style={{ color: COLORS.ink, fontFamily: FONT_DISPLAY }}>
                {formatKes(r.value)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3.5 lg:mt-6 pt-2.5 lg:pt-4 gap-1" style={{ borderTop: `2px solid ${COLORS.navy}` }}>
          <span className="text-xs lg:text-lg font-bold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Total
          </span>
          <span className="text-base lg:text-3xl font-bold shrink-0" style={{ fontFamily: FONT_DISPLAY, color: COLORS.burgundy }}>
            {formatKes(landed.total)}
          </span>
        </div>

        <p className="hidden lg:block text-[11px] mt-4 leading-relaxed" style={{ color: COLORS.slate }}>
          Estimate only, at KSh {fx}/USD. Excludes KRA import duty, excise, VAT and registration — confirm those with a
          licensed clearing agent before you commit.
        </p>
      </div>
    </div>
  );
}
