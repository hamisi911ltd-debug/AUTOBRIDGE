"use client";

import type { Filters } from "@/lib/constants";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";
import type { PublicReview } from "@/types/review";
import { OffersSlider } from "@/components/home/OffersSlider";
import { CatalogueSection } from "@/components/home/CatalogueSection";
import { BestSellersByCategory } from "@/components/home/BestSellersByCategory";
import { SmallAdvertsSlider } from "@/components/home/SmallAdvertsSlider";
import { CustomerReviews } from "@/components/home/CustomerReviews";
import { VehicleGridSection } from "@/components/vehicles/VehicleGridSection";

export function HomePage({
  vehicles,
  landedMap,
  filters,
  favorites,
  goDetail,
  goSearch,
  reviews,
}: {
  vehicles: PublicVehicle[];
  landedMap: Record<string, LandedCost>;
  filters: Filters;
  favorites: Set<string>;
  goDetail: (id: string) => void;
  goSearch: (patch: Partial<Filters>) => void;
  reviews: PublicReview[];
}) {
  // "Featured" needs a real, sharp photo to actually feature — a badge alone
  // isn't enough (hand-entered listings carry badges but no photo), so this
  // ranks by photo quality first and price second rather than filtering on
  // `badge`, which used to let unphotographed vehicles through.
  const featured = vehicles
    .filter((v) => v.eligible && v.imageUrl)
    .sort((a, b) => Number(b.hqImage) - Number(a.hqImage) || b.sellingPriceUsd - a.sellingPriceUsd)
    .slice(0, 48); // multiple of 3/4/6 — the carousel scales up to 6-across, so a clean multiple avoids a dangling gap in the last page

  return (
    <div>
      <OffersSlider vehicles={vehicles} goDetail={goDetail} />
      <CatalogueSection vehicles={vehicles} landedMap={landedMap} filters={filters} favorites={favorites} goDetail={goDetail} />
      <BestSellersByCategory vehicles={vehicles} goDetail={goDetail} />
      <VehicleGridSection
        title="Featured this week"
        subtitle="Hand-picked listings with strong value after duty and shipping."
        vehicles={featured}
        goDetail={goDetail}
        onViewAll={() => goSearch({})}
      />
      <CustomerReviews reviews={reviews} />
      <SmallAdvertsSlider />
    </div>
  );
}
