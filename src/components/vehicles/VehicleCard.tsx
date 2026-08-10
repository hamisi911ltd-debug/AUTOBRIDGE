"use client";

import { Car, ChevronRight, Cog, Fuel, Gauge, Heart, Scale } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import type { PublicVehicle } from "@/types/vehicle";

export function VehicleCard({
  vehicle: v,
  isFavorite,
  onFavorite,
  inCompare,
  onCompare,
  onView,
}: {
  vehicle: PublicVehicle;
  isFavorite: boolean;
  onFavorite: () => void;
  inCompare: boolean;
  onCompare: () => void;
  onView: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border flex flex-col" style={{ borderColor: COLORS.line }}>
      <div
        className="relative aspect-[4/3] flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}
      >
        <VehicleImage src={v.imageUrl} alt={`${v.year} ${v.make} ${v.model}`} iconSize={56} />
        {v.badge && (
          <span
            className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: COLORS.gold, color: COLORS.navyDeep }}
          >
            {v.badge}
          </span>
        )}
        {!v.eligible && (
          <span className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
            Not eligible
          </span>
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          <button onClick={onFavorite} className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
            <Heart size={15} fill={isFavorite ? COLORS.burgundy : "none"} color={COLORS.burgundy} />
          </button>
          <button
            onClick={onCompare}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: inCompare ? COLORS.gold : "rgba(255,255,255,0.9)" }}
          >
            <Scale size={15} color={COLORS.navyDeep} />
          </button>
        </div>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-sm font-semibold leading-snug truncate" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          {v.year} {v.make} {v.model}
        </h3>
        <p className="text-[11px] mb-1.5 truncate" style={{ color: COLORS.slate }}>
          {v.trim}
        </p>
        <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[11px] mb-2" style={{ color: COLORS.slate }}>
          <span className="inline-flex items-center gap-1">
            <Gauge size={11} /> {v.mileageKm.toLocaleString()} km
          </span>
          <span className="inline-flex items-center gap-1">
            <Cog size={11} /> {v.transmission}
          </span>
          <span className="inline-flex items-center gap-1">
            <Fuel size={11} /> {v.fuel}
          </span>
          <span className="inline-flex items-center gap-1">
            <Car size={11} /> {v.bodyType}
          </span>
        </div>
        <div className="mt-auto pt-2 border-t" style={{ borderColor: "#EEF0F3" }}>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: COLORS.slate }}>
            Vehicle Price
          </div>
          <div className="text-base font-bold" style={{ color: COLORS.burgundy, fontFamily: FONT_DISPLAY }}>
            {formatUsd(v.sellingPriceUsd)}
          </div>
        </div>
        <button
          onClick={onView}
          className="mt-2 w-full py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1"
          style={{ background: COLORS.navy, color: "#fff" }}
        >
          View details <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
