"use client";

import { useState } from "react";
import { Printer, CheckCircle2 } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { COMPANY, BANK_DETAILS } from "@/lib/company";
import { computeFreightUsd } from "@/lib/landedCost";
import { whatsAppLink, vehicleDetailBlock } from "@/lib/whatsapp";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { Pagination } from "@/components/vehicles/Pagination";

// Same page size as the homepage's own catalogue grid.
const PAGE_SIZE = 24;

// The magenta/maroon of Ferbil Interfreight's printed invoice — used for the
// INVOICE block, the line-item table header and the footer band.
const MAROON = "#8B2A5B";
// The site's own orange-to-magenta-to-violet logo sweep — kept for the mark
// and the thin top/bottom accents so the document still reads as ours.
const BRAND_GRADIENT = "linear-gradient(90deg, #F2762E 0%, #D6336C 50%, #3B1F63 100%)";

function usd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * The customer-facing **proforma invoice** — vehicle CIF (cost, insurance &
 * freight to Mombasa) only, all in USD, laid out and branded like Ferbil
 * Interfreight's own invoice (maroon INVOICE block, company + NCBA bank
 * block, maroon line-item table).
 *
 * KRA import duty / excise / VAT / registration are deliberately NOT on this
 * document: those are assessed by KRA at clearance (off its CRSP valuation,
 * not the invoice price), and the team issues a separate **final invoice**
 * with the confirmed tax lines once that figure is known. The request form
 * below is how a customer asks for that next step.
 *
 * With nothing selected it's just the homepage browsing grid — a car is
 * picked, and its invoice requested, through the familiar detail page.
 */
export function InvoicePage({
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
  const [wantFinal, setWantFinal] = useState(true);

  const vehicle = vehicles.find((v) => v.id === selectedId) || null;

  if (!vehicle) {
    const pageCount = Math.max(1, Math.ceil(vehicles.length / PAGE_SIZE));
    const paged = vehicles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    function goToPage(p: number) {
      setPage(p);
      document.getElementById("invoice-catalogue")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    return (
      <div id="invoice-catalogue" className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-6 sm:pb-14">
        <div className="mb-4">
          <div className="w-10 h-1 rounded-full mb-2" style={{ background: COLORS.gold }} />
          <h1 className="text-2xl sm:text-3xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Get an invoice
          </h1>
          <p className="text-sm mt-1" style={{ color: COLORS.slate }}>
            Pick a car below, then use &ldquo;Get an invoice&rdquo; on its page for a printable proforma invoice.
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
  const ref = `AB-${vehicle.id.slice(-7).toUpperCase()}`;
  const today = new Date();
  const invoiceNo = `PI-${today.getFullYear().toString().slice(2)}${String(today.getMonth() + 1).padStart(2, "0")}${String(
    today.getDate(),
  ).padStart(2, "0")}-${vehicle.id.slice(-5).toUpperCase()}`;

  const vehiclePrice = vehicle.sellingPriceUsd;
  const freight = landed ? landed.freight : computeFreightUsd(vehicle.sourceCountry, vehicle.freightIncluded);
  const insurance = landed ? landed.insurance : vehicle.insuranceUsd;
  const cifTotal = vehiclePrice + freight + insurance;

  const specRows: [string, string][] = (
    [
      ["Chassis no.", vehicle.chassisNo],
      ["Engine code / no.", vehicle.engineCode],
      ["Model code", vehicle.modelCode],
      ["Year of manufacture", vehicle.manufactureYearMonth || String(vehicle.year)],
      ["First registration", vehicle.registrationYearMonth],
      ["Mileage", `${vehicle.mileageKm.toLocaleString()} km`],
      ["Engine capacity", vehicle.engineCc ? `${vehicle.engineCc.toLocaleString()} cc` : ""],
      ["Fuel", vehicle.fuel],
      ["Transmission", vehicle.transmission],
      ["Drive", vehicle.drive],
      ["Steering", vehicle.steering],
      ["Seats", vehicle.seats ? String(vehicle.seats) : ""],
      ["Doors", vehicle.doors ? String(vehicle.doors) : ""],
      ["Colour", vehicle.color],
      ["Body type", vehicle.bodyType],
      ["Dimensions", vehicle.dimensions],
      ["Country of origin", vehicle.sourceCountry],
      ["Destination", "Mombasa, Kenya"],
    ] as [string, string | null | undefined][]
  ).filter(([, v]) => v !== null && v !== undefined && v !== "") as [string, string][];

  const lineItems: { desc: string; sub?: string; amount: number }[] = [
    {
      desc: `Motor vehicle — ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? " " + vehicle.trim : ""}`,
      sub: `Ref ${ref} · ${vehicle.condition}`,
      amount: vehiclePrice,
    },
  ];
  if (freight > 0) {
    lineItems.push({ desc: "Ocean freight", sub: `${vehicle.sourceCountry} to Mombasa (RORO/container)`, amount: freight });
  }
  lineItems.push({ desc: "Marine insurance", sub: "All-risk cover in transit", amount: insurance });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!vehicle) return;
    const data = new FormData(e.currentTarget);
    setSending(true);
    try {
      const message = `[Proforma invoice ${invoiceNo}${wantFinal ? " — customer also wants the FINAL invoice with KRA duty/excise/VAT" : ""}]${
        data.get("message") ? "\n" + data.get("message") : ""
      }`;
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
        `Proforma invoice ${invoiceNo}`,
        vehicleDetailBlock(vehicle, ref, window.location.origin),
        `CIF total: ${usd(cifTotal)}`,
        `Name: ${data.get("name")}`,
        `Phone: ${data.get("phone")}`,
        data.get("email") ? `Email: ${data.get("email")}` : null,
        wantFinal
          ? `Please assess KRA duty, excise & VAT and send the final invoice.`
          : `I'll arrange KRA clearance separately — please confirm this proforma.`,
      ]
        .filter(Boolean)
        .join("\n");
      window.open(whatsAppLink(waText), "_blank", "noopener,noreferrer");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-document, #invoice-document * { visibility: visible; }
          #invoice-document { position: absolute; left: 0; top: 0; width: 100%; }
          .invoice-no-print { display: none !important; }
        }
      `}</style>

      <div className="invoice-no-print flex items-center justify-between mb-4 sm:mb-5 flex-wrap gap-3">
        <button onClick={() => setSelectedId(null)} className="text-xs sm:text-sm font-medium" style={{ color: COLORS.burgundy }}>
          &larr; Choose a different vehicle
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-white"
          style={{ background: MAROON }}
        >
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      <div id="invoice-document" className="bg-white rounded-2xl border overflow-hidden text-[13px] sm:text-base" style={{ borderColor: COLORS.line }}>
        <div className="h-1.5 sm:h-2" style={{ background: BRAND_GRADIENT }} />

        {/* Header — solid maroon INVOICE block on the left, company lockup on the right. */}
        <div className="flex items-stretch">
          <div className="flex flex-col justify-center px-5 sm:px-9 py-6 sm:py-9 w-[42%]" style={{ background: MAROON }}>
            <span className="text-2xl sm:text-4xl font-extrabold text-white tracking-wide leading-none" style={{ fontFamily: FONT_DISPLAY }}>
              INVOICE
            </span>
            <span className="text-[9px] sm:text-[11px] text-white/80 mt-1.5 uppercase tracking-wider">Proforma</span>
          </div>
          <div className="flex-1 flex items-center gap-3 px-4 sm:px-7 py-4" style={{ background: COLORS.card }}>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg shrink-0" style={{ background: BRAND_GRADIENT }} />
            <div className="leading-tight">
              <div className="text-xs sm:text-lg font-extrabold" style={{ fontFamily: FONT_DISPLAY, color: MAROON }}>
                {COMPANY.name}
              </div>
              <div className="text-[8px] sm:text-[11px] mt-0.5" style={{ color: COLORS.slate }}>
                {COMPANY.poBox}
                <br />
                {COMPANY.addressLines.join(" · ")}
                <br />
                {COMPANY.phone} · {COMPANY.email} · {COMPANY.web}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8">
          {/* Bill-to + invoice meta. */}
          <div className="grid sm:grid-cols-3 border-2 rounded-lg overflow-hidden mb-3 sm:mb-4" style={{ borderColor: MAROON }}>
            <div className="p-2.5 sm:p-3.5 border-b sm:border-b-0 sm:border-r-2" style={{ borderColor: MAROON }}>
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: MAROON }}>
                Bill to
              </div>
              <div className="text-xs sm:text-sm font-semibold" style={{ color: COLORS.navy }}>
                {/* Filled from the request form once submitted; blank on a fresh print. */}
                &mdash;
              </div>
            </div>
            <div className="p-2.5 sm:p-3.5 border-b sm:border-b-0 sm:border-r-2" style={{ borderColor: MAROON }}>
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: MAROON }}>
                Invoice no.
              </div>
              <div className="text-xs sm:text-sm font-semibold" style={{ color: COLORS.navy }}>
                {invoiceNo}
              </div>
            </div>
            <div className="p-2.5 sm:p-3.5">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: MAROON }}>
                Invoice date
              </div>
              <div className="text-xs sm:text-sm font-semibold" style={{ color: COLORS.navy }}>
                {today.toLocaleDateString("en-GB")}
              </div>
              <div className="text-[9px] sm:text-[10px] mt-0.5" style={{ color: COLORS.slate }}>
                Due on receipt
              </div>
            </div>
          </div>

          {/* Vehicle details — replaces a freight invoice's consignee/BL/vessel block. */}
          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: MAROON }}>
            Vehicle
          </div>
          <div className="text-sm sm:text-base font-semibold mb-2" style={{ color: COLORS.navy }}>
            {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 border rounded-lg overflow-hidden mb-4 sm:mb-5" style={{ borderColor: COLORS.line }}>
            {specRows.map(([label, value], i) => (
              <div
                key={label}
                className="p-2 sm:p-2.5 border-b"
                style={{
                  borderColor: COLORS.line,
                  borderRight: (i % 2 === 0 ? "1px solid " : "") + COLORS.line,
                  background: i % 2 === 0 ? COLORS.card : "#fff",
                }}
              >
                <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wide" style={{ color: COLORS.slate }}>
                  {label}
                </div>
                <div className="text-[11px] sm:text-sm font-medium" style={{ color: COLORS.ink }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Line items — maroon header, like the Ferbil invoice. */}
          <div className="rounded-lg overflow-hidden border mb-3 sm:mb-4" style={{ borderColor: COLORS.line }}>
            <table className="w-full text-[10px] sm:text-sm">
              <thead>
                <tr style={{ background: MAROON }}>
                  <th className="text-left font-semibold text-white py-1.5 sm:py-2.5 px-2.5 sm:px-4">Description</th>
                  <th className="text-center font-semibold text-white py-1.5 sm:py-2.5 px-2 sm:px-4">Qty</th>
                  <th className="hidden sm:table-cell text-right font-semibold text-white py-1.5 sm:py-2.5 px-2.5 sm:px-4">Unit price</th>
                  <th className="text-right font-semibold text-white py-1.5 sm:py-2.5 px-2.5 sm:px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li, idx) => (
                  <tr key={li.desc} className="border-t" style={{ borderColor: COLORS.line, background: idx % 2 === 0 ? "#fff" : COLORS.card }}>
                    <td className="py-2 sm:py-3 px-2.5 sm:px-4" style={{ color: COLORS.ink }}>
                      <div className="font-medium">{li.desc}</div>
                      {li.sub && (
                        <div className="text-[9px] sm:text-[11px] mt-0.5" style={{ color: COLORS.slate }}>
                          {li.sub}
                        </div>
                      )}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-center" style={{ color: COLORS.ink }}>
                      1
                    </td>
                    <td className="hidden sm:table-cell py-2 sm:py-3 px-2.5 sm:px-4 text-right font-medium whitespace-nowrap" style={{ color: COLORS.ink }}>
                      {usd(li.amount)}
                    </td>
                    <td className="py-2 sm:py-3 px-2.5 sm:px-4 text-right font-medium whitespace-nowrap" style={{ color: COLORS.ink }}>
                      {usd(li.amount)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: MAROON }}>
                  <td colSpan={2} className="sm:hidden py-2 sm:py-3 px-2.5 sm:px-4 font-bold text-white text-xs sm:text-base">
                    Total (CIF, USD)
                  </td>
                  <td colSpan={3} className="hidden sm:table-cell py-2 sm:py-3 px-2.5 sm:px-4 font-bold text-white text-xs sm:text-base">
                    Total — CIF Mombasa (USD)
                  </td>
                  <td className="py-2 sm:py-3 px-2.5 sm:px-4 text-right font-bold text-white text-xs sm:text-base whitespace-nowrap">
                    {usd(cifTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bank details — the NCBA USD account, as on the Ferbil invoice. */}
          <div className="rounded-lg border mb-4 sm:mb-5" style={{ borderColor: COLORS.line }}>
            <div className="px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-white" style={{ background: MAROON }}>
              Payment — bank account details
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3">
              {BANK_DETAILS.map((b, i) => (
                <div key={b.label} className="p-2 sm:p-2.5 border-t" style={{ borderColor: COLORS.line, background: i % 2 === 0 ? COLORS.card : "#fff" }}>
                  <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wide" style={{ color: COLORS.slate }}>
                    {b.label}
                  </div>
                  <div className="text-[11px] sm:text-sm font-semibold" style={{ color: COLORS.ink }}>
                    {b.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-2.5 sm:p-3.5 mb-4 sm:mb-6 text-[10px] sm:text-xs leading-relaxed border-l-4"
            style={{ background: COLORS.card, color: COLORS.ink, borderColor: MAROON }}
          >
            <strong style={{ color: MAROON }}>Proforma invoice — CIF Mombasa.</strong> Covers the vehicle, ocean freight and
            marine insurance to Mombasa, in USD. KRA import duty, excise, VAT, IDF, RDL and registration are{" "}
            <strong>not included</strong> — KRA assesses these at clearance from its CRSP valuation for this exact unit, and a
            separate final invoice with the confirmed tax lines is issued once that figure is known.
          </div>

          {sent ? (
            <div className="invoice-no-print flex items-center gap-2 text-xs sm:text-sm font-medium py-2" style={{ color: MAROON }}>
              <CheckCircle2 size={17} /> Request sent. We&apos;ll follow up
              {wantFinal ? " with the final invoice including duty, excise & VAT." : " to confirm this proforma."}
            </div>
          ) : (
            <form className="invoice-no-print grid sm:grid-cols-2 gap-2 sm:gap-3" onSubmit={submit}>
              <div className="sm:col-span-2 flex items-start gap-2 text-[10px] sm:text-xs" style={{ color: COLORS.ink }}>
                <input type="checkbox" checked={wantFinal} onChange={(e) => setWantFinal(e.target.checked)} className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Also send the final invoice with KRA duty, excise &amp; VAT once assessed</span>
              </div>
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
                style={{ background: MAROON }}
              >
                {sending ? "Sending…" : "Send this invoice request"}
              </button>
            </form>
          )}

          <p className="text-[9px] sm:text-[11px] mt-5 sm:mt-6 pt-3 sm:pt-4 border-t" style={{ borderColor: COLORS.line, color: COLORS.slate }}>
            All amounts in USD. Prices are indicative and subject to exporter availability at time of purchase. This proforma
            is not a demand for payment; settle only against a final invoice confirmed by {COMPANY.name}.
          </p>
        </div>

        <div className="h-6 sm:h-8" style={{ background: MAROON }} />
      </div>

      <button
        onClick={() => goDetail(vehicle.id)}
        className="invoice-no-print text-xs sm:text-sm font-medium mt-4"
        style={{ color: COLORS.burgundy }}
      >
        View full listing &rarr;
      </button>
    </div>
  );
}
