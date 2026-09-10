"use client";

import { ChevronRight, Cog, Fuel, Gauge } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import type { PublicVehicle } from "@/types/vehicle";

export function VehicleCard({
  vehicle: v,
  onView,
}: {
  vehicle: PublicVehicle;
  onView: () => void;
}) {
  return (
    <div
      onClick={onView}
      className="bg-white rounded-2xl overflow-hidden border flex flex-col cursor-pointer"
      style={{ borderColor: COLORS.line }}
    >
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}
      >
        <VehicleImage src={v.imageUrl} alt={`${v.year} ${v.make} ${v.model}`} iconSize={44} banner={{ year: v.year, country: v.sourceCountry }} />
        {!v.eligible && (
          <span className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
            Not eligible
          </span>
        )}
      </div>
      <div className="p-2 sm:p-2.5 flex flex-col flex-1">
        <h3 className="text-xs sm:text-sm font-semibold leading-snug truncate" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          {v.year} {v.make} {v.model}
        </h3>
        <p className="hidden sm:block text-[10px] mb-1 truncate" style={{ color: COLORS.slate }}>
          {v.trim}
        </p>
        <div className="hidden sm:flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] mb-1.5" style={{ color: COLORS.slate }}>
          <span className="inline-flex items-center gap-1">
            <Gauge size={10} /> {v.mileageKm.toLocaleString()} km
          </span>
          <span className="inline-flex items-center gap-1">
            <Cog size={10} /> {v.transmission}
          </span>
          <span className="inline-flex items-center gap-1">
            <Fuel size={10} /> {v.fuel}
          </span>
        </div>
        <div className="mt-auto pt-1 sm:pt-1.5 sm:border-t" style={{ borderColor: "#EEF0F3" }}>
          <div className="hidden sm:block text-[9px] uppercase tracking-wide" style={{ color: COLORS.slate }}>
            Vehicle Price
          </div>
          <div className="text-sm sm:text-base font-bold" style={{ color: COLORS.burgundy, fontFamily: FONT_DISPLAY }}>
            {formatUsd(v.sellingPriceUsd)}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className="hidden sm:flex mt-1.5 w-full py-1 rounded-full text-[11px] font-semibold items-center justify-center gap-1"
          style={{ background: COLORS.navy, color: "#fff" }}
        >
          View details <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}
