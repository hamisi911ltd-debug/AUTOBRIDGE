import { COLORS } from "@/lib/constants";

// Validated categorical palette (dataviz skill) — passes CVD-safe adjacent
// separation on a white surface. Chart chrome (text, gridlines) stays in
// AutoBridge's own navy/slate so the chart still reads as part of the app;
// only the data marks themselves use these hues, since raw brand navy/gold
// fail the lightness/chroma checks needed for a data-encoding color.
export const CHART_COLORS = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
  magenta: "#e87ba4",
  green: "#008300",
  violet: "#4a3aa7",
  red: "#e34948",
};

const GRID = "#e1e0d9";
const AXIS_TEXT = COLORS.slate;

/**
 * Horizontal bar chart — single measure across categories, or (when
 * `compareValue` is set per row) a bullet-style pair: a light full-width
 * track for the comparison figure with the main value overlaid as a
 * narrower, solid bar — e.g. "visible" over "scraped" per make, without
 * resorting to a plain table. One hue for the main measure (this is
 * magnitude, not multi-series identity), value labelled at the tip of each
 * bar per the mark spec, thin bars with a rounded end.
 */
export function BarChart({
  data,
  color = CHART_COLORS.blue,
  height = 22,
  gap = 10,
  formatValue = (v: number) => v.toLocaleString(),
  compareLabel,
}: {
  data: { label: string; value: number; compareValue?: number }[];
  color?: string;
  height?: number;
  gap?: number;
  formatValue?: (v: number) => string;
  /** e.g. "visible / scraped" — shown once above the chart when rows carry a compareValue. */
  compareLabel?: string;
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: COLORS.slate }}>
        No data yet.
      </p>
    );
  }

  const hasCompare = data.some((d) => d.compareValue != null);
  const max = Math.max(...data.map((d) => Math.max(d.value, d.compareValue ?? 0)), 1);
  const labelWidth = 92;

  return (
    <div>
      {hasCompare && compareLabel && (
        <div className="text-[10px] sm:text-[11px] mb-2 text-right" style={{ color: COLORS.slate }}>
          {compareLabel}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap }}>
        <style>{`@keyframes barGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
        {data.map((d, i) => {
          const pct = Math.max((d.value / max) * 100, 2);
          const comparePct = d.compareValue != null ? Math.max((d.compareValue / max) * 100, 2) : null;
          return (
            <div
              key={d.label}
              className="flex items-center gap-2 sm:gap-3"
              title={comparePct != null ? `${d.label}: ${formatValue(d.value)} / ${formatValue(d.compareValue!)}` : `${d.label}: ${formatValue(d.value)}`}
            >
              <div className="text-[11px] sm:text-xs shrink-0 truncate text-right" style={{ width: labelWidth, color: COLORS.ink }}>
                {d.label}
              </div>
              <div className="flex-1 relative" style={{ height }}>
                <div className="absolute inset-y-0 left-0 rounded-r" style={{ width: "100%", background: GRID, height: 1, top: "100%" }} />
                {comparePct != null && (
                  <div
                    className="absolute left-0 top-0 rounded-r"
                    style={{ width: `${comparePct}%`, height: "100%", background: `${color}26`, borderTopRightRadius: 4, borderBottomRightRadius: 4 }}
                  />
                )}
                <div
                  className="absolute left-0 rounded-r"
                  style={{
                    width: `${pct}%`,
                    height: comparePct != null ? "55%" : "100%",
                    top: comparePct != null ? "22.5%" : 0,
                    background: color,
                    borderTopRightRadius: 4,
                    borderBottomRightRadius: 4,
                    transformOrigin: "left center",
                    animation: `barGrow 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s both`,
                  }}
                />
              </div>
              <div className="text-[11px] sm:text-xs font-semibold shrink-0 text-right" style={{ minWidth: 40, color: COLORS.navy }}>
                {formatValue(d.value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Small inline legend for a multi-color bar/segment chart. */
export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5 text-xs" style={{ color: AXIS_TEXT }}>
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: it.color }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}
