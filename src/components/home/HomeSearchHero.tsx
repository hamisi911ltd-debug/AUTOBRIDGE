"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { COLORS, FONT_DISPLAY, type Filters } from "@/lib/constants";

/**
 * Replaces the old rotating image banner: the Ferbil wordmark, the total
 * catalogue size as a real, gently-animated number (advertises scale
 * honestly - no fabricated "1000s of deals" copy), and a classic search bar
 * + filters button.
 */
export function HomeSearchHero({ totalCount, goSearch }: { totalCount: number; goSearch: (patch: Partial<Filters>) => void }) {
  const [keyword, setKeyword] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    goSearch({ keyword: keyword.trim() });
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-4 sm:pb-5">
      <div className="flex flex-col items-center text-center mb-4 sm:mb-5">
        <div className="flex items-center gap-2 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo mark */}
          <img src="/ferbil-logo.svg" alt="" className="w-7 h-7 sm:w-8 sm:h-8" />
          <div className="text-left leading-none">
            <div className="text-lg sm:text-xl font-bold tracking-wide" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
              FERBIL
            </div>
            <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] mt-0.5" style={{ color: COLORS.slate }}>
              Car Imports
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: COLORS.gold }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: COLORS.gold }} />
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold animate-pulse" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            {totalCount.toLocaleString()}+
          </div>
        </div>
        <p className="text-xs sm:text-sm mt-1" style={{ color: COLORS.slate }}>
          Real, import-eligible vehicles in stock right now
        </p>
      </div>

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
