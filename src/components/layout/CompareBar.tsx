"use client";

import { X } from "lucide-react";
import { COLORS } from "@/lib/constants";

export function CompareBar({ count, onView, onClear }: { count: number; onView: () => void; onClear: () => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-4">
      <div className="flex items-center gap-4 px-5 py-3 rounded-full shadow-xl" style={{ background: COLORS.navy }}>
        <span className="text-sm text-white font-medium">
          {count} vehicle{count !== 1 ? "s" : ""} to compare
        </span>
        <button onClick={onView} className="text-sm font-semibold px-4 py-1.5 rounded-full" style={{ background: COLORS.gold, color: COLORS.navyDeep }}>
          Compare now
        </button>
        <button onClick={onClear} className="text-white/60 hover:text-white">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
