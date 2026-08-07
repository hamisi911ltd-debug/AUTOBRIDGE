"use client";

import { useMemo, useState } from "react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import { computeSellingPriceUsd, type Tier } from "@/lib/pricing/engine";
import { savePricingRule, deletePricingRule, toggleRuleActive } from "@/app/admin/actions";

type ScopeType = "GLOBAL" | "COUNTRY" | "EXPORTER" | "BODY_TYPE" | "MAKE" | "MODEL" | "PRICE_BAND";
type MarkupType = "PERCENT" | "FIXED" | "TIERED";

type RuleRow = {
  id: string;
  name: string;
  scopeType: ScopeType;
  scopeValue: string | null;
  markupType: MarkupType;
  value: number | null;
  tiers: string | null;
  priceMinUsd: number | null;
  priceMaxUsd: number | null;
  minProfitUsd: number | null;
  maxProfitUsd: number | null;
  priority: number;
  active: boolean;
};

type PreviewVehicle = {
  id: string;
  make: string;
  model: string;
  bodyType: string;
  sourceCountry: string;
  sourcePriceUsd: number;
  year: number;
};

const SCOPE_LABELS: Record<ScopeType, string> = {
  GLOBAL: "Global default",
  COUNTRY: "Source country",
  EXPORTER: "Exporter",
  BODY_TYPE: "Body type",
  MAKE: "Make",
  MODEL: "Model",
  PRICE_BAND: "Price band",
};

const DEFAULT_TIERS: Tier[] = [
  { min: 0, max: 5000, percent: 0.15 },
  { min: 5000, max: 10000, percent: 0.1 },
  { min: 10000, max: 20000, percent: 0.08 },
  { min: 20000, max: 40000, percent: 0.06 },
  { min: 40000, max: null, percent: 0.04 },
];

function emptyDraft(rule?: RuleRow) {
  return {
    id: rule?.id ?? null,
    name: rule?.name ?? "",
    scopeType: (rule?.scopeType ?? "GLOBAL") as ScopeType,
    scopeValue: rule?.scopeValue ?? "",
    markupType: (rule?.markupType ?? "TIERED") as MarkupType,
    value: rule?.value != null ? String(rule.value * 100) : "",
    tiers: rule?.tiers ? (JSON.parse(rule.tiers) as Tier[]) : DEFAULT_TIERS,
    priceMinUsd: rule?.priceMinUsd != null ? String(rule.priceMinUsd) : "",
    priceMaxUsd: rule?.priceMaxUsd != null ? String(rule.priceMaxUsd) : "",
    minProfitUsd: rule?.minProfitUsd != null ? String(rule.minProfitUsd) : "",
    maxProfitUsd: rule?.maxProfitUsd != null ? String(rule.maxProfitUsd) : "",
    priority: String(rule?.priority ?? 0),
    active: rule?.active ?? true,
  };
}

type Draft = ReturnType<typeof emptyDraft>;

export function PricingRulesManager({ initialRules, vehicles }: { initialRules: RuleRow[]; vehicles: PreviewVehicle[] }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [previewVehicleId, setPreviewVehicleId] = useState(vehicles[0]?.id ?? "");

  const previewVehicle = vehicles.find((v) => v.id === previewVehicleId) ?? vehicles[0];

  const preview = useMemo(() => {
    if (!previewVehicle) return null;

    const draftAsRule = {
      id: draft.id ?? "__draft__",
      scopeType: draft.scopeType,
      scopeValue: ["COUNTRY", "EXPORTER", "BODY_TYPE", "MAKE", "MODEL"].includes(draft.scopeType) ? draft.scopeValue || null : null,
      markupType: draft.markupType,
      value: draft.markupType === "TIERED" ? null : draft.value === "" ? null : Number(draft.value) / 100,
      tiers: draft.markupType === "TIERED" ? JSON.stringify(draft.tiers) : null,
      priceMinUsd: draft.scopeType === "PRICE_BAND" ? (draft.priceMinUsd === "" ? null : Number(draft.priceMinUsd)) : null,
      priceMaxUsd: draft.scopeType === "PRICE_BAND" ? (draft.priceMaxUsd === "" ? null : Number(draft.priceMaxUsd)) : null,
      minProfitUsd: draft.minProfitUsd === "" ? null : Number(draft.minProfitUsd),
      maxProfitUsd: draft.maxProfitUsd === "" ? null : Number(draft.maxProfitUsd),
      priority: Number(draft.priority) || 0,
      active: true,
      updatedAt: new Date(),
    };

    const otherRules = initialRules
      .filter((r) => r.id !== draft.id)
      .map((r) => ({ ...r, updatedAt: new Date() }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rules = [...otherRules, draftAsRule] as any[];

    return computeSellingPriceUsd(previewVehicle, rules);
  }, [draft, previewVehicle, initialRules]);

  function updateTier(index: number, patch: Partial<Tier>) {
    setDraft((d) => ({ ...d, tiers: d.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)) }));
  }
  function addTier() {
    setDraft((d) => {
      const last = d.tiers[d.tiers.length - 1];
      const min = last?.max ?? 0;
      return { ...d, tiers: [...d.tiers, { min: min ?? 0, max: null, percent: 0.05 }] };
    });
  }
  function removeTier(index: number) {
    setDraft((d) => ({ ...d, tiers: d.tiers.filter((_, i) => i !== index) }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Pricing rules
        </h1>
        <button
          onClick={() => setDraft(emptyDraft())}
          className="text-sm font-semibold px-4 py-2 rounded-full text-white"
          style={{ background: COLORS.navy }}
        >
          + New rule
        </button>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden mb-8" style={{ borderColor: COLORS.line }}>
        <table className="w-full text-sm">
          <thead style={{ background: COLORS.card }}>
            <tr className="text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Scope</th>
              <th className="p-3">Markup</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {initialRules.map((r) => (
              <tr key={r.id} className="border-t" style={{ borderColor: COLORS.line }}>
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3">
                  {SCOPE_LABELS[r.scopeType]}
                  {r.scopeValue ? ` · ${r.scopeValue}` : ""}
                  {r.scopeType === "PRICE_BAND" ? ` · $${r.priceMinUsd ?? 0}–${r.priceMaxUsd ?? "∞"}` : ""}
                </td>
                <td className="p-3">
                  {r.markupType === "TIERED"
                    ? "Tiered %"
                    : r.markupType === "PERCENT"
                      ? `${Math.round((r.value ?? 0) * 100)}%`
                      : formatUsd(r.value ?? 0)}
                </td>
                <td className="p-3">{r.priority}</td>
                <td className="p-3">
                  <form action={toggleRuleActive}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="text-xs font-semibold px-2 py-1 rounded-full" style={r.active ? { background: "#DCFCE7", color: "#166534" } : { background: "#F3F4F6", color: COLORS.slate }}>
                      {r.active ? "Active" : "Inactive"}
                    </button>
                  </form>
                </td>
                <td className="p-3 flex gap-3">
                  <button onClick={() => setDraft(emptyDraft(r))} className="text-xs font-medium" style={{ color: COLORS.navy }}>
                    Edit
                  </button>
                  <form
                    action={deletePricingRule}
                    onSubmit={(e) => {
                      if (!confirm(`Delete rule "${r.name}"?`)) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="text-xs font-medium" style={{ color: COLORS.burgundy }}>
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {initialRules.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm" style={{ color: COLORS.slate }}>
                  No pricing rules yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <form action={savePricingRule} className="bg-white rounded-2xl border p-6" style={{ borderColor: COLORS.line }}>
          <h2 className="font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            {draft.id ? "Edit rule" : "New rule"}
          </h2>
          {draft.id && <input type="hidden" name="id" value={draft.id} />}

          <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.slate }}>
            Name
          </label>
          <input
            name="name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            required
            className="w-full mb-4 border rounded-lg px-3 py-2 text-sm"
            style={{ borderColor: "#D8DCE3" }}
            placeholder="e.g. Japan Toyota premium"
          />

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.slate }}>
                Scope
              </label>
              <select
                name="scopeType"
                value={draft.scopeType}
                onChange={(e) => setDraft((d) => ({ ...d, scopeType: e.target.value as ScopeType }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: "#D8DCE3" }}
              >
                {Object.entries(SCOPE_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {["COUNTRY", "EXPORTER", "BODY_TYPE", "MAKE", "MODEL"].includes(draft.scopeType) && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.slate }}>
                  Scope value
                </label>
                <input
                  name="scopeValue"
                  value={draft.scopeValue}
                  onChange={(e) => setDraft((d) => ({ ...d, scopeValue: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "#D8DCE3" }}
                  placeholder={draft.scopeType === "MAKE" ? "e.g. Toyota" : draft.scopeType === "COUNTRY" ? "e.g. Japan" : "e.g. SUV"}
                />
              </div>
            )}
            {draft.scopeType === "PRICE_BAND" && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.slate }}>
                    Min USD
                  </label>
                  <input
                    name="priceMinUsd"
                    type="number"
                    value={draft.priceMinUsd}
                    onChange={(e) => setDraft((d) => ({ ...d, priceMinUsd: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: "#D8DCE3" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.slate }}>
                    Max USD
                  </label>
                  <input
                    name="priceMaxUsd"
                    type="number"
                    value={draft.priceMaxUsd}
                    onChange={(e) => setDraft((d) => ({ ...d, priceMaxUsd: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: "#D8DCE3" }}
                  />
                </div>
              </>
            )}
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.slate }}>
            Markup type
          </label>
          <select
            name="markupType"
            value={draft.markupType}
            onChange={(e) => setDraft((d) => ({ ...d, markupType: e.target.value as MarkupType }))}
            className="w-full mb-4 border rounded-lg px-3 py-2 text-sm"
            style={{ borderColor: "#D8DCE3" }}
          >
            <option value="TIERED">Tiered % by price band</option>
            <option value="PERCENT">Flat percentage</option>
            <option value="FIXED">Fixed USD amount</option>
          </select>

          {draft.markupType === "TIERED" ? (
            <div className="mb-4">
              <input type="hidden" name="tiers" value={JSON.stringify(draft.tiers)} />
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.slate }}>
                Bands (source price USD → markup %)
              </div>
              <div className="space-y-2">
                {draft.tiers.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <input
                      type="number"
                      value={t.min}
                      onChange={(e) => updateTier(i, { min: Number(e.target.value) || 0 })}
                      className="w-24 border rounded-lg px-2 py-1.5"
                      style={{ borderColor: "#D8DCE3" }}
                    />
                    <span style={{ color: COLORS.slate }}>–</span>
                    <input
                      type="number"
                      value={t.max ?? ""}
                      placeholder="∞"
                      onChange={(e) => updateTier(i, { max: e.target.value === "" ? null : Number(e.target.value) })}
                      className="w-24 border rounded-lg px-2 py-1.5"
                      style={{ borderColor: "#D8DCE3" }}
                    />
                    <span style={{ color: COLORS.slate }}>→</span>
                    <input
                      type="number"
                      value={Math.round(t.percent * 100)}
                      onChange={(e) => updateTier(i, { percent: (Number(e.target.value) || 0) / 100 })}
                      className="w-20 border rounded-lg px-2 py-1.5"
                      style={{ borderColor: "#D8DCE3" }}
                    />
                    <span style={{ color: COLORS.slate }}>%</span>
                    <button type="button" onClick={() => removeTier(i)} className="text-xs" style={{ color: COLORS.burgundy }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addTier} className="text-xs font-medium mt-2" style={{ color: COLORS.navy }}>
                + Add band
              </button>
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.slate }}>
                {draft.markupType === "PERCENT" ? "Percent (%)" : "Amount (USD)"}
              </label>
              <input
                name="value"
                type="number"
                value={draft.value}
                onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: "#D8DCE3" }}
                placeholder={draft.markupType === "PERCENT" ? "e.g. 8" : "e.g. 700"}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.slate }}>
                Min profit USD (optional)
              </label>
              <input
                name="minProfitUsd"
                type="number"
                value={draft.minProfitUsd}
                onChange={(e) => setDraft((d) => ({ ...d, minProfitUsd: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: "#D8DCE3" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.slate }}>
                Max profit USD (optional)
              </label>
              <input
                name="maxProfitUsd"
                type="number"
                value={draft.maxProfitUsd}
                onChange={(e) => setDraft((d) => ({ ...d, maxProfitUsd: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: "#D8DCE3" }}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 mb-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.slate }}>
                Priority
              </label>
              <input
                name="priority"
                type="number"
                value={draft.priority}
                onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
                className="w-24 border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: "#D8DCE3" }}
              />
            </div>
            <label className="flex items-center gap-2 text-sm mt-5">
              <input
                type="checkbox"
                name="active"
                checked={draft.active}
                onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
                className="w-4 h-4"
              />
              Active
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className="px-5 py-2.5 rounded-full text-sm font-semibold text-white" style={{ background: COLORS.burgundy }}>
              {draft.id ? "Save changes" : "Create rule"}
            </button>
            {draft.id && (
              <button type="button" onClick={() => setDraft(emptyDraft())} className="text-sm font-medium" style={{ color: COLORS.slate }}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="bg-white rounded-2xl border p-6 h-fit sticky" style={{ borderColor: COLORS.line, top: "1.5rem" }}>
          <h2 className="font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Live preview
          </h2>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.slate }}>
            Sample vehicle
          </label>
          <select
            value={previewVehicleId}
            onChange={(e) => setPreviewVehicleId(e.target.value)}
            className="w-full mb-4 border rounded-lg px-3 py-2 text-sm"
            style={{ borderColor: "#D8DCE3" }}
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.year} {v.make} {v.model} ({formatUsd(v.sourcePriceUsd)})
              </option>
            ))}
          </select>

          {previewVehicle && preview && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span style={{ color: COLORS.slate }}>Source price</span>
                <span className="font-medium">{formatUsd(previewVehicle.sourcePriceUsd)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.slate }}>Applied rule</span>
                <span className="font-medium">{preview.appliedRule?.name ?? "None (no markup)"}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.slate }}>Margin</span>
                <span className="font-medium">{formatUsd(preview.marginUsd)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t" style={{ borderColor: COLORS.line }}>
                <span className="font-semibold" style={{ color: COLORS.navy }}>
                  Selling price
                </span>
                <span className="font-bold text-lg" style={{ color: COLORS.burgundy, fontFamily: FONT_DISPLAY }}>
                  {formatUsd(preview.sellingPriceUsd)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
