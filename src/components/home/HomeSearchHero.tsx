"use client";

import { useState } from "react";
import { ArrowLeft, Search, SlidersHorizontal } from "lucide-react";
import { COLORS, type Filters } from "@/lib/constants";

/**
 * Replaces the old rotating image banner: just a classic search bar +
 * filters button. The Ferbil wordmark and the live total-count stat live in
 * the Header instead (shown on every page, not just here), so they're not
 * duplicated on the homepage specifically. Back navigation (when there's
 * somewhere to go back to) sits right before the bar, not in the Header -
 * it's a search-context action, not a site-wide one.
 */
export function HomeSearchHero({
  goSearch,
  canGoBack,
  onBack,
}: {
  goSearch: (patch: Partial<Filters>) => void;
  canGoBack: boolean;
  onBack: () => void;
}) {
  const [keyword, setKeyword] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    goSearch({ keyword: keyword.trim() });
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-2.5 sm:pb-3">
      <form onSubmit={submitSearch} className="flex items-center gap-1.5 sm:gap-2 max-w-2xl mx-auto">
        {canGoBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="shrink-0 w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
            style={{ background: COLORS.card, color: COLORS.navy }}
          >
            <ArrowLeft size={16} />
          </button>
        )}
        {/* Gradient "border" via padding trick - a real CSS border can't take
           a gradient on a fully-rounded shape, so this is a 1.5px gradient
           layer behind a white inset. */}
        <div className="flex-1 rounded-full p-[1.5px]" style={{ background: "linear-gradient(90deg, #D6336C 0%, #3B1F63 100%)" }}>
          <div className="flex items-center gap-2 rounded-full bg-white pl-3 sm:pl-4 pr-1.5 sm:pr-4 py-1.5 sm:py-3">
            {/* Icon sits left on desktop (matches the Search text button
               alongside it) but moves to the right on mobile, where it's the
               only submit trigger - the separate "Search" button is dropped
               there to keep the bar itself small. */}
            <Search size={15} color={COLORS.slate} className="shrink-0 hidden sm:block" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search make or model"
              className="flex-1 min-w-0 text-xs sm:text-sm outline-none bg-transparent"
              style={{ color: COLORS.ink }}
            />
            <button type="submit" aria-label="Search" className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center sm:hidden" style={{ color: COLORS.slate }}>
              <Search size={15} />
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="hidden sm:block shrink-0 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full text-sm font-semibold text-white"
          style={{ background: COLORS.burgundy }}
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => goSearch({})}
          aria-label="Open filters"
          className="shrink-0 w-9 h-9 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center"
          style={{ background: COLORS.card, borderColor: COLORS.navy, color: COLORS.navy }}
        >
          <SlidersHorizontal size={16} strokeWidth={2.5} />
        </button>
      </form>
    </section>
  );
}
