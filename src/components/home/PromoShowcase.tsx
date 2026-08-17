"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { COLORS, FONT_DISPLAY, POPULAR_MAKES } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import type { PublicVehicle } from "@/types/vehicle";

const SLIDE_MS = 3500;

// 2019-2020 specifically: the sweet spot of KRA's import-age window where
// actual import volume concentrates — old enough to be genuinely affordable,
// still comfortably inside the 8-year eligibility cutoff.
const POSTER_YEAR_MIN = 2019;
const POSTER_YEAR_MAX = 2020;

/**
 * Two full-photo "posters" side by side, auto-sliding as a pair — a
 * dealership poster wall, not a single giant hero image hogging the whole
 * viewport. Deliberately scoped to the brands and 2019-2020 model years
 * Kenyan buyers actually import in volume; the full catalogue with every
 * brand and year still lives in the sidebar+grid below.
 */
export function PromoShowcase({
  vehicles,
  goDetail,
}: {
  vehicles: PublicVehicle[];
  goDetail: (id: string) => void;
}) {
  const featured = useMemo(() => {
    // A featured "hot pick" poster reads as one specific car — never show a
    // stand-in photo borrowed from a different unit here, even though it's
    // fine (and labeled) in the plain search grid.
    const base = vehicles.filter((v) => v.eligible && v.imageUrl && !v.isRepresentativePhoto);
    const onBrand = base.filter((v) => POPULAR_MAKES.includes(v.make));
    const inYears = onBrand.filter((v) => v.year >= POSTER_YEAR_MIN && v.year <= POSTER_YEAR_MAX);
    // Widen in stages rather than dropping straight to "everything" — first
    // relax the year window, then the brand list — so the poster wall stays
    // on-theme as long as inventory allows it to.
    const pool = inYears.length >= 4 ? inYears : onBrand.length >= 4 ? onBrand : base;
    const sharp = pool.filter((v) => v.hqImage);
    const ranked = sharp.length >= 4 ? sharp : pool;

    // One slide per make+model max — otherwise a make with lots of stock in
    // one model (e.g. Toyota Dyna trucks) can fill every slot with the same
    // car photographed differently, which reads as a bug, not variety.
    const byModel = new Map<string, PublicVehicle[]>();
    for (const v of ranked) {
      // Lowercased so inconsistent scraper casing ("Land Cruiser" vs "LAND
      // CRUISER") can't split what's really one model into two slides.
      const key = `${v.make} ${v.model}`.toLowerCase();
      const list = byModel.get(key) ?? [];
      list.push(v);
      byModel.set(key, list);
    }
    // Random pick within each model (not always the priciest unit) so the
    // wall varies from load to load instead of showing the same fixed set
    // every time — still one per model, still quality-filtered.
    const bestPerModel = [...byModel.entries()].map(([key, units]) => {
      const badged = units.filter((u) => u.badge);
      const from = badged.length > 0 ? badged : units;
      const pick = from[Math.floor(Math.random() * from.length)];
      return { key, make: pick.make, vehicle: pick };
    });

    // Round-robin across brands so a 10-slide wall spans as many of the
    // popular makes as the pool actually has, instead of one brand crowding
    // out the rest — shuffled within each brand (not sorted by price) so
    // which model leads for a given brand also varies.
    const byBrand = new Map<string, typeof bestPerModel>();
    for (const m of bestPerModel) {
      const list = byBrand.get(m.make) ?? [];
      list.push(m);
      byBrand.set(m.make, list);
    }
    for (const list of byBrand.values()) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }

    const brandOrder = [...byBrand.keys()].sort((a, b) => POPULAR_MAKES.indexOf(a) - POPULAR_MAKES.indexOf(b));
    const ordered: PublicVehicle[] = [];
    let round = 0;
    while (ordered.length < 10) {
      let addedThisRound = false;
      for (const make of brandOrder) {
        const list = byBrand.get(make)!;
        if (round < list.length) {
          ordered.push(list[round].vehicle);
          addedThisRound = true;
          if (ordered.length >= 10) break;
        }
      }
      if (!addedThisRound) break;
      round++;
    }
    return ordered;
  }, [vehicles]);

  const pairs = useMemo(() => {
    const out: PublicVehicle[][] = [];
    for (let i = 0; i < featured.length; i += 2) out.push(featured.slice(i, i + 2));
    return out;
  }, [featured]);

  const [pairIndex, setPairIndex] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (pairs.length <= 1) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setPairIndex((i) => (i + 1) % pairs.length);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [pairs.length]);

  if (pairs.length === 0) return null;
  const current = pairs[pairIndex];

  return (
    <section className="relative" style={{ background: COLORS.paper }}>
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-6 sm:pt-6 sm:pb-7"
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onTouchStart={() => (pausedRef.current = true)}
        onTouchEnd={() => (pausedRef.current = false)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold tracking-wide uppercase" style={{ color: COLORS.burgundy }}>
            On the lot right now
          </div>
          {pairs.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPairIndex((i) => (i - 1 + pairs.length) % pairs.length)}
                aria-label="Previous posters"
                className="w-8 h-8 rounded-full border flex items-center justify-center"
                style={{ borderColor: COLORS.line }}
              >
                <ChevronLeft size={16} color={COLORS.navy} />
              </button>
              <div className="flex gap-1.5">
                {pairs.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPairIndex(i)}
                    aria-label={`Go to poster set ${i + 1}`}
                    className="rounded-full transition-all"
                    style={{ width: i === pairIndex ? 18 : 6, height: 6, background: i === pairIndex ? COLORS.gold : COLORS.line }}
                  />
                ))}
              </div>
              <button
                onClick={() => setPairIndex((i) => (i + 1) % pairs.length)}
                aria-label="Next posters"
                className="w-8 h-8 rounded-full border flex items-center justify-center"
                style={{ borderColor: COLORS.line }}
              >
                <ChevronRight size={16} color={COLORS.navy} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {current.map((v) => (
            <button
              key={v.id}
              onClick={() => goDetail(v.id)}
              className="group relative h-56 sm:h-80 lg:h-96 rounded-2xl overflow-hidden text-left shadow-xl ring-1 ring-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external R2 CDN */}
              <img
                src={v.imageUrl!}
                alt={`${v.year} ${v.make} ${v.model}`}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-x-0 bottom-0 h-28" style={{ background: "linear-gradient(0deg, rgba(7,21,39,0.95) 20%, rgba(7,21,39,0) 100%)" }} />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "linear-gradient(120deg, transparent 30%, rgba(230,193,119,0.18) 45%, transparent 60%)" }}
              />

              <span
                className="absolute top-3 left-3 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
                style={{ background: COLORS.gold, color: COLORS.navyDeep }}
              >
                {v.badge ?? "Hot pick"}
              </span>

              <div className="absolute inset-x-0 bottom-0 p-4">
                <h2 className="text-lg sm:text-xl font-bold text-white drop-shadow-sm" style={{ fontFamily: FONT_DISPLAY }}>
                  {v.year} {v.make} {v.model}
                </h2>
                <p className="text-xs mt-1 flex items-center gap-3 flex-wrap" style={{ color: "#C6CEDD" }}>
                  <span>{v.trim}</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> {v.sourceCountry}
                  </span>
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xl font-bold" style={{ color: COLORS.goldLight, fontFamily: FONT_DISPLAY }}>
                    {formatUsd(v.sellingPriceUsd)}
                  </span>
                  <span
                    className="text-xs font-semibold px-3 py-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: COLORS.burgundy }}
                  >
                    View details
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
