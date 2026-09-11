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
  const [sending, setSending] = useState(false);
  // Gates the actual invoice (its CIF figure included) behind a short
  // sign-up — no name/contact on file, no invoice shown. Once set, this
  // also supplies the "Bill to" name on the printed document.
  const [lead, setLead] = useState<{ name: string; phone: string; email: string } | null>(null);

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

  /**
   * Signing up is compulsory to see the invoice at all, and getting the
   * final clearing quote afterward is compulsory too — there's no "import
   * only, I'll clear it myself" option any more: Ferbil clears every unit
   * in-house, so every invoice request is also a clearing-quote request.
   */
  async function submitSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!vehicle) return;
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "");
    const phone = String(data.get("phone") ?? "");
    const email = String(data.get("email") ?? "");
    setSending(true);
    try {
      const message = `[Invoice ${invoiceNo} issued, CIF ${usd(cifTotal)} — compulsory follow-up: final quote incl. KRA duty/excise/VAT + in-house clearing]`;
      await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.id, name, phone, email: email || null, message }),
      });
      setLead({ name, phone, email });
      const waText = [
        `Invoice request ${invoiceNo}`,
        vehicleDetailBlock(vehicle, ref, window.location.origin),
        `CIF total: ${usd(cifTotal)}`,
        `Name: ${name}`,
        `Phone: ${phone}`,
        email ? `Email: ${email}` : null,
        `Please send the final quote — KRA duty, excise & VAT, plus your in-house clearing — this is compulsory before I proceed.`,
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
        {lead && (
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-white"
            style={{ background: MAROON }}
          >
            <Printer size={14} /> Print / Save as PDF
          </button>
        )}
      </div>

      {!lead ? (
        // Compulsory sign-up gate — no name/contact on file yet, so no
        // invoice (and no CIF figure) is shown. Submitting doubles as the
        // request for the compulsory next step too: the final quote with
        // KRA duty/excise/VAT and in-house clearing.
        <div className="invoice-no-print bg-white rounded-xl border p-5 sm:p-7" style={{ borderColor: MAROON }}>
          <div className="text-lg sm:text-xl font-bold mb-1" style={{ fontFamily: FONT_DISPLAY, color: MAROON }}>
            Sign up to get your invoice
          </div>
          <div className="text-xs sm:text-sm mb-4" style={{ color: COLORS.slate }}>
            {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim} — a few details and your proforma invoice (CIF
            Mombasa, USD) is ready to view and print. This also requests the compulsory next step: the final quote with
            KRA duty, excise &amp; VAT, cleared in-house by {COMPANY.name} — no third-party clearing agent.
          </div>
          <form className="grid sm:grid-cols-2 gap-2 sm:gap-3" onSubmit={submitSignup}>
            <input name="name" required placeholder="Full name" className="border rounded-lg px-3 py-2 text-xs sm:text-sm" style={{ borderColor: "#D8DCE3" }} />
            <input name="phone" required placeholder="Phone number" className="border rounded-lg px-3 py-2 text-xs sm:text-sm" style={{ borderColor: "#D8DCE3" }} />
            <input
              name="email"
              type="email"
              placeholder="Email (optional)"
              className="border rounded-lg px-3 py-2 text-xs sm:text-sm sm:col-span-2"
              style={{ borderColor: "#D8DCE3" }}
            />
            <button
              type="submit"
              disabled={sending}
              className="sm:col-span-2 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: MAROON }}
            >
              {sending ? "Signing up…" : "Sign up & view invoice"}
            </button>
          </form>
        </div>
      ) : (
        <>
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
                    {lead.name}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: COLORS.slate }}>
                    {lead.phone}
                    {lead.email ? ` · ${lead.email}` : ""}
                  </div>
                </Box>
                <Box title="Invoice">
                  <Row k="No." v={invoiceNo} />
                  <Row k="Date" v={today.toLocaleDateString("en-GB")} />
                  <Row k="Currency" v="USD" />
                  <Row k="Terms" v="Due on receipt" />
                </Box>
              </div>

              {/* Total — the one and only figure on this document, no
                 vehicle/freight/insurance breakdown. */}
              <Box title="Total — CIF Mombasa (USD)">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] sm:text-[11px]" style={{ color: COLORS.slate }}>
                    Vehicle, ocean freight &amp; marine insurance to Mombasa, all-in.
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold whitespace-nowrap" style={{ color: MAROON, fontFamily: FONT_DISPLAY }}>
                    {usd(cifTotal)}
                  </div>
                </div>
              </Box>

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

              {/* Bank box. */}
              <Box title="Payment — NCBA USD account">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                  {BANK_DETAILS.map((b) => (
                    <Row key={b.label} k={b.label} v={b.value} />
                  ))}
                </div>
              </Box>

              <p className="text-[9px] leading-relaxed" style={{ color: COLORS.slate }}>
                Proforma — CIF Mombasa, all amounts in USD. KRA import duty, excise, VAT, IDF, RDL and registration are
                not included; a final quote with those confirmed, plus clearing — handled entirely in-house by{" "}
                {COMPANY.name}, no third-party agent — follows as a compulsory next step. Not a demand for payment —
                settle only against a final invoice confirmed by {COMPANY.name}.
              </p>
            </div>

            <div className="h-5" style={{ background: MAROON }} />
          </div>

          <div className="invoice-no-print mt-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium py-2" style={{ color: MAROON }}>
              <CheckCircle2 size={17} /> Signed up. We&apos;ll follow up with the compulsory final quote — KRA duty,
              excise &amp; VAT, plus clearing handled in-house.
            </div>
            <button onClick={() => goDetail(vehicle.id)} className="block text-xs sm:text-sm font-medium mt-2" style={{ color: COLORS.burgundy }}>
              View full listing &rarr;
            </button>
          </div>
        </>
      )}
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
