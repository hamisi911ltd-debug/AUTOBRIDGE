"use client";

import { useState } from "react";
import { LayoutGrid, Search, X } from "lucide-react";
import { COLORS, FONT_DISPLAY, type Filters } from "@/lib/constants";
import { IMPORT_ELIGIBLE_FROM_YEAR } from "@/lib/scrapers/normalize";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - IMPORT_ELIGIBLE_FROM_YEAR + 1 }, (_, i) => CURRENT_YEAR - i);

/**
 * Replaces the old rotating image banner: the Ferbil wordmark, the total
 * catalogue size as a real, gently-animated number (advertises scale
 * honestly - no fabricated "1000s of deals" copy), and a single "Browse
 * catalogue" control - not a search bar sitting open by default, an icon
 * that drops down the actual search + year-range mechanism only once
 * tapped. Corners are deliberately subtle (rounded-xl, not rounded-full)
 * throughout, not the pill shape used elsewhere on the site.
 */
export function HomeSearchHero({ totalCount, goSearch }: { totalCount: number; goSearch: (patch: Partial<Filters>) => void }) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [yearMin, setYearMin] = useState(IMPORT_ELIGIBLE_FROM_YEAR);
  const [yearMax, setYearMax] = useState(CURRENT_YEAR);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    goSearch({ keyword: keyword.trim(), yearMin, yearMax });
    setOpen(false);
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

      <div className="max-w-md mx-auto relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 sm:py-3 text-sm font-semibold"
          style={{ borderColor: COLORS.line, color: COLORS.navy }}
        >
          {open ? <X size={17} /> : <LayoutGrid size={17} />}
          Browse catalogue
        </button>

        {open && (
          <form
            onSubmit={submitSearch}
            className="absolute z-20 top-full mt-2 w-full bg-white rounded-xl border shadow-xl p-4 space-y-3"
            style={{ borderColor: COLORS.line }}
          >
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: COLORS.line }}>
              <Search size={15} color={COLORS.slate} className="shrink-0" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search make or model"
                className="flex-1 min-w-0 text-sm outline-none bg-transparent"
                style={{ color: COLORS.ink }}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: COLORS.slate }}>
                  Year from
                </span>
                <select
                  value={yearMin}
                  onChange={(e) => setYearMin(Number(e.target.value))}
                  className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none"
                  style={{ borderColor: COLORS.line, color: COLORS.ink }}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-wide block mb-1" style={{ color: COLORS.slate }}>
                  Year to
                </span>
                <select
                  value={yearMax}
                  onChange={(e) => setYearMax(Number(e.target.value))}
                  className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none"
                  style={{ borderColor: COLORS.line, color: COLORS.ink }}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: COLORS.burgundy }}
            >
              Search catalogue
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
