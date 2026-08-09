"use client";

import { useId, useState } from "react";
import { COLORS } from "@/lib/constants";
import { CHART_COLORS } from "@/components/admin/charts/BarChart";

const GRID = "#e1e0d9";

/**
 * Single-series line + area chart for a value over time (enquiries/day,
 * scrape volume/day, etc). 2px line, ~10% opacity area wash, end-value
 * label, hover crosshair with a per-point tooltip via native SVG title
 * plus a lightweight synced label — enough interactivity for an internal
 * admin tool without a charting dependency.
 */
export function AreaChart({
  data,
  color = CHART_COLORS.blue,
  height = 160,
  unitSingular,
  unitPlural,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  /** e.g. unitSingular="enquiry" unitPlural="enquiries" → "3 enquiries". Omit for a bare number. */
  unitSingular?: string;
  unitPlural?: string;
}) {
  const formatValue = (v: number) => (unitSingular ? `${v.toLocaleString()} ${v === 1 ? unitSingular : (unitPlural ?? `${unitSingular}s`)}` : v.toLocaleString());
  const gradientId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: COLORS.slate }}>
        No data yet.
      </p>
    );
  }

  const width = 560;
  const padTop = 16;
  const padBottom = 24;
  const padLeft = 8;
  const padRight = 8;
  const plotH = height - padTop - padBottom;
  const plotW = width - padLeft - padRight;
  const max = Math.max(...data.map((d) => d.value), 1);

  const points = data.map((d, i) => {
    const x = padLeft + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const y = padTop + plotH - (d.value / max) * plotH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${padTop + plotH} L${points[0].x},${padTop + plotH} Z`;

  const gridY = [0, 0.5, 1].map((f) => padTop + plotH * f);
  const active = hoverIdx != null ? points[hoverIdx] : points[points.length - 1];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-fraunces)", color: COLORS.navy }}>
          {formatValue(active.value)}
        </span>
        <span className="text-xs" style={{ color: COLORS.slate }}>
          {active.label}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.12} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {gridY.map((y) => (
          <line key={y} x1={padLeft} x2={width - padRight} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {hoverIdx != null && (
          <line
            x1={active.x}
            x2={active.x}
            y1={padTop}
            y2={padTop + plotH}
            stroke={COLORS.slate}
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        )}

        <circle cx={active.x} cy={active.y} r={4} fill={color} stroke="#fff" strokeWidth={2} />

        {points.map((p, i) => (
          <rect
            key={p.label}
            x={p.x - plotW / data.length / 2}
            y={padTop}
            width={plotW / data.length}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          >
            <title>{`${p.label}: ${formatValue(p.value)}`}</title>
          </rect>
        ))}

        {points
          .filter((_, i) => i === 0 || i === points.length - 1 || data.length <= 8)
          .map((p) => (
            <text key={p.label} x={p.x} y={height - 6} fontSize={10} fill={COLORS.slate} textAnchor="middle">
              {p.label}
            </text>
          ))}
      </svg>
    </div>
  );
}
