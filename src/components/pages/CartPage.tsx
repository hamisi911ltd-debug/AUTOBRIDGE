"use client";

import { ShoppingCart, Trash2 } from "lucide-react";
import { COLORS, FONT_DISPLAY, type Filters } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import { computeFreightUsd, type LandedCost } from "@/lib/landedCost";
import { whatsAppLink, vehicleDetailBlock } from "@/lib/whatsapp";
import { useCart } from "@/lib/cartContext";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import type { PublicVehicle } from "@/types/vehicle";

/**
 * Not a real checkout (there's no payment step for this business - every
 * transaction is high-touch and manual, same reasoning InvoicePage already
 * follows), just a saved-shortlist view: the vehicles someone's picked
 * across browsing sessions, with one action - send them all as a single
 * WhatsApp enquiry - rather than repeating "Enquire" per car.
 */
export function CartPage({
  vehicles,
  landedMap,
  goDetail,
  goQuote,
  goSearch,
}: {
  vehicles: PublicVehicle[];
  landedMap: Record<string, LandedCost>;
  goDetail: (id: string) => void;
  goQuote: (id?: string) => void;
  goSearch: (patch: Partial<Filters>) => void;
}) {
  const { cart, toggleCart } = useCart();
  const items = vehicles.filter((v) => cart.has(v.id));

  const total = items.reduce((sum, v) => {
    const landed = landedMap[v.id];
    const freight = landed ? landed.freight : computeFreightUsd(v.sourceCountry, v.freightIncluded);
    const insurance = landed ? landed.insurance : v.insuranceUsd;
    return sum + v.sellingPriceUsd + freight + insurance;
  }, 0);

  function enquireAboutCart() {
    const origin = window.location.origin;
    const blocks = items.map((v, i) => {
      const ref = `AB-${v.id.slice(-7).toUpperCase()}`;
      return `${i + 1}. ${vehicleDetailBlock(v, ref, origin)}`;
    });
    const text = [`Enquiry about ${items.length} vehicle${items.length === 1 ? "" : "s"} from my cart:`, "", ...blocks].join("\n\n");
    window.open(whatsAppLink(text), "_blank", "noopener,noreferrer");
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
        <ShoppingCart size={40} className="mx-auto mb-3" color={COLORS.slate} />
        <h1 className="text-xl sm:text-2xl font-semibold mb-2" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Your cart is empty
        </h1>
        <p className="text-sm mb-5" style={{ color: COLORS.slate }}>
          Add cars while browsing to shortlist them here, then send one enquiry for all of them at once.
        </p>
        <button onClick={() => goSearch({})} className="px-5 py-2.5 rounded-full text-sm font-semibold text-white" style={{ background: COLORS.burgundy }}>
          Browse the catalogue
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-10">
      <div className="mb-5">
        <div className="w-10 h-1 rounded-full mb-2" style={{ background: COLORS.gold }} />
        <h1 className="text-2xl sm:text-3xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Your cart ({items.length})
        </h1>
      </div>

      <div className="space-y-3 mb-6">
        {items.map((v) => {
          const landed = landedMap[v.id];
          const freight = landed ? landed.freight : computeFreightUsd(v.sourceCountry, v.freightIncluded);
          const insurance = landed ? landed.insurance : v.insuranceUsd;
          const totalUsd = v.sellingPriceUsd + freight + insurance;
          return (
            <div key={v.id} className="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl border bg-white" style={{ borderColor: COLORS.line }}>
              <button onClick={() => goDetail(v.id)} className="relative w-20 h-16 sm:w-24 sm:h-20 rounded-xl overflow-hidden shrink-0" style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}>
                <VehicleImage src={v.imageUrl} fallbackSrcs={v.imageUrls.filter((u) => u !== v.imageUrl)} alt={`${v.year} ${v.make} ${v.model}`} iconSize={24} />
              </button>
              <button onClick={() => goDetail(v.id)} className="flex-1 min-w-0 text-left">
                <div className="text-xs sm:text-sm font-semibold truncate" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
                  {v.year} {v.make} {v.model} {v.trim}
                </div>
                <div className="text-sm sm:text-base font-bold mt-0.5" style={{ color: COLORS.burgundy, fontFamily: FONT_DISPLAY }}>
                  {formatUsd(totalUsd)}
                </div>
              </button>
              <button
                onClick={() => toggleCart(v.id)}
                aria-label="Remove from cart"
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "#FEF2F2", color: "#DC2626" }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border p-4 sm:p-5 mb-4" style={{ borderColor: COLORS.line, background: COLORS.card }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium" style={{ color: COLORS.navy }}>
            Total ({items.length} vehicle{items.length === 1 ? "" : "s"})
          </span>
          <span className="text-lg sm:text-xl font-bold" style={{ color: COLORS.burgundy, fontFamily: FONT_DISPLAY }}>
            {formatUsd(total)}
          </span>
        </div>
        <p className="text-xs" style={{ color: COLORS.slate }}>
          Incl. freight &amp; insurance for each vehicle. KRA duty/excise/VAT and clearing are quoted separately per
          car - get an invoice for any one of them any time.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <button onClick={enquireAboutCart} className="flex-1 py-3 rounded-full text-sm font-semibold text-white" style={{ background: COLORS.burgundy }}>
          Enquire about all {items.length} on WhatsApp
        </button>
        <button onClick={() => goSearch({})} className="px-5 py-3 rounded-full text-sm font-semibold border" style={{ borderColor: COLORS.line, color: COLORS.navy }}>
          Keep browsing
        </button>
      </div>
    </div>
  );
}
