"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Search, ShieldCheck } from "lucide-react";
import { COLORS, DEFAULT_FILTERS, YEARS, type Filters } from "@/lib/constants";
import { MAKE_LOGO, COUNTRY_ISO } from "@/lib/vehicleBranding";
import { CheckboxGroup } from "@/components/vehicles/CheckboxGroup";
import { IconCheckList } from "@/components/vehicles/IconCheckList";

// Quick-jump landed-cost bands (KSh) - a denser, one-tap alternative to
// typing exact min/max figures, spanning the range this catalog actually
// spans after duty, VAT and shipping.
export const PRICE_BANDS: { label: string; min: number; max: number }[] = [
  { label: "Under KSh 1.5M", min: 0, max: 1_500_000 },
  { label: "KSh 1.5M – 2.5M", min: 1_500_000, max: 2_500_000 },
  { label: "KSh 2.5M – 4M", min: 2_500_000, max: 4_000_000 },
  { label: "KSh 4M – 6M", min: 4_000_000, max: 6_000_000 },
  { label: "Over KSh 6M", min: 6_000_000, max: DEFAULT_FILTERS.priceMaxKes },
];

type ToggleKey = "makes" | "models" | "bodyTypes" | "fuels" | "transmissions" | "drives" | "sourceCountries";

/**
 * Make and model as one nested tree instead of two separate flat lists -
 * checking a make still filters by make on its own, but expanding it (the
 * chevron, separate from the checkbox so the two actions don't collide)
 * reveals just that make's own models to check individually, so finding
 * "Harrier" doesn't mean scanning a single list mixed with every other
 * brand's models first. A make with a model already checked starts expanded
 * so that selection is never hidden.
 */
function MakeModelTree({
  allMakes,
  modelsByMake,
  filters,
  toggleIn,
  iconFor,
}: {
  allMakes: string[];
  modelsByMake: Record<string, string[]>;
  filters: Filters;
  toggleIn: (key: ToggleKey, val: string) => void;
  iconFor: (make: string) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(allMakes.filter((make) => filters.models.some((m) => m.startsWith(`${make} `))))
  );

  function toggleExpanded(make: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(make)) next.delete(make);
      else next.add(make);
      return next;
    });
  }

  return (
    <div className="flex flex-col max-h-96 overflow-y-auto pr-1">
      {allMakes.map((make) => {
        const models = modelsByMake[make] ?? [];
        const isOpen = expanded.has(make);
        const active = filters.makes.includes(make);
        return (
          <div key={make}>
            <div className="flex items-center gap-1 min-w-0">
              <button
                onClick={() => toggleIn("makes", make)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left min-w-0 flex-1"
                style={active ? { background: COLORS.card } : undefined}
              >
                <span
                  className="w-3.5 h-3.5 rounded border shrink-0"
                  style={active ? { background: COLORS.navy, borderColor: COLORS.navy } : { borderColor: "#D8DCE3" }}
                />
                {iconFor(make)}
                <span className="truncate">{make}</span>
              </button>
              {models.length > 0 && (
                <button
                  onClick={() => toggleExpanded(make)}
                  aria-label={isOpen ? `Collapse ${make} models` : `Expand ${make} models`}
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded"
                >
                  {isOpen ? <ChevronDown size={14} color={COLORS.slate} /> : <ChevronRight size={14} color={COLORS.slate} />}
                </button>
              )}
            </div>
            {isOpen && models.length > 0 && (
              <div className="ml-4 flex flex-col border-l pl-2 mb-1" style={{ borderColor: COLORS.line }}>
                {models.map((label) => {
                  const modelActive = filters.models.includes(label);
                  const shortLabel = label.startsWith(`${make} `) ? label.slice(make.length + 1) : label;
                  return (
                    <button
                      key={label}
                      onClick={() => toggleIn("models", label)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left min-w-0"
                      style={modelActive ? { background: COLORS.card } : undefined}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded border shrink-0"
                        style={modelActive ? { background: COLORS.navy, borderColor: COLORS.navy } : { borderColor: "#D8DCE3" }}
                      />
                      <span className="truncate">{shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FilterSidebar({
  filters,
  setFilters,
  allMakes,
  modelsByMake,
  allBodyTypes,
  allFuels,
  allTransmissions,
  allDrives,
  allSourceCountries,
}: {
  filters: Filters;
  setFilters: (updater: (f: Filters) => Filters) => void;
  allMakes: string[];
  modelsByMake: Record<string, string[]>;
  allBodyTypes: string[];
  allFuels: string[];
  allTransmissions: string[];
  allDrives: string[];
  allSourceCountries: string[];
}) {
  function patch(p: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...p }));
  }
  function toggleIn(key: ToggleKey, val: string) {
    setFilters((f) => {
      const arr = f[key];
      const removing = arr.includes(val);
      const next = removing ? arr.filter((x) => x !== val) : [...arr, val];
      // Unchecking a make used to leave that make's own model selections
      // active - invisibly, since the model checkboxes are hidden once
      // their make is collapsed - which then filtered results down to just
      // those stale models (or excluded a newly-checked make entirely) with
      // nothing on screen explaining why. Clearing them here keeps "make"
      // and "model" in sync with what's actually still checked.
      if (key === "makes" && removing) {
        return { ...f, makes: next, models: f.models.filter((m) => !m.startsWith(`${val} `)) };
      }
      return { ...f, [key]: next };
    });
  }

  return (
    <aside
      className="bg-white rounded-2xl border p-5 lg:sticky lg:top-4 lg:h-full lg:flex lg:flex-col"
      style={{ borderColor: COLORS.line }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color: COLORS.navy }}>
          Filters
        </h3>
        <button onClick={() => setFilters(() => DEFAULT_FILTERS)} className="text-xs font-medium" style={{ color: COLORS.burgundy }}>
          Reset
        </button>
      </div>

      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.slate }}>
          Search by name
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.slate }} />
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => patch({ keyword: e.target.value })}
            placeholder="e.g. Toyota Prado"
            className="border rounded-lg pl-9 pr-3 py-2 text-sm w-full"
            style={{ borderColor: "#D8DCE3" }}
          />
        </div>
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
          Total price (KSh): vehicle + freight &amp; insurance
        </div>
        <div className="flex flex-col gap-1 mb-2">
          {PRICE_BANDS.map((band) => {
            const active = filters.priceMinKes === band.min && filters.priceMaxKes === band.max;
            return (
              <button
                key={band.label}
                onClick={() => patch({ priceMinKes: band.min, priceMaxKes: band.max })}
                className="text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                style={active ? { background: COLORS.navy, color: "#fff" } : { background: COLORS.card, color: COLORS.ink }}
              >
                {band.label}
              </button>
            );
          })}
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

      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.slate }}>
          Make &amp; model
        </div>
        <MakeModelTree
          allMakes={allMakes}
          modelsByMake={modelsByMake}
          filters={filters}
          toggleIn={toggleIn}
          iconFor={(make) =>
            MAKE_LOGO[make] ? (
              // eslint-disable-next-line @next/next/no-img-element -- external logo CDN
              <img src={MAKE_LOGO[make]} alt="" className="w-4 h-4 object-contain shrink-0" loading="lazy" />
            ) : (
              <span className="w-4 h-4 shrink-0" />
            )
          }
        />
      </div>

      <CheckboxGroup title="Body type" options={allBodyTypes} selected={filters.bodyTypes} onToggle={(v) => toggleIn("bodyTypes", v)} />
      <CheckboxGroup title="Fuel" options={allFuels} selected={filters.fuels} onToggle={(v) => toggleIn("fuels", v)} />
      <CheckboxGroup title="Transmission" options={allTransmissions} selected={filters.transmissions} onToggle={(v) => toggleIn("transmissions", v)} />

      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.slate }}>
          Source market
        </div>
        <IconCheckList
          items={allSourceCountries}
          selected={filters.sourceCountries}
          onToggle={(v) => toggleIn("sourceCountries", v)}
          iconFor={(country) =>
            COUNTRY_ISO[country] ? (
              // eslint-disable-next-line @next/next/no-img-element -- external flag CDN
              <img src={`https://flagcdn.com/w40/${COUNTRY_ISO[country]}.png`} alt="" className="w-4 h-3 object-cover shrink-0" loading="lazy" />
            ) : (
              <span className="w-4 h-3 shrink-0" />
            )
          }
        />
      </div>

      <CheckboxGroup title="Drive type" options={allDrives} selected={filters.drives} onToggle={(v) => toggleIn("drives", v)} />
    </aside>
  );
}
