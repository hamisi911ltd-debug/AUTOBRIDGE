"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatUsd, sourceSiteLabel } from "@/lib/format";
import { saveVehicle, deleteVehicle } from "@/app/admin/actions";

export type VehicleFormValues = {
  id?: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  mileageKm: number;
  fuel: string;
  transmission: string;
  engineCc: number;
  bodyType: string;
  drive: string;
  seats: number;
  color: string;
  sourceCountry: string;
  sourcePriceUsd: number;
  imageUrl: string | null;
  condition: string;
  badge: string | null;
  lifestyle: string[];
  eligible: boolean;
  ineligibleReason: string | null;
  sourceSite: string | null;
  sourceUrl: string | null;
  externalId: string | null;
  lastScrapedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  sellingPriceUsd?: number;
  appliedRuleName?: string | null;
  enquiryCount?: number;
};

const FIELD = "w-full border rounded-lg px-3 py-2 text-sm";
const LABEL = "block text-xs font-semibold uppercase tracking-wide mb-1";

function OverviewStat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: COLORS.slate }}>
        {label}
      </div>
      <div className="text-sm font-semibold" style={{ color: COLORS.navy }}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px]" style={{ color: COLORS.slate }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function VehicleForm({ initial }: { initial?: VehicleFormValues }) {
  return (
    <div className="max-w-5xl">
      {initial?.id && (
        <div className="bg-white rounded-2xl border p-6 mb-6" style={{ borderColor: COLORS.line }}>
          <div className="grid md:grid-cols-[220px_1fr] gap-6">
            <div className="w-full h-40 rounded-xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: COLORS.navy }}>
              {initial.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external CDN, many hosts
                <img src={initial.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs" style={{ color: COLORS.goldLight }}>
                  No photo
                </span>
              )}
            </div>

            <div>
              <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
                <div>
                  <h1 className="text-xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
                    {initial.year} {initial.make} {initial.model}
                  </h1>
                  <p className="text-sm" style={{ color: COLORS.slate }}>
                    {initial.trim}
                  </p>
                </div>
                {initial.sourceSite ? (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#E8ECF3", color: COLORS.navy }}>
                    {sourceSiteLabel(initial.sourceSite)}
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#F1F1EC", color: COLORS.slate }}>
                    Hand-entered
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <OverviewStat label="Source price" value={formatUsd(initial.sourcePriceUsd)} />
                <OverviewStat
                  label="Selling price"
                  value={<span style={{ color: COLORS.burgundy }}>{formatUsd(initial.sellingPriceUsd ?? initial.sourcePriceUsd)}</span>}
                  sub={initial.appliedRuleName ? `Rule: ${initial.appliedRuleName}` : "No rule matched"}
                />
                <OverviewStat
                  label="Enquiries"
                  value={
                    <Link href="/admin/enquiries" style={{ color: COLORS.navy }} className="hover:underline">
                      {initial.enquiryCount ?? 0}
                    </Link>
                  }
                />
                <OverviewStat label="Status" value={initial.eligible ? "Eligible" : "Not eligible"} />
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs pt-4 border-t" style={{ borderColor: COLORS.line, color: COLORS.slate }}>
                {initial.externalId && <span>Ref: {initial.externalId}</span>}
                {initial.lastScrapedAt && <span>Last synced {new Date(initial.lastScrapedAt).toLocaleString()}</span>}
                {initial.createdAt && <span>Added {new Date(initial.createdAt).toLocaleDateString()}</span>}
                {initial.sourceUrl && (
                  <a
                    href={initial.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: COLORS.burgundy, color: "white" }}
                  >
                    Open original listing ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    <form action={saveVehicle} className="bg-white rounded-2xl border p-6" style={{ borderColor: COLORS.line }}>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <h2 className="text-lg font-semibold mb-6" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
        {initial?.id ? "Edit details" : "New vehicle"}
      </h2>

      {initial?.sourceSite && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF3C7", color: "#92400E" }}>
          This vehicle is synced from {sourceSiteLabel(initial.sourceSite)} — any field you
          change here will be overwritten the next time the scraper syncs this listing.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Make
          </label>
          <input name="make" defaultValue={initial?.make} required className={FIELD} style={{ borderColor: "#D8DCE3" }} />
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Model
          </label>
          <input name="model" defaultValue={initial?.model} required className={FIELD} style={{ borderColor: "#D8DCE3" }} />
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Trim
          </label>
          <input name="trim" defaultValue={initial?.trim} required className={FIELD} style={{ borderColor: "#D8DCE3" }} />
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Year
          </label>
          <input name="year" type="number" defaultValue={initial?.year ?? 2020} required className={FIELD} style={{ borderColor: "#D8DCE3" }} />
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Mileage (km)
          </label>
          <input name="mileageKm" type="number" defaultValue={initial?.mileageKm ?? 0} required className={FIELD} style={{ borderColor: "#D8DCE3" }} />
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Engine (cc)
          </label>
          <input name="engineCc" type="number" defaultValue={initial?.engineCc ?? 1500} required className={FIELD} style={{ borderColor: "#D8DCE3" }} />
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Fuel
          </label>
          <select name="fuel" defaultValue={initial?.fuel ?? "Petrol"} className={FIELD} style={{ borderColor: "#D8DCE3" }}>
            {["Petrol", "Diesel", "Hybrid", "Electric"].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Transmission
          </label>
          <select name="transmission" defaultValue={initial?.transmission ?? "Automatic"} className={FIELD} style={{ borderColor: "#D8DCE3" }}>
            {["Automatic", "Manual"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Drive
          </label>
          <select name="drive" defaultValue={initial?.drive ?? "FWD"} className={FIELD} style={{ borderColor: "#D8DCE3" }}>
            {["FWD", "RWD", "AWD", "4WD"].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Body type
          </label>
          <input name="bodyType" defaultValue={initial?.bodyType} required className={FIELD} style={{ borderColor: "#D8DCE3" }} />
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Seats
          </label>
          <input name="seats" type="number" defaultValue={initial?.seats ?? 5} required className={FIELD} style={{ borderColor: "#D8DCE3" }} />
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Colour
          </label>
          <input name="color" defaultValue={initial?.color} required className={FIELD} style={{ borderColor: "#D8DCE3" }} />
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Source country
          </label>
          <select name="sourceCountry" defaultValue={initial?.sourceCountry ?? "Japan"} className={FIELD} style={{ borderColor: "#D8DCE3" }}>
            {["Japan", "UAE", "UK", "USA", "South Korea"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Source price (USD)
          </label>
          <input
            name="sourcePriceUsd"
            type="number"
            defaultValue={initial?.sourcePriceUsd ?? 0}
            required
            className={FIELD}
            style={{ borderColor: "#D8DCE3" }}
          />
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Condition
          </label>
          <input name="condition" defaultValue={initial?.condition ?? "Foreign Used"} className={FIELD} style={{ borderColor: "#D8DCE3" }} />
        </div>
        <div>
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Badge (optional)
          </label>
          <input name="badge" defaultValue={initial?.badge ?? ""} className={FIELD} style={{ borderColor: "#D8DCE3" }} placeholder="e.g. Popular" />
        </div>
        <div className="col-span-2 sm:col-span-3">
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Image URL
          </label>
          <input
            name="imageUrl"
            defaultValue={initial?.imageUrl ?? ""}
            className={FIELD}
            style={{ borderColor: "#D8DCE3" }}
            placeholder="https://…"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className={LABEL} style={{ color: COLORS.slate }}>
          Lifestyle tags (comma-separated)
        </label>
        <input
          name="lifestyle"
          defaultValue={initial?.lifestyle.join(", ")}
          className={FIELD}
          style={{ borderColor: "#D8DCE3" }}
          placeholder="family, business, luxury"
        />
      </div>

      <label className="flex items-center gap-2 text-sm mb-2">
        <input type="checkbox" name="eligible" defaultChecked={initial?.eligible ?? true} className="w-4 h-4" />
        Eligible for import
      </label>
      <div className="mb-6">
        <label className={LABEL} style={{ color: COLORS.slate }}>
          Ineligible reason (if not eligible)
        </label>
        <input
          name="ineligibleReason"
          defaultValue={initial?.ineligibleReason ?? ""}
          className={FIELD}
          style={{ borderColor: "#D8DCE3" }}
          placeholder="e.g. registered in 2016, older than our 2019 threshold"
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="px-5 py-2.5 rounded-full text-sm font-semibold text-white" style={{ background: COLORS.burgundy }}>
          {initial?.id ? "Save changes" : "Create vehicle"}
        </button>
      </div>
    </form>
    {initial?.id && (
      <form
        action={deleteVehicle}
        className="mt-4"
        onSubmit={(e) => {
          if (!confirm("Delete this vehicle? This cannot be undone.")) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={initial.id} />
        <button type="submit" className="text-sm font-medium" style={{ color: COLORS.burgundy }}>
          Delete vehicle
        </button>
      </form>
    )}
    </div>
  );
}
