"use client";

import { COLORS } from "@/lib/constants";

export function CheckboxGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (opt: string) => void;
}) {
  return (
    <div className="mb-5">
      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.slate }}>
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border transition"
              style={
                active
                  ? { background: COLORS.navy, color: "#fff", borderColor: COLORS.navy }
                  : { background: "#fff", color: COLORS.ink, borderColor: "#D8DCE3" }
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
