"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS, FONT_DISPLAY, POPULAR_MAKES } from "@/lib/constants";
import type { PublicVehicle } from "@/types/vehicle";

const TILES_PER_CATEGORY = 10;
const AUTO_ADVANCE_MS = 4000;

type ModelTile = {
  key: string;
  make: string;
  model: string;
  count: number;
  vehicle: PublicVehicle;
};

/**
 * "What actually sells" by body-type category, ranked by how many units of
 * each make+model are currently in stock — a real signal from our own
 * inventory, not a guess. Every distinct body type actually present in the
 * catalogue gets its own tab (sorted by total units so the biggest
 * categories lead), rather than a fixed curated list that could miss
 * whatever body types the scraper happens to bring in. Auto-advances
 * through categories on its own (with manual prev/next too); tiles run in a
 * single non-wrapping row so a category with fewer than a full row of
 * models never leaves an empty gap the way a wrapping grid would.
 */
export function BestSellersByCategory({ vehicles, goDetail }: { vehicles: PublicVehicle[]; goDetail: (id: string) => void }) {
  const categories = useMemo(() => {
    const byCategory = new Map<string, ModelTile[]>();
    const bodyTypesPresent = [...new Set(vehicles.filter((v) => v.eligible).map((v) => v.bodyType))];

    for (const bodyType of bodyTypesPresent) {
      const inCategory = vehicles.filter((v) => v.eligible && v.bodyType === bodyType);
      const byModel = new Map<string, PublicVehicle[]>();
      for (const v of inCategory) {
        const key = `${v.make} ${v.model}`;
        const list = byModel.get(key) ?? [];
        list.push(v);
        byModel.set(key, list);
      }

      const ranked: ModelTile[] = [...byModel.entries()]
        .map(([key, units]) => {
          // A unit with its own real photo always outranks one only showing
          // a same-model stand-in — this tile presents one specific car.
          const best = [...units].sort(
            (a, b) =>
              Number(!a.isRepresentativePhoto) - Number(!b.isRepresentativePhoto) ||
              Number(b.hqImage) - Number(a.hqImage) ||
              Number(!!b.imageUrl) - Number(!!a.imageUrl)
          )[0];
          return { key, make: best.make, model: best.model, count: units.length, vehicle: best };
        })
        .filter((t) => t.vehicle.imageUrl)
        .sort((a, b) => b.count - a.count);

      // Popular-brand models first, then fill any remaining slots from the
      // rest — a category never falls short of a full row just because the
      // priority brands don't happen to sell that body type in bulk.
      const popular = ranked.filter((t) => POPULAR_MAKES.includes(t.make));
      const rest = ranked.filter((t) => !POPULAR_MAKES.includes(t.make));
      const tiles = [...popular, ...rest].slice(0, TILES_PER_CATEGORY);

      if (tiles.length >= 3) byCategory.set(bodyType, tiles);
    }

    return [...byCategory.entries()].sort(
      (a, b) => b[1].reduce((sum, t) => sum + t.count, 0) - a[1].reduce((sum, t) => sum + t.count, 0)
    );
  }, [vehicles]);

  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (categories.length <= 1) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % categories.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [categories.length]);

  if (categories.length === 0) return null;
  const [bodyType, tiles] = categories[index];

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onTouchStart={() => (pausedRef.current = true)}
      onTouchEnd={() => (pausedRef.current = false)}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="w-10 h-1 rounded-full mb-3" style={{ background: COLORS.gold }} />
          <h2 className="text-2xl sm:text-3xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Best sellers by category
          </h2>
        </div>
        {categories.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIndex((i) => (i - 1 + categories.length) % categories.length)}
              aria-label="Previous category"
              className="w-9 h-9 rounded-full border flex items-center justify-center"
              style={{ borderColor: COLORS.line }}
            >
              <ChevronLeft size={16} color={COLORS.navy} />
            </button>
            <button
              onClick={() => setIndex((i) => (i + 1) % categories.length)}
              aria-label="Next category"
              className="w-9 h-9 rounded-full border flex items-center justify-center"
              style={{ borderColor: COLORS.line }}
            >
              <ChevronRight size={16} color={COLORS.navy} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "thin" }}>
        {categories.map(([cat], i) => (
          <button
            key={cat}
            onClick={() => setIndex(i)}
            className="text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full transition-colors shrink-0"
            style={{
              background: i === index ? COLORS.navy : COLORS.card,
              color: i === index ? "#fff" : COLORS.navy,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Horizontal slide, always — a fixed calc() basis on mobile shows
         exactly 3 tiles at once (rather than the 2ish that fell out of the
         old fixed 160px width), the rest still reachable by swiping; sm:+
         reverts to the original fixed width since there's more room. */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "thin" }}>
        {tiles.map((t, i) => (
          <button
            key={t.key}
            onClick={() => goDetail(t.vehicle.id)}
            className="group text-left rounded-2xl border overflow-hidden bg-white flex-none basis-[calc((100%-1.5rem)/3)] sm:flex-1 sm:basis-44 sm:min-w-[160px]"
            style={{ borderColor: COLORS.line }}
          >
            <div className="relative aspect-[4/3]" style={{ background: COLORS.card }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- external R2 CDN */}
              <img
                src={t.vehicle.imageUrl!}
                alt={t.key}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Rank number — hidden on mobile, tiles are too narrow there for it to read as anything but clutter */}
              <span
                className="hidden sm:flex absolute top-2 left-2 w-6 h-6 rounded-full items-center justify-center text-xs font-bold text-white"
                style={{ background: COLORS.gold }}
              >
                {i + 1}
              </span>
            </div>
            <div className="p-2 sm:p-3">
              <div className="text-xs sm:text-sm font-semibold truncate" style={{ color: COLORS.navy }}>
                {t.key}
              </div>
              <div className="text-[10px] sm:text-xs mt-0.5 truncate" style={{ color: COLORS.slate }}>
                {t.count} in stock
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
