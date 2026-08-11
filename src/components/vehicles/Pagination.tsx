"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS } from "@/lib/constants";

/** Real page-number navigation — replaces "keep scrolling" / "show more" patterns for long vehicle grids. */
export function Pagination({ page, pageCount, onPageChange }: { page: number; pageCount: number; onPageChange: (page: number) => void }) {
  if (pageCount <= 1) return null;

  // Always show first, last, current ± 1, collapsing the rest into "…".
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);

  const items: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) items.push("ellipsis");
    items.push(p);
    prev = p;
  }

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-8" aria-label="Pagination">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Previous page"
        className="w-9 h-9 rounded-full border flex items-center justify-center disabled:opacity-40"
        style={{ borderColor: COLORS.line }}
      >
        <ChevronLeft size={16} color={COLORS.navy} />
      </button>

      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span key={`e${i}`} className="px-1 text-sm" style={{ color: COLORS.slate }}>
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
            className="w-9 h-9 rounded-full text-sm font-semibold"
            style={item === page ? { background: COLORS.navy, color: "#fff" } : { color: COLORS.navy }}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        disabled={page === pageCount}
        aria-label="Next page"
        className="w-9 h-9 rounded-full border flex items-center justify-center disabled:opacity-40"
        style={{ borderColor: COLORS.line }}
      >
        <ChevronRight size={16} color={COLORS.navy} />
      </button>
    </nav>
  );
}
