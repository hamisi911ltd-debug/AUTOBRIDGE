"use client";

import { ShoppingCart } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { discountPercent, formatUsd, wasPriceUsd } from "@/lib/format";
import { computeFreightUsd } from "@/lib/landedCost";
import { useCart } from "@/lib/cartContext";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import { FerbilBadge } from "@/components/vehicles/FerbilBadge";
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
  const { cart, toggleCart } = useCart();
  const inCart = cart.has(v.id);

  return (
    <a
      href={`/car/${v.id}`}
      onClick={(e) => {
        // A real href (not just an onClick div) so Google can discover and
        // follow this to /car/[id] - a real, server-rendered, indexable
        // page per vehicle - and so ctrl/cmd/middle-click still opens a
        // normal new tab. A plain left-click still swaps the SPA's view
        // state instantly instead of a full page reload, which is what
        // onView() already does everywhere this card is used.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        onView();
      }}
      className="bg-white rounded-xl sm:rounded-2xl overflow-hidden border flex flex-col cursor-pointer"
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
          iconSize={36}
          banner={{ year: v.year, country: v.sourceCountry, tall: v.sourceSite === "sbtjapan" }}
          priority={priority}
        />
        {/* The plate mark stays on every card regardless of eligibility - it's
           the site's own brand mark, not a status indicator, so a rare
           ineligible listing shouldn't lose it. "Not eligible" gets its own
           spot lower down instead of replacing the logo. */}
        <FerbilBadge size="sm" />
        {!v.eligible && (
          <span className="absolute top-8 left-1.5 sm:top-9 sm:left-2 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            Not eligible
          </span>
        )}
        <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ background: "#DC2626" }}>
          -{percent}%
        </span>
      </div>
      <div className="p-1.5 sm:p-2 flex-1 flex flex-col">
        {/* line-clamp-2, not truncate: a one-line ellipsis was cutting off
           real, useful details (grade/spec text some sources pack into the
           name, e.g. "TXL1 RIGHT HAND DRIVE ONLY FOR EXPORT 2.8L FULL
           OPTION") down to a couple of words. Two lines shows far more of
           the actual name before it gives up and clips. */}
        <h3 className="text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2 min-h-[2.2em]" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          {v.make} {v.model} {v.trim}
        </h3>
        <div className="flex items-center justify-between gap-1 mt-auto pt-1">
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-bold truncate" style={{ color: COLORS.burgundy, fontFamily: FONT_DISPLAY }}>
              {formatUsd(totalUsd)}
            </span>
            <span className="text-[9px] sm:text-[10px] line-through" style={{ color: "#DC2626" }}>
              {formatUsd(wasUsd)}
            </span>
          </div>
          <button
            onClick={(e) => {
              // Both needed now that the card is a real <a>: stopPropagation
              // alone doesn't block the anchor's native default action
              // (browser navigation only gets prevented by preventDefault,
              // wherever it's called), so without this the cart click would
              // still follow the href to a full page load.
              e.preventDefault();
              e.stopPropagation();
              toggleCart(v.id);
            }}
            aria-label={inCart ? "Remove from cart" : "Add to cart"}
            className="shrink-0 flex items-center justify-center w-6 h-6 -mr-1"
            style={{ color: COLORS.burgundy }}
          >
            <ShoppingCart size={13} fill={inCart ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </a>
  );
}
