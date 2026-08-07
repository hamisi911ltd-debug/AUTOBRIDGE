"use client";

import { ShieldCheck } from "lucide-react";
import { COLORS, DEFAULT_FILTERS, YEARS, type Filters } from "@/lib/constants";
import { CheckboxGroup } from "@/components/vehicles/CheckboxGroup";

export function FilterSidebar({
  filters,
  setFilters,
  allMakes,
  allBodyTypes,
  allFuels,
  allTransmissions,
  allSourceCountries,
}: {
  filters: Filters;
  setFilters: (updater: (f: Filters) => Filters) => void;
  allMakes: string[];
  allBodyTypes: string[];
  allFuels: string[];
  allTransmissions: string[];
  allSourceCountries: string[];
}) {
  function patch(p: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...p }));
  }
  function toggleIn(key: "makes" | "bodyTypes" | "fuels" | "transmissions" | "sourceCountries", val: string) {
    setFilters((f) => {
      const arr = f[key];
      const next = arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
      return { ...f, [key]: next };
    });
  }

  return (
    <aside className="bg-white rounded-2xl border p-5" style={{ borderColor: COLORS.line }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color: COLORS.navy }}>
          Filters
        </h3>
        <button onClick={() => setFilters(() => DEFAULT_FILTERS)} className="text-xs font-medium" style={{ color: COLORS.burgundy }}>
          Reset
        </button>
      </div>

      <label className="flex items-center justify-between mb-5 p-3 rounded-xl cursor-pointer" style={{ background: COLORS.card }}>
        <span className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck size={16} style={{ color: COLORS.burgundy }} /> Only eligible for import
        </span>
        <input
          type="checkbox"
          checked={filters.eligibleOnly}
          onChange={(e) => patch({ eligibleOnly: e.target.checked })}
          className="w-4 h-4"
        />
      </label>

      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.slate }}>
          Year
        </div>
        <div className="flex items-center gap-2 text-sm">
          <select
            value={filters.yearMin}
            onChange={(e) => patch({ yearMin: Number(e.target.value) })}
            className="border rounded-lg px-2 py-1.5 flex-1"
            style={{ borderColor: "#D8DCE3" }}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span style={{ color: COLORS.slate }}>to</span>
          <select
            value={filters.yearMax}
            onChange={(e) => patch({ yearMax: Number(e.target.value) })}
            className="border rounded-lg px-2 py-1.5 flex-1"
            style={{ borderColor: "#D8DCE3" }}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.slate }}>
          Landed cost (KSh)
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="number"
            step={100000}
            value={filters.priceMinKes}
            onChange={(e) => patch({ priceMinKes: Number(e.target.value) || 0 })}
            className="border rounded-lg px-2 py-1.5 w-full"
            style={{ borderColor: "#D8DCE3" }}
          />
          <span style={{ color: COLORS.slate }}>–</span>
          <input
            type="number"
            step={100000}
            value={filters.priceMaxKes}
            onChange={(e) => patch({ priceMaxKes: Number(e.target.value) || 0 })}
            className="border rounded-lg px-2 py-1.5 w-full"
            style={{ borderColor: "#D8DCE3" }}
          />
        </div>
      </div>

      <CheckboxGroup title="Make" options={allMakes} selected={filters.makes} onToggle={(v) => toggleIn("makes", v)} />
      <CheckboxGroup title="Body type" options={allBodyTypes} selected={filters.bodyTypes} onToggle={(v) => toggleIn("bodyTypes", v)} />
      <CheckboxGroup title="Fuel" options={allFuels} selected={filters.fuels} onToggle={(v) => toggleIn("fuels", v)} />
      <CheckboxGroup title="Transmission" options={allTransmissions} selected={filters.transmissions} onToggle={(v) => toggleIn("transmissions", v)} />
      <CheckboxGroup title="Source market" options={allSourceCountries} selected={filters.sourceCountries} onToggle={(v) => toggleIn("sourceCountries", v)} />
    </aside>
  );
}
