"use client";

import { useMemo } from "react";
import { COLORS, FONT_DISPLAY, type Filters } from "@/lib/constants";
import { MAKE_LOGO, COUNTRY_ISO } from "@/lib/vehicleBranding";
import type { PublicVehicle } from "@/types/vehicle";

function countBy<T extends string>(vehicles: PublicVehicle[], key: (v: PublicVehicle) => T): [T, number][] {
  const counts = new Map<T, number>();
  for (const v of vehicles) {
    const k = key(v);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function BrowseGrids({
  vehicles,
  goSearch,
}: {
  vehicles: PublicVehicle[];
  goSearch: (patch: Partial<Filters>) => void;
}) {
  const eligible = useMemo(() => vehicles.filter((v) => v.eligible), [vehicles]);
  const byMake = useMemo(() => countBy(eligible, (v) => v.make), [eligible]);
  const byCountry = useMemo(() => countBy(eligible, (v) => v.sourceCountry), [eligible]);
  // Top 12 by count — the long tail of one-off models isn't worth a tile.
  const byModel = useMemo(() => countBy(eligible, (v) => `${v.make} ${v.model}`).slice(0, 12), [eligible]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-12">
      <div>
        <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Browse by make
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {byMake.map(([make, count]) => (
            <button
              key={make}
              onClick={() => goSearch({ makes: [make] })}
              className="flex items-center gap-3 p-3 rounded-xl border hover:shadow-md transition text-left"
              style={{ borderColor: COLORS.line }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 p-1.5"
                style={{ background: COLORS.card }}
              >
                {MAKE_LOGO[make] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external logo CDN
                  <img src={MAKE_LOGO[make]} alt={`${make} logo`} className="w-full h-full object-contain" loading="lazy" />
                ) : (
                  <span className="text-xs font-bold" style={{ color: COLORS.burgundy }}>
                    {make[0]}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: COLORS.navy }}>
                  {make}
                </div>
                <div className="text-xs" style={{ color: COLORS.slate }}>
                  {count}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Browse by model
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {byModel.map(([label, count]) => (
            <button
              key={label}
              onClick={() => goSearch({ keyword: label })}
              className="flex items-center justify-between p-3 rounded-xl border hover:shadow-md transition text-left"
              style={{ borderColor: COLORS.line }}
            >
              <span className="text-sm font-semibold truncate" style={{ color: COLORS.navy }}>
                {label}
              </span>
              <span className="text-xs shrink-0 ml-2" style={{ color: COLORS.slate }}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Browse by source market
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {byCountry.map(([country, count]) => (
            <button
              key={country}
              onClick={() => goSearch({ sourceCountries: [country] })}
              className="flex items-center gap-3 p-3 rounded-xl border hover:shadow-md transition text-left"
              style={{ borderColor: COLORS.line }}
            >
              <span
                className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0 text-[11px] font-bold tracking-wide"
                style={{ background: COLORS.card, color: COLORS.burgundy }}
              >
                {COUNTRY_ISO[country] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external flag CDN
                  <img
                    src={`https://flagcdn.com/w80/${COUNTRY_ISO[country]}.png`}
                    alt={`${country} flag`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  "?"
                )}
              </span>
              <div>
                <div className="text-sm font-semibold" style={{ color: COLORS.navy }}>
                  {country}
                </div>
                <div className="text-xs" style={{ color: COLORS.slate }}>
                  {count}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
