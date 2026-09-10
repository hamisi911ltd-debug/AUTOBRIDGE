"use client";

import { Scale, X } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatKes, formatUsd } from "@/lib/format";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import type { Page } from "@/components/AutoBridgeApp";

type Row = [string, (v: PublicVehicle) => string, (v: PublicVehicle) => number, "min" | "max" | null];

export function ComparePage({
  vehicles,
  landedMap,
  toggleCompare,
  onClearAll,
  setPage,
}: {
  vehicles: PublicVehicle[];
  landedMap: Record<string, LandedCost>;
  toggleCompare: (id: string) => void;
  onClearAll: () => void;
  setPage: (p: Page) => void;
}) {
  if (vehicles.length < 2) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <Scale size={32} className="mx-auto mb-4" color={COLORS.slate} />
        <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Nothing to compare yet
        </h2>
        <p className="text-sm mb-6" style={{ color: COLORS.slate }}>
          Add at least two vehicles from Search using the scale icon on any listing.
        </p>
        <button onClick={() => setPage("search")} className="px-5 py-2.5 rounded-full text-sm font-semibold text-white" style={{ background: COLORS.navy }}>
          Go to search
        </button>
      </div>
    );
  }

  const rows: Row[] = [
    ["Total price", (v) => formatKes(landedMap[v.id].total), (v) => landedMap[v.id].total, "min"],
    ["Vehicle price", (v) => formatUsd(v.sellingPriceUsd), (v) => v.sellingPriceUsd, "min"],
    ["Year", (v) => String(v.year), (v) => v.year, "max"],
    ["Mileage", (v) => `${v.mileageKm.toLocaleString()} km`, (v) => v.mileageKm, "min"],
    ["Engine", (v) => `${v.engineCc} cc`, () => 0, null],
    ["Fuel", (v) => v.fuel, () => 0, null],
    ["Transmission", (v) => v.transmission, () => 0, null],
    ["Drive", (v) => v.drive, () => 0, null],
    ["Body type", (v) => v.bodyType, () => 0, null],
    ["Source market", (v) => v.sourceCountry, () => 0, null],
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 overflow-x-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Compare vehicles
        </h1>
        <button onClick={onClearAll} className="text-sm font-medium flex items-center gap-1.5" style={{ color: COLORS.burgundy }}>
          <X size={14} /> Clear all
        </button>
      </div>
      <table className="w-full text-sm border-collapse" style={{ minWidth: "640px" }}>
        <thead>
          <tr>
            <th className="text-left p-3" style={{ width: "10rem" }}></th>
            {vehicles.map((v) => (
              <th key={v.id} className="p-3 text-left align-top">
                <div
                  className="relative w-full aspect-[4/3] rounded-xl mb-2 overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}
                >
                  <VehicleImage src={v.imageUrl} alt={`${v.year} ${v.make} ${v.model}`} iconSize={28} />
                </div>
                <div className="font-semibold" style={{ color: COLORS.navy }}>
                  {v.year} {v.make} {v.model}
                </div>
                <button onClick={() => toggleCompare(v.id)} className="text-xs mt-1 flex items-center gap-1" style={{ color: COLORS.burgundy }}>
                  <X size={12} /> Remove
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, fmt, val, best]) => {
            let bestVal: number | null = null;
            if (best) {
              const vals = vehicles.map(val);
              bestVal = best === "min" ? Math.min(...vals) : Math.max(...vals);
            }
            return (
              <tr key={label} className="border-t" style={{ borderColor: "#EEF0F3" }}>
                <td className="p-3 text-xs font-semibold" style={{ color: COLORS.slate }}>
                  {label}
                </td>
                {vehicles.map((v) => {
                  const isBest = best && val(v) === bestVal;
                  return (
                    <td key={v.id} className="p-3" style={isBest ? { background: "#FDF6E7", fontWeight: 600, color: COLORS.burgundy } : {}}>
                      {fmt(v)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
