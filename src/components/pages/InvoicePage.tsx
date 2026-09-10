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

  // Only the fields that matter on an import invoice — identity, powertrain,
  // condition. Seats/doors/dimensions/version/location are dropped.
  const specRows: [string, string][] = (
    [
      ["Chassis no.", vehicle.chassisNo],
      ["Engine no.", vehicle.engineCode],
      ["Model code", vehicle.modelCode],
      ["Year", vehicle.manufactureYearMonth || String(vehicle.year)],
      ["Mileage", `${vehicle.mileageKm.toLocaleString()} km`],
      ["Engine", vehicle.engineCc ? `${vehicle.engineCc.toLocaleString()} cc` : ""],
      ["Fuel", vehicle.fuel],
      ["Transmission", vehicle.transmission],
      ["Drive", vehicle.drive],
      ["Steering", vehicle.steering],
      ["Colour", vehicle.color],
      ["Body", vehicle.bodyType],
    ] as [string, string | null | undefined][]
  ).filter(([, v]) => v !== null && v !== undefined && v !== "") as [string, string][];

  const lineItems: { desc: string; amount: number }[] = [
    { desc: `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? " " + vehicle.trim : ""} — vehicle`, amount: vehiclePrice },
  ];
  if (freight > 0) lineItems.push({ desc: `Ocean freight — ${vehicle.sourceCountry} to Mombasa`, amount: freight });
  lineItems.push({ desc: "Marine insurance", amount: insurance });

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
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-document, #invoice-document * { visibility: visible; }
          #invoice-document { position: absolute; left: 0; top: 0; width: 100%; border: 0 !important; border-radius: 0 !important; }
          .invoice-no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: A4; margin: 12mm; }
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

      <div id="invoice-document" className="bg-white rounded-xl border overflow-hidden text-[12px]" style={{ borderColor: MAROON }}>
        <div className="h-1.5" style={{ background: BRAND_GRADIENT }} />

        {/* Header — solid maroon INVOICE block + company box on the right. */}
        <div className="flex items-stretch">
          <div className="flex flex-col justify-center px-5 sm:px-7 py-5 w-[38%]" style={{ background: MAROON }}>
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide leading-none" style={{ fontFamily: FONT_DISPLAY }}>
              INVOICE
            </span>
            <span className="text-[9px] text-white/80 mt-1 uppercase tracking-wider">Proforma · USD</span>
          </div>
          <div className="flex-1 flex items-center gap-2.5 px-3 sm:px-5 py-3" style={{ background: COLORS.card }}>
            <div className="w-8 h-8 rounded-md shrink-0" style={{ background: BRAND_GRADIENT }} />
            <div className="leading-snug">
              <div className="text-[13px] sm:text-[15px] font-extrabold" style={{ fontFamily: FONT_DISPLAY, color: MAROON }}>
                {COMPANY.name}
              </div>
              <div className="text-[9px] sm:text-[10px] mt-0.5" style={{ color: COLORS.slate }}>
                {COMPANY.poBox} · {COMPANY.addressLines.join(", ")}
                <br />
                {COMPANY.phone} · {COMPANY.email} · {COMPANY.web}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-5 space-y-3">
          {/* Bill-to + invoice meta — two matching boxes. */}
          <div className="grid grid-cols-2 gap-3">
            <Box title="Bill to">
              <div className="font-semibold" style={{ color: COLORS.navy }}>
                &mdash;
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: COLORS.slate }}>
                Buyer name added on request
              </div>
            </Box>
            <Box title="Invoice">
              <Row k="No." v={invoiceNo} />
              <Row k="Date" v={today.toLocaleDateString("en-GB")} />
              <Row k="Currency" v="USD" />
              <Row k="Terms" v="Due on receipt" />
            </Box>
          </div>

          {/* Vehicle box. */}
          <Box title="Vehicle">
            <div className="text-[13px] font-bold mb-2" style={{ color: COLORS.navy }}>
              {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
              {specRows.map(([label, value]) => (
                <Row key={label} k={label} v={value} />
              ))}
            </div>
          </Box>

          {/* Charges box — line-item table inside. */}
          <Box title="Charges (USD)" pad={false}>
            <table className="w-full text-[11px]">
              <tbody>
                {lineItems.map((li) => (
                  <tr key={li.desc} className="border-b" style={{ borderColor: COLORS.line }}>
                    <td className="py-1.5 px-3" style={{ color: COLORS.ink }}>
                      {li.desc}
                    </td>
                    <td className="py-1.5 px-3 text-right font-medium whitespace-nowrap" style={{ color: COLORS.ink }}>
                      {usd(li.amount)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: MAROON }}>
                  <td className="py-2 px-3 font-bold text-white">Total — CIF Mombasa</td>
                  <td className="py-2 px-3 text-right font-bold text-white whitespace-nowrap">{usd(cifTotal)}</td>
                </tr>
              </tbody>
            </table>
          </Box>

          {/* Bank box. */}
          <Box title="Payment — NCBA USD account">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
              {BANK_DETAILS.map((b) => (
                <Row key={b.label} k={b.label} v={b.value} />
              ))}
            </div>
          </Box>

          <p className="text-[9px] leading-relaxed" style={{ color: COLORS.slate }}>
            Proforma — CIF Mombasa, all amounts in USD. KRA import duty, excise, VAT, IDF, RDL and registration are not
            included; these are assessed by KRA at clearance and billed on a separate final invoice. Not a demand for
            payment — settle only against a final invoice confirmed by {COMPANY.name}.
          </p>
        </div>

        <div className="h-5" style={{ background: MAROON }} />
      </div>

      <div className="invoice-no-print mt-4">
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

        <button
          onClick={() => goDetail(vehicle.id)}
          className="block text-xs sm:text-sm font-medium mt-4"
          style={{ color: COLORS.burgundy }}
        >
          View full listing &rarr;
        </button>
      </div>
    </div>
  );
}

function Box({ title, children, pad = true }: { title: string; children: React.ReactNode; pad?: boolean }) {
  return (
    <section className="rounded-lg border overflow-hidden" style={{ borderColor: MAROON }}>
      <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white" style={{ background: MAROON }}>
        {title}
      </div>
      <div className={pad ? "p-3" : ""}>{children}</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="leading-tight">
      <span className="text-[8px] font-bold uppercase tracking-wide block" style={{ color: COLORS.slate }}>
        {k}
      </span>
      <span className="text-[11px] font-semibold" style={{ color: COLORS.ink }}>
        {v}
      </span>
    </div>
  );
}
