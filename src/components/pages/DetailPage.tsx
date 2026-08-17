"use client";

import { useState } from "react";
import { Check, Heart, MapPin, Scale, ShieldCheck, Truck, Users } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatKes } from "@/lib/format";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import type { Page } from "@/components/AutoBridgeApp";
import { CostLadder } from "@/components/vehicles/CostLadder";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { VehicleGallery } from "@/components/vehicles/VehicleGallery";

// Business WhatsApp number for enquiry notifications, in international
// format (no leading 0, no +) as wa.me requires.
const WHATSAPP_NUMBER = "254759159881";

const TRUST_POINTS = [
  { icon: ShieldCheck, title: "Vetted before listing", text: "Every exporter and listing is checked before it goes live on Ferbil Autos." },
  { icon: Truck, title: "We handle the whole import", text: "Purchase, ocean freight and KRA clearing at Mombasa — all coordinated for you." },
  { icon: Users, title: "Kenya-based support", text: "Real people in Kenya to talk to before and after you reserve." },
];

export function DetailPage({
  vehicle,
  landed,
  fx,
  setFx,
  favorites,
  toggleFavorite,
  compareList,
  toggleCompare,
  vehicles,
  goDetail,
  setPage,
}: {
  vehicle: PublicVehicle;
  landed: LandedCost;
  fx: number;
  setFx: (fx: number) => void;
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  compareList: string[];
  toggleCompare: (id: string) => void;
  vehicles: PublicVehicle[];
  goDetail: (id: string) => void;
  setPage: (p: Page) => void;
}) {
  const [reserved, setReserved] = useState(false);
  const [sending, setSending] = useState(false);
  // Same make+model first — "more of the same car" is what a shopper
  // actually wants after clicking a specific listing — then fill any
  // remaining slots with the wider body-type/brand match as before.
  const others = vehicles.filter((v) => v.id !== vehicle.id && v.eligible);
  const sameModel = others.filter((v) => v.make === vehicle.make && v.model === vehicle.model);
  const wider = others.filter((v) => !(v.make === vehicle.make && v.model === vehicle.model) && (v.bodyType === vehicle.bodyType || v.make === vehicle.make));
  const similar = [...sameModel, ...wider].slice(0, 6); // multiple of 3 — no dangling gap in the mobile 3-across grid

  async function submitEnquiry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setSending(true);
    try {
      // The site no longer estimates KRA duty/excise/VAT itself (see
      // CostLadder) — this checkbox is how a buyer asks a person for that
      // number instead. Folded into the message text rather than a new DB
      // column since Enquiry has no dedicated field for it and every
      // enquiry already funnels through the same free-text message.
      const wantsFullQuote = data.get("fullQuote") === "on";
      const rawMessage = (data.get("message") as string) || "";
      const message = wantsFullQuote
        ? `[Requesting a full quote incl. duty, excise & VAT]${rawMessage ? "\n" + rawMessage : ""}`
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

      // Enquiry is saved either way (above) — this just also puts it in
      // front of a person immediately on WhatsApp, with a link straight to
      // the admin list rather than making them go find it.
      const adminLink = `${window.location.origin}/admin/enquiries`;
      const waText = [
        `New enquiry — ${vehicle.year} ${vehicle.make} ${vehicle.model} (Ref ${ref})`,
        `Name: ${data.get("name")}`,
        `Phone: ${data.get("phone")}`,
        data.get("email") ? `Email: ${data.get("email")}` : null,
        message ? `Message: ${message}` : null,
        `View in admin: ${adminLink}`,
      ]
        .filter(Boolean)
        .join("\n");
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`, "_blank", "noopener,noreferrer");
    } finally {
      setSending(false);
    }
  }

  const ref = `AB-${vehicle.id.slice(-7).toUpperCase()}`;

  // Toggling compare used to also surface a floating "Compare now" bar —
  // removed since it duplicated the bottom nav's own Compare badge and
  // collided with it on mobile. Without that bar, adding a car had no
  // visible effect at all, so this takes you straight to the compare page
  // instead (only on ADD — removing a car just removes it, no navigation).
  function handleToggleCompare() {
    const adding = !compareList.includes(vehicle.id);
    toggleCompare(vehicle.id);
    if (adding) setPage("compare");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-1.5 text-xs mb-5 flex-wrap" style={{ color: COLORS.slate }}>
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
          column layout — gallery above, then compact info beside the price
          breakdown, rather than the price ladder stacking all the way to
          the bottom of the page. ── */}
      <div className="lg:hidden">
        <VehicleGallery
          images={vehicle.imageUrls.length > 0 ? vehicle.imageUrls : vehicle.imageUrl ? [vehicle.imageUrl] : []}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          year={vehicle.year}
          country={vehicle.sourceCountry}
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
              {vehicle.isRepresentativePhoto && (
                <span
                  className="absolute bottom-3 left-3 text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(7,21,39,0.7)", color: "#fff", backdropFilter: "blur(2px)" }}
                >
                  Photo of a similar {vehicle.make} {vehicle.model} in stock — this unit&apos;s own photo isn&apos;t in yet
                </span>
              )}
            </>
          }
        />

        <div className="mt-4 flex items-start justify-between gap-2">
          <h1 className="min-w-0 flex-1 text-lg font-semibold leading-snug" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={() => toggleFavorite(vehicle.id)} className="w-8 h-8 rounded-full border flex items-center justify-center" style={{ borderColor: COLORS.line }}>
              <Heart size={14} fill={favorites.has(vehicle.id) ? COLORS.burgundy : "none"} color={COLORS.burgundy} />
            </button>
            <button
              onClick={handleToggleCompare}
              className="w-8 h-8 rounded-full border flex items-center justify-center"
              style={{ borderColor: COLORS.line, background: compareList.includes(vehicle.id) ? COLORS.gold : "transparent" }}
            >
              <Scale size={14} color={COLORS.navy} />
            </button>
          </div>
        </div>

        {/* Name, then price, right below it — not tucked inside a side card. */}
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.burgundy }}>
            {formatKes(landed.total)}
          </span>
          <span className="text-[11px]" style={{ color: COLORS.slate }}>
            total price
          </span>
        </div>

        <p className="text-xs mt-1.5" style={{ color: COLORS.slate }}>
          {vehicle.trim} · {vehicle.condition}
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
          <div className="mb-2 flex items-center gap-1 text-[10px] flex-wrap">
            <span style={{ color: COLORS.slate }}>Exchange rate</span>
            <input
              type="number"
              value={fx}
              onChange={(e) => setFx(Number(e.target.value) || fx)}
              className="border rounded-lg px-1.5 py-1 w-16 text-[10px]"
              style={{ borderColor: "#D8DCE3" }}
            />
            <span style={{ color: COLORS.slate }}>KSh/USD</span>
          </div>
          <CostLadder vehicle={vehicle} landed={landed} fx={fx} />
        </div>

        {!vehicle.eligible && (
          <div className="p-4 rounded-xl mt-4 text-sm" style={{ background: "#FEF2F2", color: "#B91C1C" }}>
            This vehicle is shown for reference only, it&apos;s {vehicle.ineligibleReason}
          </div>
        )}

        <div className="grid gap-3 mt-6 mb-6">
          {TRUST_POINTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="p-4 rounded-xl border flex items-start gap-3" style={{ borderColor: COLORS.line }}>
              <Icon size={18} color={COLORS.burgundy} className="shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold" style={{ color: COLORS.navy }}>
                  {title}
                </div>
                <div className="text-xs mt-1" style={{ color: COLORS.slate }}>
                  {text}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-2xl border mb-6" style={{ borderColor: COLORS.line }}>
          <h3 className="font-semibold mb-3" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Enquire about this vehicle
          </h3>
          {reserved ? (
            <div className="text-sm flex items-center gap-2" style={{ color: "#166534" }}>
              <Check size={16} /> Enquiry received, our team will confirm availability within 24 hours.
            </div>
          ) : (
            <form onSubmit={submitEnquiry} className="grid gap-3">
              <input name="name" required placeholder="Full name" className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "#D8DCE3" }} />
              <input name="phone" required placeholder="Phone number" className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "#D8DCE3" }} />
              <input name="email" placeholder="Email (optional)" className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "#D8DCE3" }} />
              <textarea
                name="message"
                placeholder="Anything specific you'd like us to know?"
                className="border rounded-lg px-3 py-2 text-sm"
                rows={3}
                style={{ borderColor: "#D8DCE3" }}
              ></textarea>
              <label className="flex items-start gap-2 text-xs font-medium p-2.5 rounded-xl cursor-pointer" style={{ color: COLORS.navy, background: COLORS.card }}>
                <input type="checkbox" name="fullQuote" defaultChecked className="w-4 h-4 mt-0.5 shrink-0" />
                Include a full quote with duty, excise &amp; VAT
              </label>
              <button type="submit" disabled={sending} className="py-2.5 rounded-full text-sm font-semibold text-white disabled:opacity-60" style={{ background: COLORS.burgundy }}>
                {sending ? "Sending…" : "Send enquiry"}
              </button>
            </form>
          )}
        </div>

        {similar.length > 0 && (
          <div>
            <h3 className="font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
              Similar vehicles
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {similar.map((v) => (
                <VehicleCard key={v.id} vehicle={v} onView={() => goDetail(v.id)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop (lg and up): the original full two-column layout. ── */}
      <div className="hidden lg:grid lg:grid-cols-[1.3fr_1fr] gap-8">
        <div>
          <VehicleGallery
            images={vehicle.imageUrls.length > 0 ? vehicle.imageUrls : vehicle.imageUrl ? [vehicle.imageUrl] : []}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            year={vehicle.year}
            country={vehicle.sourceCountry}
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
                {vehicle.isRepresentativePhoto && (
                  <span
                    className="absolute bottom-9 sm:bottom-10 left-3 text-[11px] font-medium px-2.5 py-1 rounded-full max-w-[80%]"
                    style={{ background: "rgba(7,21,39,0.7)", color: "#fff", backdropFilter: "blur(2px)" }}
                  >
                    Photo of a similar {vehicle.make} {vehicle.model} in stock — this unit&apos;s own photo isn&apos;t in yet
                  </span>
                )}
              </>
            }
          />

          <div className="flex items-start justify-between mb-2 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              <p className="text-sm mt-1 flex items-center gap-3 flex-wrap" style={{ color: COLORS.slate }}>
                <span>
                  {vehicle.trim} · {vehicle.condition}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} /> Sourced from {vehicle.sourceCountry}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleFavorite(vehicle.id)} className="w-10 h-10 rounded-full border flex items-center justify-center" style={{ borderColor: COLORS.line }}>
                <Heart size={17} fill={favorites.has(vehicle.id) ? COLORS.burgundy : "none"} color={COLORS.burgundy} />
              </button>
              <button
                onClick={handleToggleCompare}
                className="w-10 h-10 rounded-full border flex items-center justify-center"
                style={{ borderColor: COLORS.line, background: compareList.includes(vehicle.id) ? COLORS.gold : "transparent" }}
              >
                <Scale size={17} color={COLORS.navy} />
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

          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            {TRUST_POINTS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="p-4 rounded-xl border" style={{ borderColor: COLORS.line }}>
                <Icon size={18} color={COLORS.burgundy} />
                <div className="text-sm font-semibold mt-2" style={{ color: COLORS.navy }}>
                  {title}
                </div>
                <div className="text-xs mt-1" style={{ color: COLORS.slate }}>
                  {text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-2xl border mb-6" style={{ borderColor: COLORS.line }}>
            <h3 className="font-semibold mb-3" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
              Enquire about this vehicle
            </h3>
            {reserved ? (
              <div className="text-sm flex items-center gap-2" style={{ color: "#166534" }}>
                <Check size={16} /> Enquiry received, our team will confirm availability within 24 hours.
              </div>
            ) : (
              <form onSubmit={submitEnquiry} className="grid sm:grid-cols-2 gap-3">
                <input name="name" required placeholder="Full name" className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "#D8DCE3" }} />
                <input name="phone" required placeholder="Phone number" className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "#D8DCE3" }} />
                <input name="email" placeholder="Email (optional)" className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" style={{ borderColor: "#D8DCE3" }} />
                <textarea
                  name="message"
                  placeholder="Anything specific you'd like us to know?"
                  className="border rounded-lg px-3 py-2 text-sm sm:col-span-2"
                  rows={3}
                  style={{ borderColor: "#D8DCE3" }}
                ></textarea>
                <label className="flex items-start gap-2 text-xs sm:col-span-2 font-medium p-2.5 rounded-xl cursor-pointer" style={{ color: COLORS.navy, background: COLORS.card }}>
                  <input type="checkbox" name="fullQuote" defaultChecked className="w-4 h-4 mt-0.5 shrink-0" />
                  Include a full quote with duty, excise &amp; VAT
                </label>
                <button type="submit" disabled={sending} className="sm:col-span-2 py-2.5 rounded-full text-sm font-semibold text-white disabled:opacity-60" style={{ background: COLORS.burgundy }}>
                  {sending ? "Sending…" : "Send enquiry"}
                </button>
              </form>
            )}
          </div>

        </div>

        <div className="lg:h-full">
          <div className="lg:sticky lg:h-full lg:flex lg:flex-col" style={{ top: "1.5rem" }}>
            <div className="mb-4 flex items-center gap-2 text-xs">
              <span style={{ color: COLORS.slate }}>Exchange rate</span>
              <input
                type="number"
                value={fx}
                onChange={(e) => setFx(Number(e.target.value) || fx)}
                className="border rounded-lg px-2 py-1 w-20"
                style={{ borderColor: "#D8DCE3" }}
              />
              <span style={{ color: COLORS.slate }}>KSh / USD</span>
            </div>
            <CostLadder vehicle={vehicle} landed={landed} fx={fx} />
          </div>
        </div>
      </div>

      {/* Similar vehicles: full width below the two-column area, not
          squeezed into either column — its count varies per vehicle (0-6),
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
