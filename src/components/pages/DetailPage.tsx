"use client";

import { useState } from "react";
import { Check, Heart, MapPin, Scale, ShieldCheck, Truck, Users } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import type { Page } from "@/components/AutoBridgeApp";
import { CostLadder } from "@/components/vehicles/CostLadder";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { VehicleImage } from "@/components/vehicles/VehicleImage";

const TRUST_POINTS = [
  { icon: ShieldCheck, title: "Vetted before listing", text: "Every exporter and listing is checked before it goes live on AutoBridge." },
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
  const similar = vehicles
    .filter((v) => v.id !== vehicle.id && v.eligible && (v.bodyType === vehicle.bodyType || v.make === vehicle.make))
    .slice(0, 4);

  async function submitEnquiry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setSending(true);
    try {
      await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          name: data.get("name"),
          phone: data.get("phone"),
          email: data.get("email") || null,
          message: data.get("message") || null,
        }),
      });
      setReserved(true);
    } finally {
      setSending(false);
    }
  }

  const ref = `AB-${vehicle.id.slice(-7).toUpperCase()}`;

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

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-8">
        <div>
          <div
            className="h-72 sm:h-96 rounded-2xl flex items-center justify-center relative mb-6 overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}
          >
            <VehicleImage src={vehicle.imageUrl} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} iconSize={96} />
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
          </div>

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
                onClick={() => toggleCompare(vehicle.id)}
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
                <button type="submit" disabled={sending} className="sm:col-span-2 py-2.5 rounded-full text-sm font-semibold text-white disabled:opacity-60" style={{ background: COLORS.burgundy }}>
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
              <div className="grid sm:grid-cols-2 gap-4">
                {similar.map((v) => (
                  <VehicleCard
                    key={v.id}
                    vehicle={v}
                    isFavorite={favorites.has(v.id)}
                    onFavorite={() => toggleFavorite(v.id)}
                    inCompare={compareList.includes(v.id)}
                    onCompare={() => toggleCompare(v.id)}
                    onView={() => goDetail(v.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="sticky" style={{ top: "1.5rem" }}>
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
    </div>
  );
}
