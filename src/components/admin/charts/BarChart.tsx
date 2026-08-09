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
 * Horizontal bar chart — single measure across categories. One hue for all
 * bars (this is magnitude, not multi-series identity), value labelled at
 * the tip of each bar per the mark spec, thin bars with a rounded end.
 */
export function BarChart({
  data,
  color = CHART_COLORS.blue,
  height = 22,
  gap = 10,
  formatValue = (v: number) => v.toLocaleString(),
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  gap?: number;
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: COLORS.slate }}>
        No data yet.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const labelWidth = 108;
  const chartWidth = 100; // percent-based track, label/value sit outside in flex

  return (
    <div className="space-y-0" style={{ display: "flex", flexDirection: "column", gap }}>
      {data.map((d) => {
        const pct = Math.max((d.value / max) * 100, 2);
        return (
          <div key={d.label} className="flex items-center gap-3" title={`${d.label}: ${formatValue(d.value)}`}>
            <div
              className="text-xs shrink-0 truncate text-right"
              style={{ width: labelWidth, color: COLORS.ink }}
            >
              {d.label}
            </div>
            <div className="flex-1 relative" style={{ height }}>
              <div
                className="absolute inset-y-0 left-0 rounded-r"
                style={{ width: `${chartWidth}%`, background: GRID, height: 1, top: "100%" }}
              />
              <div
                className="absolute left-0 top-0 rounded-r"
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: color,
                  borderTopRightRadius: 4,
                  borderBottomRightRadius: 4,
                }}
              />
            </div>
            <div className="text-xs font-semibold shrink-0 w-14 text-right" style={{ color: COLORS.navy }}>
              {formatValue(d.value)}
            </div>
          </div>
        );
      })}
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
