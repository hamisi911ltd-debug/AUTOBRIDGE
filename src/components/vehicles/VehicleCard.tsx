"use client";

import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { discountPercent, formatUsd, wasPriceUsd } from "@/lib/format";
import { computeFreightUsd } from "@/lib/landedCost";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import type { PublicVehicle } from "@/types/vehicle";

/** Photo-forward card - name and price only; everything else (mileage, transmission, fuel, specs) shows once you click through to the detail page. */
export function VehicleCard({
  vehicle: v,
  onView,
  priority = false,
}: {
  vehicle: PublicVehicle;
  onView: () => void;
  /** Eager/high-priority load - pass true only for a genuinely above-the-fold card (e.g. the first in a grid). */
  priority?: boolean;
}) {
  // The card's own headline number is the full total a buyer would pay -
  // vehicle price + freight + insurance - not the bare vehicle price alone,
  // so it never reads as cheaper than what the detail/quote pages show.
  const totalUsd = v.sellingPriceUsd + computeFreightUsd(v.sourceCountry, v.freightIncluded) + v.insuranceUsd;
  const percent = discountPercent(v.id);
  const wasUsd = wasPriceUsd(totalUsd, v.id);

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
        <VehicleImage
          src={v.imageUrl}
          fallbackSrcs={v.imageUrls.filter((u) => u !== v.imageUrl)}
          alt={`${v.year} ${v.make} ${v.model}`}
          iconSize={44}
          banner={{ year: v.year, country: v.sourceCountry }}
          priority={priority}
        />
        {!v.eligible && (
          <span className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
            Not eligible
          </span>
        )}
        <span className="absolute top-2 right-2 sm:top-3 sm:right-3 text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-md text-white" style={{ background: "#DC2626" }}>
          -{percent}%
        </span>
      </div>
      <div className="p-2 sm:p-2.5">
        <h3 className="text-xs sm:text-sm font-semibold leading-snug truncate" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          {v.make} {v.model} {v.trim}
        </h3>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-sm sm:text-base font-bold" style={{ color: COLORS.burgundy, fontFamily: FONT_DISPLAY }}>
            {formatUsd(totalUsd)}
          </span>
          <span className="text-[10px] sm:text-xs line-through" style={{ color: COLORS.slate }}>
            {formatUsd(wasUsd)}
          </span>
        </div>
        <div className="text-[9px] sm:text-[10px] leading-tight" style={{ color: COLORS.slate }}>
          Incl. freight &amp; insurance
        </div>
      </div>
    </div>
  );
}
