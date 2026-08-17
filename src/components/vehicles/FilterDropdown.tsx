"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { COLORS } from "@/lib/constants";

/**
 * A single filter's button + popover panel — the building block of the
 * horizontal filter bar. Active (count > 0) buttons fill navy so it's
 * obvious at a glance which filters are actually narrowing the results.
 * Closes on outside click, not on inner clicks, so checking several boxes
 * in a row doesn't require reopening the panel each time.
 */
export function FilterDropdown({
  label,
  count,
  children,
  wide,
  align = "left",
}: {
  label: string;
  count?: number;
  children: ReactNode;
  wide?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const active = !!count;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-colors"
        style={active ? { borderColor: COLORS.navy, background: COLORS.navy, color: "#fff" } : { borderColor: "#D8DCE3", background: "#fff", color: COLORS.ink }}
      >
        {label}
        {active && <span className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>({count})</span>}
        <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
      </button>
      {open && (
        <div
          className={`absolute z-30 top-full mt-2 bg-white rounded-xl border shadow-lg p-4 ${wide ? "w-80" : "w-64"} ${align === "right" ? "right-0" : "left-0"}`}
          style={{ borderColor: COLORS.line }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
