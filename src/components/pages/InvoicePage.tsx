"use client";

import { useState } from "react";
import { ArrowLeft, Printer, CheckCircle2, Search } from "lucide-react";
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

// The magenta/maroon of Ferbil Interfreight's printed invoice - used for the
// INVOICE block, the line-item table header and the footer band.
const MAROON = "#8B2A5B";
// The site's own orange-to-magenta-to-violet logo sweep - kept for the mark
// and the thin top/bottom accents so the document still reads as ours.
const BRAND_GRADIENT = "linear-gradient(90deg, #F2762E 0%, #D6336C 50%, #3B1F63 100%)";

function usd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * The customer-facing **proforma invoice** - vehicle CIF (cost, insurance &
 * freight to Mombasa) only, all in USD, laid out and branded like Ferbil
 * Interfreight's own invoice (maroon INVOICE block, company + NCBA bank
 * block, maroon line-item table). Sized deliberately small/compact on
 * mobile - every font size and padding below carries a smaller mobile value
 * and a larger `sm:` one, not the other way round, since this is viewed on a
 * phone screen far more than a desktop one.
 *
 * KRA import duty / excise / VAT / registration are deliberately NOT on this
 * document: those are assessed by KRA at clearance (off its CRSP valuation,
 * not the invoice price), and the team issues a separate **final invoice**
 * with the confirmed tax lines once that figure is known.
 *
 * Two steps from here, both starting from a picked vehicle:
 *  1. "Send invoice to" - a short compulsory form (who it's for) that gates
 *     the document. Filling it does NOT file an enquiry or open WhatsApp -
 *     it only unlocks the CIF invoice below, instantly.
 *  2. Once viewing it, requesting the *other* document - the final invoice
 *     that adds KRA duty/excise/VAT and Ferbil's in-house clearing - is what
 *     actually files an enquiry (that one can't be shown instantly since
 *     it's prepared by the team, so it's a request, not something rendered
 *     here).
 *
 * With nothing selected it's just the homepage browsing grid - a car is
 * picked, and its invoice requested, through the familiar detail page.
 */
export function InvoicePage({
  vehicles,
  landedMap,
  preselectedId,
  goDetail,
  onBack,
}: {
  vehicles: PublicVehicle[];
  landedMap: Record<string, LandedCost>;
  preselectedId: string | null;
  goDetail: (id: string) => void;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(preselectedId);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sending, setSending] = useState(false);
  // Gates the invoice document - set once the "Send invoice to" form is
  // submitted. Also supplies the "Bill to" name/contact on the document.
  const [lead, setLead] = useState<{ name: string; phone: string; email: string } | null>(null);
  // Set only once the *separate* clearance-invoice request below actually
  // files an enquiry - distinct from `lead`, which never does.
  const [clearanceRequested, setClearanceRequested] = useState(false);

  const vehicle = vehicles.find((v) => v.id === selectedId) || null;

  if (!vehicle) {
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? vehicles.filter((v) => `${v.make} ${v.model} ${v.trim ?? ""} ${v.year}`.toLowerCase().includes(term))
      : vehicles;
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    function goToPage(p: number) {
      setPage(p);
      document.getElementById("invoice-catalogue")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function submitSearch(e: React.FormEvent) {
      e.preventDefault();
      setSearchTerm(keyword);
      setPage(1);
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

        <form onSubmit={submitSearch} className="flex items-center gap-1.5 sm:gap-2 max-w-2xl mb-4 sm:mb-6">
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="shrink-0 w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
            style={{ background: COLORS.card, color: COLORS.navy }}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 rounded-full p-[1.5px]" style={{ background: "linear-gradient(90deg, #D6336C 0%, #3B1F63 100%)" }}>
            <div className="flex items-center gap-2 rounded-full bg-white pl-3 sm:pl-4 pr-1.5 sm:pr-4 py-1.5 sm:py-3">
              <Search size={15} color={COLORS.slate} className="shrink-0 hidden sm:block" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search make or model"
                className="flex-1 min-w-0 text-xs sm:text-sm outline-none bg-transparent"
                style={{ color: COLORS.ink }}
              />
              <button type="submit" aria-label="Search" className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center sm:hidden" style={{ color: COLORS.slate }}>
                <Search size={15} />
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="hidden sm:block shrink-0 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full text-sm font-semibold text-white"
            style={{ background: COLORS.burgundy }}
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-5">
          {paged.map((v) => (
            <VehicleCard key={v.id} vehicle={v} onView={() => goDetail(v.id)} />
          ))}
        </div>
        {paged.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: COLORS.slate }}>
            No cars match &ldquo;{searchTerm}&rdquo;.
          </p>
        )}
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

  // Only the fields that matter on an import invoice - identity, powertrain,
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

  /** Unlocks the invoice document - purely local, never files an enquiry. */
  function submitDeliveryForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "");
    const phone = String(data.get("phone") ?? "");
    const email = String(data.get("email") ?? "");
    setLead({ name, phone, email });
  }

  /** The actual enquiry-filing action - requests the final invoice that
   * includes clearance, reusing the contact details already on `lead`. */
  async function requestClearanceInvoice() {
    if (!vehicle || !lead) return;
    setSending(true);
    try {
      const message = `[Invoice ${invoiceNo} issued, CIF ${usd(cifTotal)} - customer requests final invoice incl. KRA duty/excise/VAT + in-house clearing]`;
      await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.id, name: lead.name, phone: lead.phone, email: lead.email || null, message }),
      });
      const waText = [
        `Invoice request ${invoiceNo}`,
        vehicleDetailBlock(vehicle, ref, window.location.origin),
        `CIF total: ${usd(cifTotal)}`,
        `Name: ${lead.name}`,
        `Phone: ${lead.phone}`,
        lead.email ? `Email: ${lead.email}` : null,
        `Please send the final invoice - KRA duty, excise & VAT, plus your in-house clearing.`,
      ]
        .filter(Boolean)
        .join("\n");
      window.open(whatsAppLink(waText), "_blank", "noopener,noreferrer");
      setClearanceRequested(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-2.5 sm:px-6 py-3 sm:py-8">
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

      <div className="invoice-no-print flex items-center justify-between mb-3 sm:mb-5 flex-wrap gap-2 sm:gap-3">
        <button onClick={() => setSelectedId(null)} className="text-xs sm:text-sm font-medium" style={{ color: COLORS.burgundy }}>
          &larr; Choose a different vehicle
        </button>
        {lead && (
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-white"
            style={{ background: MAROON }}
          >
            <Printer size={13} /> Print / Save as PDF
          </button>
        )}
      </div>

      {!lead ? (
        <div className="invoice-no-print bg-white rounded-2xl border p-5 sm:p-7" style={{ borderColor: MAROON }}>
          <div className="text-base sm:text-xl font-bold mb-1" style={{ fontFamily: FONT_DISPLAY, color: MAROON }}>
            Send invoice to
          </div>
          <div className="text-xs sm:text-sm mb-3 sm:mb-4" style={{ color: COLORS.slate }}>
            {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim} - enter who this CIF invoice (vehicle,
            freight &amp; insurance to Mombasa, USD) is for, then view it below.
          </div>
          <form className="grid gap-2 sm:gap-3" onSubmit={submitDeliveryForm}>
            <input name="name" required placeholder="Full name" className="border rounded-lg px-3 py-2 text-xs sm:text-sm" style={{ borderColor: "#D8DCE3" }} />
            <input name="email" type="email" required placeholder="Email address" className="border rounded-lg px-3 py-2 text-xs sm:text-sm" style={{ borderColor: "#D8DCE3" }} />
            <input name="phone" placeholder="Phone number (optional)" className="border rounded-lg px-3 py-2 text-xs sm:text-sm" style={{ borderColor: "#D8DCE3" }} />
            <button
              type="submit"
              className="py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white"
              style={{ background: MAROON }}
            >
              View invoice
            </button>
          </form>
        </div>
      ) : (
        <>
          <div id="invoice-document" className="bg-white rounded-xl border overflow-hidden text-[10px] sm:text-[12px]" style={{ borderColor: MAROON }}>
            <div className="h-1 sm:h-1.5" style={{ background: BRAND_GRADIENT }} />

            {/* Header - solid maroon INVOICE block + company box on the right. */}
            <div className="flex items-stretch">
              <div className="flex flex-col justify-center px-3 sm:px-7 py-3 sm:py-5 w-[38%]" style={{ background: MAROON }}>
                <span className="text-lg sm:text-3xl font-extrabold text-white tracking-wide leading-none" style={{ fontFamily: FONT_DISPLAY }}>
                  INVOICE
                </span>
                <span className="text-[7px] sm:text-[9px] text-white/80 mt-1 uppercase tracking-wider">Proforma · USD</span>
              </div>
              <div className="flex-1 flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-5 py-2 sm:py-3" style={{ background: COLORS.card }}>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md shrink-0" style={{ background: BRAND_GRADIENT }} />
                <div className="leading-snug">
                  <div className="text-[11px] sm:text-[15px] font-extrabold" style={{ fontFamily: FONT_DISPLAY, color: MAROON }}>
                    {COMPANY.name}
                  </div>
                  <div className="text-[7px] sm:text-[10px] mt-0.5" style={{ color: COLORS.slate }}>
                    {COMPANY.poBox} · {COMPANY.addressLines.join(", ")}
                    <br />
                    {COMPANY.phone} · {COMPANY.email} · {COMPANY.web}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-2.5 sm:p-5 space-y-2 sm:space-y-3">
              {/* Bill-to + invoice meta - two matching boxes. */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <Box title="Bill to">
                  {lead.name ? (
                    <>
                      <div className="font-semibold" style={{ color: COLORS.navy }}>
                        {lead.name}
                      </div>
                      <div className="text-[8px] sm:text-[10px] mt-0.5" style={{ color: COLORS.slate }}>
                        {lead.phone}
                        {lead.email ? ` · ${lead.email}` : ""}
                      </div>
                    </>
                  ) : (
                    <div className="text-[8px] sm:text-[10px]" style={{ color: COLORS.slate }}>
                      To be confirmed
                    </div>
                  )}
                </Box>
                <Box title="Invoice">
                  <Row k="No." v={invoiceNo} />
                  <Row k="Date" v={today.toLocaleDateString("en-GB")} />
                  <Row k="Currency" v="USD" />
                  <Row k="Terms" v="Due on receipt" />
                </Box>
              </div>

              {/* Total - the one and only figure on this document, no
                 vehicle/freight/insurance breakdown. */}
              <Box title="Total - CIF Mombasa (USD)">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <div className="text-[8px] sm:text-[11px]" style={{ color: COLORS.slate }}>
                    Vehicle, ocean freight &amp; marine insurance to Mombasa, all-in.
                  </div>
                  <div className="text-base sm:text-2xl font-extrabold whitespace-nowrap" style={{ color: MAROON, fontFamily: FONT_DISPLAY }}>
                    {usd(cifTotal)}
                  </div>
                </div>
              </Box>

              {/* Vehicle box. */}
              <Box title="Vehicle">
                <div className="text-[11px] sm:text-[13px] font-bold mb-1.5 sm:mb-2" style={{ color: COLORS.navy }}>
                  {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2.5 sm:gap-x-4 gap-y-1 sm:gap-y-1.5">
                  {specRows.map(([label, value]) => (
                    <Row key={label} k={label} v={value} />
                  ))}
                </div>
              </Box>

              {/* Bank box. */}
              <Box title="Payment - NCBA USD account">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2.5 sm:gap-x-4 gap-y-1 sm:gap-y-1.5">
                  {BANK_DETAILS.map((b) => (
                    <Row key={b.label} k={b.label} v={b.value} />
                  ))}
                </div>
              </Box>

              <p className="text-[7px] sm:text-[9px] leading-relaxed" style={{ color: COLORS.slate }}>
                Proforma - CIF Mombasa, all amounts in USD. KRA import duty, excise, VAT, IDF, RDL and registration are
                not included; request below for a final invoice with those confirmed, plus clearing - handled
                entirely in-house by {COMPANY.name}, no third-party agent. Not a demand for payment - settle only
                against a final invoice confirmed by {COMPANY.name}.
              </p>
            </div>

            <div className="h-3 sm:h-5" style={{ background: MAROON }} />
          </div>

          <div className="invoice-no-print mt-3 sm:mt-4">
            {clearanceRequested ? (
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium py-2" style={{ color: MAROON }}>
                <CheckCircle2 size={17} /> Requested. We&apos;ll follow up with the invoice that includes clearance -
                KRA duty, excise &amp; VAT, plus in-house clearing.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border p-5" style={{ borderColor: MAROON }}>
                <div className="text-xs sm:text-sm font-semibold mb-2" style={{ color: COLORS.navy }}>
                  Want the invoice that includes clearance?
                </div>
                <div className="text-xs mb-3" style={{ color: COLORS.slate }}>
                  Request the final invoice with KRA duty, excise &amp; VAT plus {COMPANY.name}&apos;s in-house
                  clearing - no third-party agent.
                </div>
                <button
                  onClick={requestClearanceInvoice}
                  disabled={sending}
                  className="w-full py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: MAROON }}
                >
                  {sending ? "Sending…" : "Request clearance invoice"}
                </button>
              </div>
            )}
            <button onClick={() => goDetail(vehicle.id)} className="block text-xs sm:text-sm font-medium mt-3" style={{ color: COLORS.burgundy }}>
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
      <div className="px-2.5 sm:px-3 py-1 text-[7px] sm:text-[9px] font-bold uppercase tracking-wider text-white" style={{ background: MAROON }}>
        {title}
      </div>
      <div className={pad ? "p-2 sm:p-3" : ""}>{children}</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="leading-tight">
      <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wide block" style={{ color: COLORS.slate }}>
        {k}
      </span>
      <span className="text-[9px] sm:text-[11px] font-semibold" style={{ color: COLORS.ink }}>
        {v}
      </span>
    </div>
  );
}
