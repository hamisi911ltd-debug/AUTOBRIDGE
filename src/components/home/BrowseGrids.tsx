"use client";

import { useMemo } from "react";
import { COLORS, FONT_DISPLAY, type Filters } from "@/lib/constants";
import { VehicleImage } from "@/components/vehicles/VehicleImage";
import type { PublicVehicle } from "@/types/vehicle";

// Real manufacturer badges sourced from Wikimedia Commons (the actual
// official logo artwork, not a simplified single-colour glyph) for every
// make that currently appears in inventory; Simple Icons CDN fills in the
// long tail of makes that don't. Unmapped makes fall back to an
// initial-letter badge below.
const MAKE_LOGO: Record<string, string> = {
  Toyota: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Toyota_logo_%28Red%29.svg/330px-Toyota_logo_%28Red%29.svg.png",
  Honda: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Honda_Logo.svg/330px-Honda_Logo.svg.png",
  Nissan: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Nissan_2020_logo.svg/330px-Nissan_2020_logo.svg.png",
  Mazda: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Mazda_logo_with_emblem%2C_new.svg/330px-Mazda_logo_with_emblem%2C_new.svg.png",
  Subaru: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Subaru_logo.svg/330px-Subaru_logo.svg.png",
  BMW: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/330px-BMW.svg.png",
  Kia: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/KIA_logo3.svg/330px-KIA_logo3.svg.png",
  Suzuki: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Suzuki_Motor_Corporation_logo.svg/330px-Suzuki_Motor_Corporation_logo.svg.png",
  "Mercedes-Benz": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Mercedes-Benz_Logo_2010.svg/250px-Mercedes-Benz_Logo_2010.svg.png",
  Mitsubishi: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Mitsubishi_logo.svg/330px-Mitsubishi_logo.svg.png",
  Isuzu: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Isuzu.svg/330px-Isuzu.svg.png",
  Daihatsu: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Daihatsu_Logo.svg/330px-Daihatsu_Logo.svg.png",
  Hino: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Hino_Motors_logo.svg/330px-Hino_Motors_logo.svg.png",
  Lexus: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Lexus.svg/330px-Lexus.svg.png",
  "Land Rover": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Land_Rover_2023.svg/330px-Land_Rover_2023.svg.png",
  Jaguar: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Jaguar_1966_logo.svg/330px-Jaguar_1966_logo.svg.png",
  Ford: "https://cdn.simpleicons.org/ford",
  Volkswagen: "https://cdn.simpleicons.org/volkswagen",
  Audi: "https://cdn.simpleicons.org/audi",
  Peugeot: "https://cdn.simpleicons.org/peugeot",
  Jeep: "https://cdn.simpleicons.org/jeep",
  Hyundai: "https://cdn.simpleicons.org/hyundai",
  Chevrolet: "https://cdn.simpleicons.org/chevrolet",
  Volvo: "https://cdn.simpleicons.org/volvo",
};

// Real flag images (flagcdn.com) instead of emoji — flag emoji glyphs
// silently fall back to plain two-letter text on systems without a
// colour-emoji font (common on Windows Server / some browsers), so an actual
// image renders consistently everywhere instead of leaving it to chance.
const COUNTRY_ISO: Record<string, string> = {
  Japan: "jp",
  UAE: "ae",
  UK: "gb",
  USA: "us",
  "South Korea": "kr",
};

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
  const byBodyType = useMemo(() => countBy(eligible, (v) => v.bodyType), [eligible]);
  const byCountry = useMemo(() => countBy(eligible, (v) => v.sourceCountry), [eligible]);

  // One clean, sharp photo to represent each body type tile — real inventory,
  // not a generic icon. Prefers a high-quality photo per category, falling
  // back to any photo if that body type has none.
  const bodyTypeImage = useMemo(() => {
    const withPhotos = eligible.filter((v) => v.imageUrl);
    const map: Record<string, string> = {};
    for (const v of withPhotos) {
      if (!map[v.bodyType] || (v.hqImage && v.imageUrl)) map[v.bodyType] = v.imageUrl!;
    }
    return map;
  }, [eligible]);

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
          Browse by body type
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {byBodyType.map(([bodyType, count]) => (
            <button
              key={bodyType}
              onClick={() => goSearch({ bodyTypes: [bodyType] })}
              className="rounded-xl border overflow-hidden text-left hover:shadow-md transition"
              style={{ borderColor: COLORS.line }}
            >
              <div className="relative h-20 overflow-hidden" style={{ background: COLORS.navy }}>
                <VehicleImage src={bodyTypeImage[bodyType] ?? null} alt={`${bodyType} example`} iconSize={22} />
              </div>
              <div className="px-3 py-2">
                <div className="text-xs font-medium" style={{ color: COLORS.navy }}>
                  {bodyType}
                </div>
                <div className="text-[11px]" style={{ color: COLORS.slate }}>
                  {count}
                </div>
              </div>
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
