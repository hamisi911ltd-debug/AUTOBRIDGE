"use client";

import type { Filters } from "@/lib/constants";
import type { PublicVehicle } from "@/types/vehicle";
import { PromoShowcase } from "@/components/home/PromoShowcase";
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
  const featured = vehicles.filter((v) => v.eligible && v.badge).slice(0, 4);
  const latest = vehicles.filter((v) => v.eligible).slice(0, 8);

  return (
    <div>
      <PromoShowcase vehicles={vehicles} goDetail={goDetail} />
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
