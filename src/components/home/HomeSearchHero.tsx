"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { COLORS, type Filters } from "@/lib/constants";

/**
 * Replaces the old rotating image banner: just a classic search bar +
 * filters button. The Ferbil wordmark and the live total-count stat live in
 * the Header instead (shown on every page, not just here), so they're not
 * duplicated on the homepage specifically.
 */
export function HomeSearchHero({ goSearch }: { goSearch: (patch: Partial<Filters>) => void }) {
  const [keyword, setKeyword] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    goSearch({ keyword: keyword.trim() });
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-4 sm:pb-5">
      <form onSubmit={submitSearch} className="flex items-center gap-2 max-w-2xl mx-auto">
        <div
          className="flex-1 flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 sm:py-3"
          style={{ borderColor: COLORS.line }}
        >
          <Search size={17} color={COLORS.slate} className="shrink-0" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search make or model, e.g. Toyota Land Cruiser"
            className="flex-1 min-w-0 text-sm outline-none bg-transparent"
            style={{ color: COLORS.ink }}
          />
        </div>
        <button
          type="submit"
          className="shrink-0 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full text-sm font-semibold text-white"
          style={{ background: COLORS.burgundy }}
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => goSearch({})}
          aria-label="Open filters"
          className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center"
          style={{ borderColor: COLORS.line, color: COLORS.navy }}
        >
          <SlidersHorizontal size={18} />
        </button>
      </form>
    </section>
  );
}
