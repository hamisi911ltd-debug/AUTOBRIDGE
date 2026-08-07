"use client";

import { COLORS, FONT_DISPLAY } from "@/lib/constants";
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
  condition: string;
  badge: string | null;
  lifestyle: string[];
  eligible: boolean;
  ineligibleReason: string | null;
  sourceSite: string | null;
  sourceUrl: string | null;
  lastScrapedAt: string | null;
};

const FIELD = "w-full border rounded-lg px-3 py-2 text-sm";
const LABEL = "block text-xs font-semibold uppercase tracking-wide mb-1";

export function VehicleForm({ initial }: { initial?: VehicleFormValues }) {
  return (
    <div className="max-w-3xl">
    <form action={saveVehicle} className="bg-white rounded-2xl border p-6" style={{ borderColor: COLORS.line }}>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <h1 className="text-xl font-semibold mb-6" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
        {initial?.id ? "Edit vehicle" : "New vehicle"}
      </h1>

      {initial?.sourceSite && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm flex flex-wrap items-center gap-x-6 gap-y-1" style={{ background: "#F5F6F9" }}>
          <span style={{ color: COLORS.slate }}>
            Sourced from{" "}
            <span className="font-semibold" style={{ color: COLORS.navy }}>
              {initial.sourceSite === "beforward" ? "BE FORWARD" : "SBT Japan"}
            </span>{" "}
            by the nightly scraper — fields will be overwritten on the next sync.
          </span>
          {initial.sourceUrl && (
            <a href={initial.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold" style={{ color: COLORS.burgundy }}>
              View original listing ↗
            </a>
          )}
          {initial.lastScrapedAt && (
            <span style={{ color: COLORS.slate }}>Last synced {new Date(initial.lastScrapedAt).toLocaleString()}</span>
          )}
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
