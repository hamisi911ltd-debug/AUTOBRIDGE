"use client";

import { Car, ChevronRight, Fuel, Gauge, Heart, MapPin, Scale } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
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
        className="relative h-48 flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}
      >
        {v.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external CDN, many hosts, no next/image domain allowlisting needed
          <img
            src={v.imageUrl}
            alt={`${v.year} ${v.make} ${v.model}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <Car size={56} color={COLORS.goldLight} strokeWidth={1.2} />
        )}
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
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold leading-snug" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          {v.year} {v.make} {v.model}
        </h3>
        <p className="text-xs mb-3" style={{ color: COLORS.slate }}>
          {v.trim}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mb-4" style={{ color: COLORS.slate }}>
          <span className="inline-flex items-center gap-1">
            <Gauge size={12} /> {v.mileageKm.toLocaleString()} km
          </span>
          <span className="inline-flex items-center gap-1">
            <Fuel size={12} /> {v.fuel}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} /> {v.sourceCountry}
          </span>
        </div>
        <div className="mt-auto pt-3 border-t" style={{ borderColor: "#EEF0F3" }}>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: COLORS.slate }}>
            Vehicle Price
          </div>
          <div className="text-lg font-bold" style={{ color: COLORS.burgundy, fontFamily: FONT_DISPLAY }}>
            {formatUsd(v.sellingPriceUsd)}
          </div>
        </div>
        <button
          onClick={onView}
          className="mt-3 w-full py-2 rounded-full text-sm font-semibold flex items-center justify-center gap-1"
          style={{ background: COLORS.navy, color: "#fff" }}
        >
          View details <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
