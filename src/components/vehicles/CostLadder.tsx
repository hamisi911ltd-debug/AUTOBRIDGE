"use client";

import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatKes } from "@/lib/format";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";

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
    { label: "Import duty · 25%", value: landed.importDuty },
    { label: `Excise duty · ${Math.round(landed.exciseRate * 100)}%`, value: landed.excise },
    { label: "VAT · 16%", value: landed.vat },
    { label: "IDF + RDL", value: landed.idf + landed.rdl },
    { label: "Port & clearing", value: landed.portClearing },
    { label: "Registration & plates", value: landed.registration },
  ];
  const max = landed.total;

  return (
    <div className="bg-white rounded-2xl border p-5 sm:p-6" style={{ borderColor: COLORS.line }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Estimated landed cost
        </h3>
        <span className="text-[11px] px-2 py-1 rounded-full" style={{ background: COLORS.card, color: COLORS.slate }}>
          Mombasa delivery
        </span>
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span style={{ color: COLORS.ink }}>{r.label}</span>
              <span className="font-medium" style={{ color: COLORS.ink }}>
                {formatKes(r.value)}
              </span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "#EEF0F3" }}>
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (r.value / max) * 100)}%`, background: COLORS.gold }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-5 pt-4 border-t" style={{ borderColor: COLORS.line }}>
        <span className="font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Total landed cost
        </span>
        <span className="text-2xl font-bold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.burgundy }}>
          {formatKes(landed.total)}
        </span>
      </div>
      <p className="text-[11px] mt-3 leading-relaxed" style={{ color: COLORS.slate }}>
        Estimate only, at KSh {fx}/USD. KRA duty is actually calculated from its Current Retail Selling Price (CRSP)
        schedule with age-based depreciation, not the invoice price, so actual duty may differ. Confirm final figures
        with a licensed clearing agent before you commit.
      </p>
    </div>
  );
}
