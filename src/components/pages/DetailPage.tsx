"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, Heart, MapPin, Printer, Share2, X } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import { computeFreightUsd } from "@/lib/landedCost";
import { whatsAppLink, vehicleDetailBlock } from "@/lib/whatsapp";
import { shareVehicle } from "@/lib/share";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import type { Page } from "@/components/AutoBridgeApp";
import { CostLadder } from "@/components/vehicles/CostLadder";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { VehicleGallery } from "@/components/vehicles/VehicleGallery";
import { MorePhotosPoster } from "@/components/vehicles/MorePhotosPoster";
import { SafeImg } from "@/components/vehicles/SafeImg";

/**
 * A fixed checklist of common equipment most vehicles in this catalogue
 * carry - checked against whatever the scraper actually captured in
 * vehicle.features. Unlike the old free-form pill list (which just showed
 * whatever features happened to be present, and rendered nothing at all for
 * a vehicle with none captured), this always renders the same list with a
 * tick or a cross, so every vehicle gets this section - including ones the
 * scraper couldn't pull a features list for at all.
 */
const STANDARD_FEATURES = [
  "A/C",
  "Power Steering",
  "Power Window",
  "ABS",
  "Airbag",
  "Alloy Wheels",
  "Navigation",
  "Back Camera",
  "Keyless Entry",
  "Leather Seat",
];

function hasFeature(features: string[], standard: string): boolean {
  const needle = standard.toLowerCase();
  return features.some((f) => f.toLowerCase().includes(needle));
}

/**
 * Full spec sheet as a real vertical table - one row per spec, label on the
 * left and value on the right, spreading downward rather than sideways.
 * Lives in the narrow price sidebar, where a row-per-line layout reads far
 * better than a wide table needing its own horizontal scroll. The numbered
 * spec rows only show fields the scraper actually captured (older/
 * hand-entered vehicles render fewer of them), and the standard-features
 * checklist below only renders when a features list actually exists -
 * with none captured, "unsure" is left blank rather than shown as a wall
 * of red crosses that would read as "confirmed missing."
 */
// Layout constants for the desktop column-balancing fill (see the layout
// effect in DetailPage). They mirror the Tailwind classes used below, so
// keep them in sync if those classes change.
const TEASER_BOX_MT = 12; // mt-3 above the "More from our stock" box
const TEASER_BOX_CHROME = 52; // p-3 + 1px border top and bottom + title line and its mb-2.5
const TEASER_BOX_PAD_X = 26; // p-3 + 1px border, left and right
const ENQUIRY_MB = 24; // mb-6 under the enquiry box
const CARD_GAP = 10; // gap-2.5
const CARD_TEXT_H = 80; // VehicleCard's text block under the photo, plus its border (fallback before one renders)
const COMPACT_ROW_H = 72; // h-[72px] on CompactVehicleRow
const COMPACT_GAP = 8; // gap-2

/** One-line vehicle link used to fill space too short for a full VehicleCard. */
function CompactVehicleRow({ vehicle: v, onView }: { vehicle: PublicVehicle; onView: () => void }) {
  const totalUsd = v.sellingPriceUsd + computeFreightUsd(v.sourceCountry, v.freightIncluded) + v.insuranceUsd;
  return (
    <a
      href={`/car/${v.id}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        onView();
      }}
      className="flex items-center gap-3 h-[72px] rounded-xl border bg-white overflow-hidden pr-3"
      style={{ borderColor: COLORS.line }}
    >
      <div className="relative h-full w-24 shrink-0" style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}>
        <SafeImg srcs={[v.imageUrl, ...v.imageUrls]} alt={`${v.year} ${v.make} ${v.model}`} loading="lazy" iconSize={16} className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold truncate" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          {v.year} {v.make} {v.model} {v.trim}
        </div>
        <div className="text-sm font-bold" style={{ color: COLORS.burgundy, fontFamily: FONT_DISPLAY }}>
          {formatUsd(totalUsd)}
        </div>
        <div className="text-[11px] truncate" style={{ color: COLORS.slate }}>
          {v.mileageKm.toLocaleString()} km · {v.sourceCountry}
        </div>
      </div>
    </a>
  );
}

function SpecTable({ vehicle }: { vehicle: PublicVehicle }) {
  const rows: [string, string | number | null][] = [
    ["Ref. No.", vehicle.refNo],
    ["Chassis No.", vehicle.chassisNo],
    ["Model Code", vehicle.modelCode],
    ["Engine Code", vehicle.engineCode],
    ["Steering", vehicle.steering],
    ["Location", vehicle.location],
    ["Version/Class", vehicle.versionClass],
    ["Doors", vehicle.doors],
    ["Dimensions", vehicle.dimensions],
    ["Weight", vehicle.weightKg ? `${vehicle.weightKg.toLocaleString()} kg` : null],
    ["Registration", vehicle.registrationYearMonth],
    ["Manufactured", vehicle.manufactureYearMonth],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "") as [string, string | number][];

  if (rows.length === 0 && vehicle.features.length === 0) return null;

  return (
    <div className="rounded-2xl border p-4 mb-6" style={{ borderColor: COLORS.line }}>
      {rows.length > 0 && (
        <table className="w-full border-collapse mb-4 pb-4 border-b" style={{ borderColor: COLORS.line }}>
          <tbody>
            {rows.map(([label, value], i) => (
              <tr key={label} style={{ background: i % 2 === 0 ? COLORS.card : "transparent" }}>
                <td className="text-xs py-2 pl-2 pr-3 align-top" style={{ color: COLORS.slate }}>
                  {label}
                </td>
                <td className="text-sm font-medium py-2 pr-2 text-right align-top" style={{ color: COLORS.ink }}>
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Only shown when the scraper actually captured a features list for
         this vehicle - with none at all, every item would show a red cross,
         which reads as "confirmed missing" when the truth is just "unknown."
         Leaving the whole section out is more honest than guessing. */}
      {vehicle.features.length > 0 && (
        <>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.slate }}>
            Standard features
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {STANDARD_FEATURES.map((f) => {
              const present = hasFeature(vehicle.features, f);
              return (
                <div key={f} className="flex items-center gap-1.5 text-xs">
                  {present ? <Check size={14} color="#16A34A" className="shrink-0" /> : <X size={14} color="#DC2626" className="shrink-0" />}
                  <span style={{ color: present ? COLORS.ink : COLORS.slate }}>{f}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function DetailPage({
  vehicle,
  landed,
  favorites,
  toggleFavorite,
  vehicles,
  goDetail,
  setPage,
  goQuote,
  onBack,
}: {
  vehicle: PublicVehicle;
  landed: LandedCost;
  favorites: Set<string>;
  onBack: () => void;
  toggleFavorite: (id: string) => void;
  vehicles: PublicVehicle[];
  goDetail: (id: string) => void;
  setPage: (p: Page) => void;
  goQuote: () => void;
}) {
  const [reserved, setReserved] = useState(false);
  const [sending, setSending] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const desktopMessageRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileMessageRef = useRef<HTMLTextAreaElement | null>(null);

  // CIF Mombasa in USD - vehicle + freight + insurance (landed.freight and
  // landed.insurance are already USD; landed.total is the KES conversion,
  // which the site no longer shows).
  const cifUsd = vehicle.sellingPriceUsd + landed.freight + landed.insurance;

  async function onShare() {
    // The native share sheet already gives its own feedback (it's a
    // system UI) - only the clipboard-copy fallback is silent otherwise,
    // so that's the one result worth a toast here.
    const result = await shareVehicle(vehicle, cifUsd);
    if (result === "copied") {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  }

  /**
   * The fastest path to "I want more photos/details" - rather than a
   * separate WhatsApp/email channel, this jumps straight to the existing
   * enquiry form (already wired to notify the team) and pre-fills the
   * request so the visitor only has to add their name and phone.
   */
  function requestMoreInfo(ref: React.RefObject<HTMLTextAreaElement | null>) {
    const el = ref.current;
    if (!el) return;
    if (!el.value.trim()) el.value = "Please send more photos and full details about this vehicle.";
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus();
  }
  // Same make+model first - "more of the same car" is what a shopper
  // actually wants after clicking a specific listing - then fill any
  // remaining slots with the wider body-type/brand match as before.
  const others = vehicles.filter((v) => v.id !== vehicle.id && v.eligible);
  const sameModel = others.filter((v) => v.make === vehicle.make && v.model === vehicle.model);
  const wider = others.filter((v) => !(v.make === vehicle.make && v.model === vehicle.model) && (v.bodyType === vehicle.bodyType || v.make === vehicle.make));
  const similar = [...sameModel, ...wider].slice(0, 6); // divisible by both 2 (mobile) and 3 (desktop) - no dangling gap in either grid

  // The sticky right column's "More from our stock" teaser draws from a
  // wider pool than `similar` - it's explicitly "more stock", not "similar
  // vehicles" (that's the separate, correctly-strict section below), so
  // when a vehicle's make/body-type is thin in the catalogue (confirmed
  // live: a Mitsubishi Mirage wagon had only 1 other genuine match) it pads
  // out with any other eligible vehicle rather than being stuck at 1-2
  // cards no matter how much vertical room the left column actually has.
  // Pool is deliberately deep: on a vehicle with a long left column (big
  // photo gallery, long spec table) the right column needs many cards to
  // reach the bottom, and a shallow pool left the rest of it empty.
  const teaserPool = [...similar, ...others.filter((v) => !similar.some((s) => s.id === v.id))].slice(0, 60);

  // Desktop only: keeps both columns the same height with no empty space
  // under either one. The right column's "More from our stock" box gets as
  // many full card rows as fit beside the left column, then compact
  // one-line rows fill whatever is left over. If the right column's fixed
  // block is itself taller than the left column, compact rows are added
  // under the enquiry form instead. Re-measured with a ResizeObserver, not
  // just once: the left column keeps growing after first paint (photos
  // loading, the enquiry form swapping to its thank-you state), and a
  // one-time measurement is what left the gaps.
  // Refs sit on plain, unstretched wrappers so offsetHeight is true content
  // height, not the CSS-grid-stretched height of the grid cell.
  const leftContentRef = useRef<HTMLDivElement>(null);
  const fixedRightRef = useRef<HTMLDivElement>(null);
  const teaserGridRef = useRef<HTMLDivElement>(null);
  const [fill, setFill] = useState({ cardRows: 0, compact: 0, leftCompact: 0 });

  // Re-run once the card grid first mounts, so the observer can watch it.
  const hasTeaserCards = fill.cardRows > 0;
  useLayoutEffect(() => {
    const leftEl = leftContentRef.current;
    const fixedEl = fixedRightRef.current;
    if (!leftEl || !fixedEl) return;

    function recompute() {
      if (!leftEl || !fixedEl) return;
      if (window.innerWidth < 1024 || teaserPool.length === 0) {
        setFill((prev) => (prev.cardRows || prev.compact || prev.leftCompact ? { cardRows: 0, compact: 0, leftCompact: 0 } : prev));
        return;
      }
      const leftH = leftEl.offsetHeight;
      const fixedH = fixedEl.offsetHeight;
      const colW = fixedEl.offsetWidth;

      // A rendered card's real height wins; before any card exists, estimate
      // it from the column width (VehicleCard is a 4:3 photo plus a
      // fixed-height text block).
      const renderedCard = teaserGridRef.current?.children[0] as HTMLElement | undefined;
      const cardW = (colW - TEASER_BOX_PAD_X - CARD_GAP) / 2;
      const cardH = renderedCard ? renderedCard.getBoundingClientRect().height : cardW * 0.75 + CARD_TEXT_H;

      const avail = leftH - fixedH - TEASER_BOX_MT - TEASER_BOX_CHROME;
      let cardRows = 0;
      let compact = 0;
      if (avail >= COMPACT_ROW_H) {
        cardRows = Math.max(0, Math.floor((avail + CARD_GAP) / (cardH + CARD_GAP)));
        cardRows = Math.min(cardRows, Math.floor(teaserPool.length / 2));
        const usedByCards = cardRows > 0 ? cardRows * (cardH + CARD_GAP) : 0; // includes the gap above the compact list
        compact = Math.max(0, Math.floor((avail - usedByCards + COMPACT_GAP) / (COMPACT_ROW_H + COMPACT_GAP)));
        compact = Math.min(compact, teaserPool.length - cardRows * 2);
      }

      // Left column shorter than the right column's fixed block alone:
      // fill under the enquiry form with two columns of compact rows.
      let leftCompact = 0;
      const leftGap = fixedH - leftH - ENQUIRY_MB - TEASER_BOX_CHROME;
      if (cardRows === 0 && compact === 0 && leftGap >= COMPACT_ROW_H) {
        const rows = Math.floor((leftGap + COMPACT_GAP) / (COMPACT_ROW_H + COMPACT_GAP));
        leftCompact = Math.min(rows * 2, teaserPool.length);
      }

      setFill((prev) =>
        prev.cardRows === cardRows && prev.compact === compact && prev.leftCompact === leftCompact ? prev : { cardRows, compact, leftCompact }
      );
    }

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(leftEl);
    observer.observe(fixedEl);
    if (teaserGridRef.current) observer.observe(teaserGridRef.current);
    window.addEventListener("resize", recompute);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [teaserPool.length, hasTeaserCards]);

  const teaserCards = teaserPool.slice(0, fill.cardRows * 2);
  const teaserCompact = teaserPool.slice(fill.cardRows * 2, fill.cardRows * 2 + fill.compact);
  const leftFiller = teaserPool.slice(0, fill.leftCompact);

  async function submitEnquiry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setSending(true);
    try {
      // The site no longer estimates KRA duty/excise/VAT itself (see
      // CostLadder) - this checkbox is how a buyer asks a person for that
      // number instead. Folded into the message text rather than a new DB
      // column since Enquiry has no dedicated field for it and every
      // enquiry already funnels through the same free-text message.
      const wantsFullQuote = data.get("fullQuote") === "on";
      const rawMessage = (data.get("message") as string) || "";
      const message = wantsFullQuote
        ? `[Also wants the final invoice incl. KRA duty, excise & VAT]${rawMessage ? "\n" + rawMessage : ""}`
        : rawMessage || null;
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
      setReserved(true);

      // Enquiry is saved either way (above) - this just also puts it in
      // front of a person immediately on WhatsApp, with the full vehicle
      // picture and a link straight to it in admin rather than making them
      // go find it (the admin page's own "Original listing" link tracks it
      // back to the exporter from there).
      const waText = [
        `New enquiry`,
        vehicleDetailBlock(vehicle, ref, window.location.origin),
        `Name: ${data.get("name")}`,
        `Phone: ${data.get("phone")}`,
        data.get("email") ? `Email: ${data.get("email")}` : null,
        message ? `Message: ${message}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      window.open(whatsAppLink(waText), "_blank", "noopener,noreferrer");
    } finally {
      setSending(false);
    }
  }

  const ref = `AB-${vehicle.id.slice(-7).toUpperCase()}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {linkCopied && (
        <div
          className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg"
          style={{ background: COLORS.navy }}
        >
          Link copied - paste it anywhere to share
        </div>
      )}
      <MorePhotosPoster key={vehicle.id} vehicle={vehicle} />
      <div className="flex items-center gap-2.5 text-xs mb-5 flex-wrap" style={{ color: COLORS.slate }}>
        <button
          onClick={onBack}
          aria-label="Go back"
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: COLORS.card, color: COLORS.navy }}
        >
          <ArrowLeft size={15} />
        </button>
        <button onClick={() => setPage("home")} className="hover:underline">
          Home
        </button>
        <span>/</span>
        <button onClick={() => setPage("search")} className="hover:underline">
          Search
        </button>
        <span>/</span>
        <button onClick={() => goDetail(vehicle.id)} className="hover:underline" style={{ color: COLORS.navy }}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </button>
      </div>

      {/* ── Mobile/tablet (below lg): a shrunk version of the desktop's two-
          column layout - gallery above, then compact info beside the price
          breakdown, rather than the price ladder stacking all the way to
          the bottom of the page. ── */}
      <div className="lg:hidden">
        <VehicleGallery
          images={vehicle.imageUrls.length > 0 ? vehicle.imageUrls : vehicle.imageUrl ? [vehicle.imageUrl] : []}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          year={vehicle.year}
          country={vehicle.sourceCountry}
          tall={vehicle.sourceSite === "sbtjapan"}
          overlay={
            <>
              {vehicle.badge && (
                <span className="absolute top-4 left-4 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: COLORS.gold, color: COLORS.navyDeep }}>
                  {vehicle.badge}
                </span>
              )}
              <span
                className="absolute top-4 right-4 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(11,31,58,0.55)", color: "white", backdropFilter: "blur(2px)" }}
              >
                Ref {ref}
              </span>
            </>
          }
        />

        <div className="mt-4 flex items-start justify-between gap-2">
          <h1 className="min-w-0 flex-1 text-lg font-semibold leading-snug" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
          </h1>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={onShare} aria-label="Share this car" className="w-8 h-8 rounded-full border flex items-center justify-center" style={{ borderColor: COLORS.line }}>
              <Share2 size={14} color={COLORS.navy} />
            </button>
            <button onClick={() => toggleFavorite(vehicle.id)} className="w-8 h-8 rounded-full border flex items-center justify-center" style={{ borderColor: COLORS.line }}>
              <Heart size={14} fill={favorites.has(vehicle.id) ? COLORS.burgundy : "none"} color={COLORS.burgundy} />
            </button>
          </div>
        </div>

        {/* Name, then price, right below it - not tucked inside a side card. */}
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.burgundy }}>
            {formatUsd(cifUsd)}
          </span>
          <span className="text-[11px]" style={{ color: COLORS.slate }}>
            total price (USD), incl. freight &amp; insurance
          </span>
        </div>

        <p className="text-xs mt-1.5" style={{ color: COLORS.slate }}>
          {vehicle.condition}
        </p>
        <p className="text-xs mt-0.5 inline-flex items-center gap-1" style={{ color: COLORS.slate }}>
          <MapPin size={12} /> {vehicle.sourceCountry}
        </p>

        {/* Car features, below the name+price */}
        <div className="grid grid-cols-3 gap-1.5 mt-3">
          {(
            [
              ["Mileage", `${vehicle.mileageKm.toLocaleString()} km`],
              ["Trans.", vehicle.transmission],
              ["Fuel", vehicle.fuel],
              ["Engine", `${vehicle.engineCc} cc`],
              ["Drive", vehicle.drive],
              ["Seats", String(vehicle.seats)],
            ] as [string, string][]
          ).map(([k, val]) => (
            <div key={k} className="p-1.5 rounded-lg" style={{ background: COLORS.card }}>
              <div className="text-[9px]" style={{ color: COLORS.slate }}>
                {k}
              </div>
              <div className="text-[10px] font-semibold truncate" style={{ color: COLORS.navy }}>
                {val}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <CostLadder totalUsd={cifUsd} />
        </div>

        <button
          onClick={() => requestMoreInfo(mobileMessageRef)}
          className="w-full mt-4 rounded-2xl p-4 text-left text-white flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #3B1F63 0%, #D6336C 100%)" }}
        >
          <Camera size={22} />
          <div>
            <div className="text-sm font-semibold">Want more photos or details?</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>Request them below, takes 10 seconds</div>
          </div>
        </button>

        {!vehicle.eligible && (
          <div className="p-4 rounded-xl mt-4 text-sm" style={{ background: "#FEF2F2", color: "#B91C1C" }}>
            This vehicle is shown for reference only, it&apos;s {vehicle.ineligibleReason}
          </div>
        )}

        <div className="mt-6">
          <SpecTable vehicle={vehicle} />
        </div>

        <div className="p-5 rounded-2xl border mb-6" style={{ borderColor: COLORS.line }}>
          <h3 className="font-semibold mb-3" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Enquire about this vehicle
          </h3>
          {reserved ? (
            <div>
              <div className="text-sm flex items-center gap-2" style={{ color: "#166534" }}>
                <Check size={16} /> Enquiry received, our team will confirm availability within 24 hours.
              </div>
              {teaserPool.length > 0 && (
                <div className="mt-5">
                  <div className="text-xs font-semibold mb-2.5" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
                    While you wait, browse more of our stock
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {teaserPool.slice(0, 4).map((v) => (
                      <VehicleCard key={v.id} vehicle={v} onView={() => goDetail(v.id)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={submitEnquiry} className="grid gap-3">
              <input name="name" required placeholder="Full name" className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "#D8DCE3" }} />
              <input name="phone" required placeholder="Phone number" className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "#D8DCE3" }} />
              <input name="email" placeholder="Email (optional)" className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "#D8DCE3" }} />
              <textarea
                ref={mobileMessageRef}
                name="message"
                placeholder="Anything specific you'd like us to know?"
                className="border rounded-lg px-3 py-2 text-sm"
                rows={3}
                style={{ borderColor: "#D8DCE3" }}
              ></textarea>
              <label className="flex items-start gap-2 text-xs font-medium p-2.5 rounded-xl cursor-pointer" style={{ color: COLORS.navy, background: COLORS.card }}>
                <input type="checkbox" name="fullQuote" defaultChecked className="w-4 h-4 mt-0.5 shrink-0" />
                Also send the final invoice with KRA duty, excise &amp; VAT
              </label>
              <button type="submit" disabled={sending} className="py-2.5 rounded-full text-sm font-semibold text-white disabled:opacity-60" style={{ background: COLORS.burgundy }}>
                {sending ? "Sending…" : "Send enquiry"}
              </button>
              <button
                type="button"
                onClick={goQuote}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: COLORS.card, color: COLORS.burgundy }}
              >
                <Printer size={14} /> Or get a printable invoice &rarr;
              </button>
            </form>
          )}
        </div>

        {similar.length > 0 && (
          <div>
            <h3 className="font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
              Similar vehicles
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {similar.map((v) => (
                <VehicleCard key={v.id} vehicle={v} onView={() => goDetail(v.id)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop (lg and up): the original full two-column layout. ── */}
      <div className="hidden lg:grid lg:grid-cols-[1.3fr_1fr] gap-8">
        <div className="min-w-0">
        <div ref={leftContentRef}>
          <VehicleGallery
            images={vehicle.imageUrls.length > 0 ? vehicle.imageUrls : vehicle.imageUrl ? [vehicle.imageUrl] : []}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            year={vehicle.year}
            country={vehicle.sourceCountry}
            tall={vehicle.sourceSite === "sbtjapan"}
            overlay={
              <>
                {vehicle.badge && (
                  <span className="absolute top-4 left-4 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: COLORS.gold, color: COLORS.navyDeep }}>
                    {vehicle.badge}
                  </span>
                )}
                <span
                  className="absolute top-4 right-4 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(11,31,58,0.55)", color: "white", backdropFilter: "blur(2px)" }}
                >
                  Ref {ref}
                </span>
              </>
            }
          />

          <div className="flex items-start justify-between mb-2 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
                {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
              </h1>
              <p className="text-sm mt-1 flex items-center gap-3 flex-wrap" style={{ color: COLORS.slate }}>
                <span>
                  {vehicle.condition}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} /> Sourced from {vehicle.sourceCountry}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={onShare} aria-label="Share this car" className="w-10 h-10 rounded-full border flex items-center justify-center" style={{ borderColor: COLORS.line }}>
                <Share2 size={16} color={COLORS.navy} />
              </button>
              <button onClick={() => toggleFavorite(vehicle.id)} className="w-10 h-10 rounded-full border flex items-center justify-center" style={{ borderColor: COLORS.line }}>
                <Heart size={17} fill={favorites.has(vehicle.id) ? COLORS.burgundy : "none"} color={COLORS.burgundy} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-6">
            {(
              [
                ["Mileage", `${vehicle.mileageKm.toLocaleString()} km`],
                ["Transmission", vehicle.transmission],
                ["Fuel", vehicle.fuel],
                ["Engine", `${vehicle.engineCc} cc`],
                ["Drive", vehicle.drive],
                ["Seats", String(vehicle.seats)],
                ["Body type", vehicle.bodyType],
                ["Colour", vehicle.color],
                ["Source", vehicle.sourceCountry],
              ] as [string, string][]
            ).map(([k, val]) => (
              <div key={k} className="p-3 rounded-xl" style={{ background: COLORS.card }}>
                <div className="text-[11px]" style={{ color: COLORS.slate }}>
                  {k}
                </div>
                <div className="text-sm font-semibold" style={{ color: COLORS.navy }}>
                  {val}
                </div>
              </div>
            ))}
          </div>

          {!vehicle.eligible && (
            <div className="p-4 rounded-xl mb-6 text-sm" style={{ background: "#FEF2F2", color: "#B91C1C" }}>
              This vehicle is shown for reference only, it&apos;s {vehicle.ineligibleReason}
            </div>
          )}

          <div className="p-5 rounded-2xl border mb-6" style={{ borderColor: COLORS.line }}>
            <h3 className="font-semibold mb-3" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
              Enquire about this vehicle
            </h3>
            {reserved ? (
              <div>
                <div className="text-sm flex items-center gap-2" style={{ color: "#166534" }}>
                  <Check size={16} /> Enquiry received, our team will confirm availability within 24 hours.
                </div>
                {teaserPool.length > 0 && (
                  <div className="mt-5">
                    <div className="text-xs font-semibold mb-2.5" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
                      While you wait, browse more of our stock
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {teaserPool.slice(0, 6).map((v) => (
                        <VehicleCard key={v.id} vehicle={v} onView={() => goDetail(v.id)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={submitEnquiry} className="grid sm:grid-cols-2 gap-3">
                <input name="name" required placeholder="Full name" className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "#D8DCE3" }} />
                <input name="phone" required placeholder="Phone number" className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "#D8DCE3" }} />
                <input name="email" placeholder="Email (optional)" className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" style={{ borderColor: "#D8DCE3" }} />
                <textarea
                  ref={desktopMessageRef}
                  name="message"
                  placeholder="Anything specific you'd like us to know?"
                  className="border rounded-lg px-3 py-2 text-sm sm:col-span-2"
                  rows={3}
                  style={{ borderColor: "#D8DCE3" }}
                ></textarea>
                <label className="flex items-start gap-2 text-xs sm:col-span-2 font-medium p-2.5 rounded-xl cursor-pointer" style={{ color: COLORS.navy, background: COLORS.card }}>
                  <input type="checkbox" name="fullQuote" defaultChecked className="w-4 h-4 mt-0.5 shrink-0" />
                  Also send the final invoice with KRA duty, excise &amp; VAT
                </label>
                <button type="submit" disabled={sending} className="sm:col-span-2 py-2.5 rounded-full text-sm font-semibold text-white disabled:opacity-60" style={{ background: COLORS.burgundy }}>
                  {sending ? "Sending…" : "Send enquiry"}
                </button>
                <button
                  type="button"
                  onClick={goQuote}
                  className="sm:col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
                  style={{ background: COLORS.card, color: COLORS.burgundy }}
                >
                  <Printer size={14} /> Or get a printable invoice &rarr;
                </button>
              </form>
            )}
          </div>
        </div>
          {leftFiller.length > 0 && (
            <div className="rounded-2xl border p-3" style={{ borderColor: COLORS.line }}>
              <div className="text-xs font-semibold mb-2.5" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
                More from our stock
              </div>
              <div className="grid grid-cols-2 gap-2">
                {leftFiller.map((v) => (
                  <CompactVehicleRow key={v.id} vehicle={v} onView={() => goDetail(v.id)} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:h-full min-w-0">
          <div className="lg:sticky lg:h-full lg:flex lg:flex-col min-w-0" style={{ top: "1.5rem" }}>
            <div ref={fixedRightRef}>
              <CostLadder totalUsd={cifUsd} />

              <div className="mt-4">
                <SpecTable vehicle={vehicle} />
              </div>

              <button
                onClick={() => requestMoreInfo(desktopMessageRef)}
                className="hidden lg:flex mt-3 rounded-2xl p-4 text-left text-white items-center gap-3 w-full"
                style={{ background: "linear-gradient(135deg, #3B1F63 0%, #D6336C 100%)" }}
              >
                <Camera size={22} />
                <div>
                  <div className="text-sm font-semibold">Want more photos or details?</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>Request them below, takes 10 seconds</div>
                </div>
              </button>
            </div>

            {(teaserCards.length > 0 || teaserCompact.length > 0) && (
              <div className="mt-3 rounded-2xl border p-3" style={{ borderColor: COLORS.line }}>
                <div className="text-xs font-semibold mb-2.5" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
                  More from our stock
                </div>
                {teaserCards.length > 0 && (
                  <div ref={teaserGridRef} className="grid grid-cols-2 gap-2.5">
                    {teaserCards.map((v) => (
                      <VehicleCard key={v.id} vehicle={v} onView={() => goDetail(v.id)} />
                    ))}
                  </div>
                )}
                {teaserCompact.length > 0 && (
                  <div className={`grid gap-2 ${teaserCards.length > 0 ? "mt-2.5" : ""}`}>
                    {teaserCompact.map((v) => (
                      <CompactVehicleRow key={v.id} vehicle={v} onView={() => goDetail(v.id)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Similar vehicles: full width below the two-column area, not
          squeezed into either column - its count varies per vehicle (0-6),
          which made it an unreliable way to balance column heights when it
          lived inside one of them. */}
      {similar.length > 0 && (
        <div className="hidden lg:block mt-10">
          <h3 className="font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Similar vehicles
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {similar.map((v) => (
              <VehicleCard key={v.id} vehicle={v} onView={() => goDetail(v.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
