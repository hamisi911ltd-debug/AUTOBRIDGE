"use client";

import { useState } from "react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";

/**
 * Small-N categorical proportion chart (source mix, eligibility split, etc).
 * Kept to a handful of segments by design — a pie/donut stops being readable
 * past 5-6 slices, at which point a sorted bar chart (see BarChart) is the
 * right call instead. Center label swaps to the hovered/tapped segment;
 * legend rows share the same hover state so either side highlights the arc.
 */
export function DonutChart({
  data,
  size = 152,
  thickness = 24,
  formatValue = (v: number) => v.toLocaleString(),
  centerLabel = "Total",
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  formatValue?: (v: number) => string;
  centerLabel?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: COLORS.slate }}>
        No data yet.
      </p>
    );
  }

  const r = (size - thickness) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  const segments = data.map((d, i) => {
    const frac = d.value / total;
    const dash = frac * circumference;
    const offset = cumulative * circumference;
    cumulative += frac;
    return { ...d, dash, offset, frac, i };
  });

  const active = hoverIdx != null ? segments[hoverIdx] : null;

  return (
    <div className="flex items-center gap-4 sm:gap-6 flex-wrap sm:flex-nowrap">
      <div className="relative shrink-0 mx-auto sm:mx-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={c} cy={c} r={r} fill="none" stroke={COLORS.card} strokeWidth={thickness} />
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={-s.offset}
              strokeLinecap={segments.length > 1 ? "butt" : "round"}
              style={{ transition: "opacity 0.2s, stroke-width 0.2s", opacity: hoverIdx == null || hoverIdx === s.i ? 1 : 0.35, cursor: "default" }}
              onMouseEnter={() => setHoverIdx(s.i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <title>{`${s.label}: ${formatValue(s.value)} (${Math.round(s.frac * 100)}%)`}</title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-2 text-center">
          <span className="text-lg sm:text-xl font-bold leading-tight" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            {formatValue(active ? active.value : total)}
          </span>
          <span className="text-[10px] truncate max-w-full" style={{ color: COLORS.slate }}>
            {active ? active.label : centerLabel}
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-[140px] w-full sm:w-auto space-y-1.5">
        {segments.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-2 text-xs rounded-md px-1 -mx-1 py-0.5 transition-colors"
            style={{ background: hoverIdx === s.i ? COLORS.card : "transparent" }}
            onMouseEnter={() => setHoverIdx(s.i)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="flex-1 truncate" style={{ color: COLORS.ink }}>
              {s.label}
            </span>
            <span className="font-semibold shrink-0" style={{ color: COLORS.navy }}>
              {Math.round(s.frac * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
