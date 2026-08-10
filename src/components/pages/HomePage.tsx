"use client";

import type { Filters } from "@/lib/constants";
import type { PublicVehicle } from "@/types/vehicle";
import { PromoShowcase } from "@/components/home/PromoShowcase";
import { StatsBar } from "@/components/home/StatsBar";
import { BrowseGrids } from "@/components/home/BrowseGrids";
import { BudgetLifestyleSection } from "@/components/home/BudgetLifestyleSection";
import { IncomeEstimator } from "@/components/home/IncomeEstimator";
import { HowItWorks } from "@/components/home/HowItWorks";
import { WhyUs } from "@/components/home/WhyUs";
import { FAQSection } from "@/components/home/FAQSection";
import { VehicleGridSection } from "@/components/vehicles/VehicleGridSection";

export function HomePage({
  vehicles,
  favorites,
  toggleFavorite,
  compareList,
  toggleCompare,
  goDetail,
  goSearch,
}: {
  vehicles: PublicVehicle[];
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  compareList: string[];
  toggleCompare: (id: string) => void;
  goDetail: (id: string) => void;
  goSearch: (patch: Partial<Filters>) => void;
}) {
  // "Featured" needs a real, sharp photo to actually feature — a badge alone
  // isn't enough (hand-entered listings carry badges but no photo), so this
  // ranks by photo quality first and price second rather than filtering on
  // `badge`, which used to let unphotographed vehicles through.
  const featured = vehicles
    .filter((v) => v.eligible && v.imageUrl)
    .sort((a, b) => Number(b.hqImage) - Number(a.hqImage) || b.sellingPriceUsd - a.sellingPriceUsd)
    .slice(0, 4);
  const latest = vehicles.filter((v) => v.eligible && v.imageUrl).slice(0, 8);

  return (
    <div>
      <PromoShowcase vehicles={vehicles} goDetail={goDetail} />
      <StatsBar vehicles={vehicles} />
      <BrowseGrids vehicles={vehicles} goSearch={goSearch} />
      <BudgetLifestyleSection goSearch={goSearch} />
      <IncomeEstimator goSearch={goSearch} />
      <VehicleGridSection
        title="Featured this week"
        subtitle="Hand-picked listings with strong value after duty and shipping."
        vehicles={featured}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        compareList={compareList}
        toggleCompare={toggleCompare}
        goDetail={goDetail}
      />
      <HowItWorks />
      <VehicleGridSection
        title="Latest arrivals"
        vehicles={latest}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        compareList={compareList}
        toggleCompare={toggleCompare}
        goDetail={goDetail}
      />
      <WhyUs />
      <FAQSection />
    </div>
  );
}
