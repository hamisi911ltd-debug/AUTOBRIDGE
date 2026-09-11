"use client";

import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
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
      </div>
      <div className="p-2 sm:p-2.5">
        <h3 className="text-xs sm:text-sm font-semibold leading-snug truncate" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          {v.make} {v.model} {v.trim}
        </h3>
        <div className="text-sm sm:text-base font-bold mt-0.5" style={{ color: COLORS.burgundy, fontFamily: FONT_DISPLAY }}>
          {formatUsd(totalUsd)}
        </div>
        <div className="text-[9px] sm:text-[10px] leading-tight" style={{ color: COLORS.slate }}>
          Incl. freight &amp; insurance
        </div>
      </div>
    </div>
  );
}
