"use client";

import type { ReactNode } from "react";
import { COLORS } from "@/lib/constants";

/** A dense, scrollable list with an optional leading icon per row — used for Make, Model and Country, which all need more visual weight than a plain checkbox pill. `counts` still drives sort order upstream, just isn't shown as a number here. */
export function IconCheckList({
  items,
  selected,
  onToggle,
  iconFor,
}: {
  items: string[];
  selected: string[];
  onToggle: (v: string) => void;
  iconFor?: (item: string) => ReactNode;
}) {
  return (
    <div className="flex flex-col max-h-56 overflow-y-auto pr-1">
      {items.map((item) => {
        const active = selected.includes(item);
        return (
          <button
            key={item}
            onClick={() => onToggle(item)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left min-w-0"
            style={active ? { background: COLORS.card } : undefined}
          >
            <span
              className="w-3.5 h-3.5 rounded border shrink-0"
              style={active ? { background: COLORS.navy, borderColor: COLORS.navy } : { borderColor: "#D8DCE3" }}
            />
            {iconFor?.(item)}
            <span className="truncate">{item}</span>
          </button>
        );
      })}
    </div>
  );
}
