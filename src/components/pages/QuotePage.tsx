"use client";

import { useState } from "react";
import { Printer, CheckCircle2, Phone } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatKes } from "@/lib/format";
import { whatsAppLink, vehicleDetailBlock, WHATSAPP_NUMBER } from "@/lib/whatsapp";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { Pagination } from "@/components/vehicles/Pagination";

// Same page size as the homepage's own catalogue grid — divisible by 2
// (mobile) and 4 (desktop) so a full page never leaves a dangling gap.
const PAGE_SIZE = 24;

// Same orange-to-magenta-to-violet sweep as the site's own header — used
// throughout the printable document so it reads as unmistakably branded
// rather than a plain black-and-white invoice template.
const BRAND_GRADIENT = "linear-gradient(90deg, #F2762E 0%, #D6336C 50%, #3B1F63 100%)";

/**
 * A dedicated, printable "official quote" document — vehicle + price
 * breakdown, laid out like a real quotation rather than a product card.
 * Import duty, excise, VAT and registration are deliberately NOT computed
 * here: KRA's real method depreciates an official CRSP reference value per
 * make/model/engine/year (not the purchase price), which this app has no
 * verified data for. Showing a guessed number on a document labeled
 * "official" would be a real financial-accuracy risk, so that line is
 * explicitly left to the team to confirm — same approach the enquiry form
 * already uses elsewhere on the site.
 *
 * Getting a quote is a two-step flow: this page's own job is only step two
 * (the printable document, once `preselectedId` is set — normally by the
 * "Get a quotation" button on a vehicle's detail page). With nothing
 * selected yet, it's just the same browsing grid the homepage uses — no
 * separate picker UI — so choosing a car and asking for its quote both
 * happen through the one familiar detail page.
 */
export function QuotePage({
  vehicles,
  landedMap,
  preselectedId,
  goDetail,
}: {
  vehicles: PublicVehicle[];
  landedMap: Record<string, LandedCost>;
  preselectedId: string | null;
  goDetail: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(preselectedId);
  const [page, setPage] = useState(1);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  // What the customer is actually asking us to handle — the vehicle+
  // shipping purchase alone, or that plus KRA clearance on their behalf.
  // Doesn't change the total shown (duty is still never guessed at, see the
  // file header comment), only which service is being requested and how
  // the disclosure below reads.
  const [serviceType, setServiceType] = useState<"import" | "full">("import");

  const vehicle = vehicles.find((v) => v.id === selectedId) || null;

  if (!vehicle) {
    const pageCount = Math.max(1, Math.ceil(vehicles.length / PAGE_SIZE));
    const paged = vehicles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    function goToPage(p: number) {
      setPage(p);
      document.getElementById("quote-catalogue")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    return (
      <div id="quote-catalogue" className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-6 sm:pb-14">
        <div className="mb-4">
          <div className="w-10 h-1 rounded-full mb-2" style={{ background: COLORS.gold }} />
          <h1 className="text-2xl sm:text-3xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Get an official quote
          </h1>
          <p className="text-sm mt-1" style={{ color: COLORS.slate }}>
            Pick a car below, then use &ldquo;Get a quotation&rdquo; on its page for a printable price breakdown.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-5">
          {paged.map((v) => (
            <VehicleCard key={v.id} vehicle={v} onView={() => goDetail(v.id)} />
          ))}
        </div>
        <Pagination page={page} pageCount={pageCount} onPageChange={goToPage} />
      </div>
    );
  }

  const landed = landedMap[vehicle.id];
  const ref = `Q-${vehicle.id.slice(-7).toUpperCase()}`;
  const today = new Date();
  const validUntil = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!vehicle) return;
    const data = new FormData(e.currentTarget);
    setSending(true);
    try {
      const serviceLabel = serviceType === "full" ? "Import + taxation & clearance" : "Import only";
      const message = `[Official quote request ${ref}, ${serviceLabel}]${data.get("message") ? "\n" + data.get("message") : ""}`;
      await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          name: data.get("name"),
          phone: data.get("phone"),
          email: data.get("email") || null,
          message,
        }),
      });
      setSent(true);
      const waText = [
        `Official quote request`,
        vehicleDetailBlock(vehicle, ref, window.location.origin),
        `Service: ${serviceLabel}`,
        `Name: ${data.get("name")}`,
        `Phone: ${data.get("phone")}`,
        data.get("email") ? `Email: ${data.get("email")}` : null,
        serviceType === "full"
          ? `Please confirm KRA duty, excise, VAT, registration and handle clearance for this quote.`
          : `Please confirm this quote. I'll arrange clearance separately.`,
      ]
        .filter(Boolean)
        .join("\n");
      window.open(whatsAppLink(waText), "_blank", "noopener,noreferrer");
    } finally {
      setSending(false);
    }
  }

  const phoneDisplay = `+${WHATSAPP_NUMBER.slice(0, 3)} ${WHATSAPP_NUMBER.slice(3, 6)} ${WHATSAPP_NUMBER.slice(6, 9)} ${WHATSAPP_NUMBER.slice(9)}`;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #quote-document, #quote-document * { visibility: visible; }
          #quote-document { position: absolute; left: 0; top: 0; width: 100%; }
          #quote-no-print { display: none !important; }
        }
      `}</style>

      <div id="quote-no-print" className="flex items-center justify-between mb-4 sm:mb-5 flex-wrap gap-3">
        <button onClick={() => setSelectedId(null)} className="text-xs sm:text-sm font-medium" style={{ color: COLORS.burgundy }}>
          &larr; Choose a different vehicle
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-white"
          style={{ background: BRAND_GRADIENT }}
        >
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      <div id="quote-document" className="bg-white rounded-2xl border overflow-hidden text-[13px] sm:text-base" style={{ borderColor: COLORS.line }}>
        {/* Top accent strip — the same orange-to-magenta-to-violet gradient
            as the site's own header, so the document reads as unmistakably
            ours rather than a generic template. */}
        <div className="h-1.5 sm:h-2" style={{ background: BRAND_GRADIENT }} />

        {/* Header band — a big identity block in the full brand gradient
            (like a real freight invoice's solid block, but colored rather
            than flat) with the logo lockup opposite on a soft tinted panel. */}
        <div className="flex items-stretch">
          <div className="flex flex-col justify-center px-5 sm:px-9 py-6 sm:py-9 w-[40%]" style={{ background: BRAND_GRADIENT }}>
            <span className="text-2xl sm:text-4xl font-extrabold text-white tracking-wide leading-none" style={{ fontFamily: FONT_DISPLAY }}>
              QUOTE
            </span>
          </div>
          <div className="flex-1 flex items-center justify-end gap-2.5 px-4 sm:px-8" style={{ background: COLORS.card }}>
            <div>
              <div className="text-sm sm:text-xl font-bold leading-none" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
                Vehicle Import Marketplace
              </div>
              <div className="text-[8px] sm:text-[11px] mt-1" style={{ color: COLORS.slate }}>
                Kenya&apos;s vehicle import marketplace
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8">
          {/* Two stacked rows of bordered info cells (one column on mobile,
              three on desktop) — a real invoice's block layout, not a wall
              of running text. */}
          <div className="grid sm:grid-cols-3 border-2 rounded-lg overflow-hidden mb-2.5 sm:mb-3" style={{ borderColor: COLORS.navy, background: COLORS.card }}>
            <div className="p-2.5 sm:p-3.5 border-b sm:border-b-0 sm:border-r-2" style={{ borderColor: COLORS.navy }}>
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.gold }}>
                Vehicle
              </div>
              <div className="text-xs sm:text-sm font-semibold" style={{ color: COLORS.navy }}>
                {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
              </div>
            </div>
            <div className="p-2.5 sm:p-3.5 border-b sm:border-b-0 sm:border-r-2" style={{ borderColor: COLORS.navy }}>
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.gold }}>
                Reference
              </div>
              <div className="text-xs sm:text-sm font-semibold" style={{ color: COLORS.navy }}>
                {ref}
              </div>
            </div>
            <div className="p-2.5 sm:p-3.5">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.gold }}>
                Destination
              </div>
              <div className="text-xs sm:text-sm font-semibold" style={{ color: COLORS.navy }}>
                Mombasa, Kenya
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 border-2 rounded-lg overflow-hidden mb-3 sm:mb-4" style={{ borderColor: COLORS.navy, background: COLORS.card }}>
            <div className="p-2.5 sm:p-3.5 border-b sm:border-b-0 sm:border-r-2" style={{ borderColor: COLORS.navy }}>
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.gold }}>
                Issue date
              </div>
              <div className="text-xs sm:text-sm font-semibold" style={{ color: COLORS.navy }}>
                {today.toLocaleDateString()}
              </div>
            </div>
            <div className="p-2.5 sm:p-3.5 border-b sm:border-b-0 sm:border-r-2" style={{ borderColor: COLORS.navy }}>
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.gold }}>
                Expiry date
              </div>
              <div className="text-xs sm:text-sm font-semibold" style={{ color: COLORS.navy }}>
                {validUntil.toLocaleDateString()}
              </div>
            </div>
            <div className="p-2.5 sm:p-3.5">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.gold }}>
                Issued by
              </div>
              <div className="text-xs sm:text-sm font-semibold inline-flex items-center gap-1" style={{ color: COLORS.navy }}>
                <Phone size={11} color={COLORS.burgundy} /> {phoneDisplay}
              </div>
            </div>
          </div>

          <div id="quote-no-print" className="mb-3 sm:mb-5">
            <div className="text-[9px] sm:text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.slate }}>
              Choose what you&apos;d like quoted
            </div>
            <div className="grid sm:grid-cols-2 gap-2 sm:gap-2.5">
              {(
                [
                  ["import", "Importing only", "We buy and ship the car to Mombasa, you (or your own agent) handle KRA clearance."],
                  ["full", "Taxation & clearance", "We also handle KRA duty payment and clearing on your behalf, end to end."],
                ] as [typeof serviceType, string, string][]
              ).map(([value, title, desc]) => {
                const active = serviceType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setServiceType(value)}
                    className="text-left rounded-xl border p-2.5 sm:p-3"
                    style={{ borderColor: active ? COLORS.burgundy : COLORS.line, background: active ? COLORS.card : "transparent" }}
                  >
                    <div className="text-xs sm:text-sm font-semibold" style={{ color: active ? COLORS.burgundy : COLORS.navy }}>
                      {title}
                    </div>
                    <div className="text-[10px] sm:text-[11px] mt-0.5" style={{ color: COLORS.slate }}>
                      {desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Printed record of which service was chosen — the toggle above is interactive-only and hidden from print. */}
          <p className="text-[10px] sm:text-xs font-medium mb-2 sm:mb-3" style={{ color: COLORS.navy }}>
            Service requested: {serviceType === "full" ? "Importing + taxation & clearance" : "Importing only"}
          </p>

          {/* A real item table (header row, one line item, then a separate
              highlighted Total bar) rather than one number, matching the
              boxed-invoice layout style — freight & insurance are called out
              as already folded into the one line rather than itemized on
              their own. */}
          <div className="rounded-lg overflow-hidden border mb-3 sm:mb-4" style={{ borderColor: COLORS.line }}>
            <table className="w-full text-[10px] sm:text-sm">
              <thead>
                <tr style={{ background: COLORS.burgundy }}>
                  <th className="text-left font-semibold text-white py-1.5 sm:py-2.5 px-2.5 sm:px-4">Description</th>
                  <th className="text-center font-semibold text-white py-1.5 sm:py-2.5 px-2 sm:px-4">Qty</th>
                  {/* Unit price = Total here (qty is always 1), so on a
                     narrow phone the same long KES figure twice is just
                     cramped repetition — desktop keeps the full 4 columns
                     matching a real invoice. */}
                  <th className="hidden sm:table-cell text-right font-semibold text-white py-1.5 sm:py-2.5 px-2.5 sm:px-4">Unit price</th>
                  <th className="text-right font-semibold text-white py-1.5 sm:py-2.5 px-2.5 sm:px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t" style={{ borderColor: COLORS.line, background: COLORS.card }}>
                  <td className="py-2 sm:py-3 px-2.5 sm:px-4" style={{ color: COLORS.ink }}>
                    <div className="font-medium">Vehicle, freight &amp; insurance to Mombasa</div>
                    <div className="text-[9px] sm:text-[11px] mt-0.5" style={{ color: COLORS.slate }}>
                      {vehicle.bodyType} &middot; {vehicle.fuel} &middot; {vehicle.mileageKm.toLocaleString()} km &middot; from {vehicle.sourceCountry}
                    </div>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-center" style={{ color: COLORS.ink }}>
                    1
                  </td>
                  <td className="hidden sm:table-cell py-2 sm:py-3 px-2.5 sm:px-4 text-right font-medium whitespace-nowrap" style={{ color: COLORS.ink }}>
                    {formatKes(landed.total)}
                  </td>
                  <td className="py-2 sm:py-3 px-2.5 sm:px-4 text-right font-medium whitespace-nowrap" style={{ color: COLORS.ink }}>
                    {formatKes(landed.total)}
                  </td>
                </tr>
                {/* One gradient on the row itself, not on each cell — a
                   separate background per <td> would restart the sweep in
                   every cell instead of flowing smoothly across the row. */}
                <tr style={{ background: BRAND_GRADIENT }}>
                  <td colSpan={2} className="sm:hidden py-2 sm:py-3 px-2.5 sm:px-4 font-bold text-white text-xs sm:text-base">
                    Total
                  </td>
                  <td colSpan={3} className="hidden sm:table-cell py-2 sm:py-3 px-2.5 sm:px-4 font-bold text-white text-xs sm:text-base">
                    Total
                  </td>
                  <td className="py-2 sm:py-3 px-2.5 sm:px-4 text-right font-bold text-white text-xs sm:text-base whitespace-nowrap">
                    {formatKes(landed.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            className="rounded-xl p-2.5 sm:p-3.5 mb-4 sm:mb-6 text-[10px] sm:text-xs leading-relaxed border-l-4"
            style={{ background: COLORS.card, color: COLORS.ink, borderColor: COLORS.gold }}
          >
            <strong style={{ color: COLORS.navy }}>Import duty, excise, VAT &amp; registration:</strong> not included in the
            total above. KRA calculates this off its official CRSP valuation for this exact vehicle, not the purchase
            price, so it can only be confirmed once our clearing team looks up this specific unit.{" "}
            {serviceType === "full"
              ? "Since you've asked for taxation & clearance, our team will pay this on your behalf and clear the vehicle end to end. Submit the request below and we'll confirm the exact figure first."
              : "Submit the request below and we'll send the exact figure so you (or your own clearing agent) can handle it."}
          </div>

          {sent ? (
            <div id="quote-no-print" className="flex items-center gap-2 text-xs sm:text-sm font-medium py-2" style={{ color: COLORS.burgundy }}>
              <CheckCircle2 size={17} /> Request sent, we&apos;ll follow up with your full quote shortly.
            </div>
          ) : (
            <form id="quote-no-print" onSubmit={submit} className="grid sm:grid-cols-2 gap-2 sm:gap-3">
              <input name="name" required placeholder="Full name" className="border rounded-lg px-3 py-2 text-xs sm:text-sm" style={{ borderColor: "#D8DCE3" }} />
              <input name="phone" required placeholder="Phone number" className="border rounded-lg px-3 py-2 text-xs sm:text-sm" style={{ borderColor: "#D8DCE3" }} />
              <input
                name="email"
                type="email"
                placeholder="Email (optional)"
                className="border rounded-lg px-3 py-2 text-xs sm:text-sm sm:col-span-2"
                style={{ borderColor: "#D8DCE3" }}
              />
              <textarea
                name="message"
                rows={2}
                placeholder="Anything else we should know? (optional)"
                className="border rounded-lg px-3 py-2 text-xs sm:text-sm resize-none sm:col-span-2"
                style={{ borderColor: "#D8DCE3" }}
              />
              <button
                type="submit"
                disabled={sending}
                className="sm:col-span-2 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: BRAND_GRADIENT }}
              >
                {sending ? "Sending…" : "Send this quote request"}
              </button>
            </form>
          )}

          <p className="text-[9px] sm:text-[11px] mt-5 sm:mt-6 pt-3 sm:pt-4 border-t" style={{ borderColor: COLORS.line, color: COLORS.slate }}>
            This quote covers vehicle price, freight and insurance only
            {serviceType === "full" ? ", KRA clearance is quoted and handled separately once confirmed" : ""}. Prices are
            indicative and subject to exporter availability at time of purchase.
          </p>
        </div>

        {/* Bottom accent band — same brand gradient as the top strip, so the document is framed top and bottom. */}
        <div className="h-2 sm:h-2.5" style={{ background: BRAND_GRADIENT }} />
      </div>

      <button id="quote-no-print" onClick={() => goDetail(vehicle.id)} className="text-xs sm:text-sm font-medium mt-4" style={{ color: COLORS.burgundy }}>
        View full listing &rarr;
      </button>
    </div>
  );
}
