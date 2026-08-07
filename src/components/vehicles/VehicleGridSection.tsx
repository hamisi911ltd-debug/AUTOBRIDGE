"use client";

import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import type { PublicVehicle } from "@/types/vehicle";
import { VehicleCard } from "@/components/vehicles/VehicleCard";

export function VehicleGridSection({
  title,
  subtitle,
  vehicles,
  favorites,
  toggleFavorite,
  compareList,
  toggleCompare,
  goDetail,
}: {
  title: string;
  subtitle?: string;
  vehicles: PublicVehicle[];
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  compareList: string[];
  toggleCompare: (id: string) => void;
  goDetail: (id: string) => void;
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
      <div className="mb-6">
        <h2 className="text-xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm mt-1" style={{ color: COLORS.slate }}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {vehicles.map((v) => (
          <VehicleCard
            key={v.id}
            vehicle={v}
            isFavorite={favorites.has(v.id)}
            onFavorite={() => toggleFavorite(v.id)}
            inCompare={compareList.includes(v.id)}
            onCompare={() => toggleCompare(v.id)}
            onView={() => goDetail(v.id)}
          />
        ))}
      </div>
    </section>
  );
}
