export type ScrapedVehicle = {
  sourceSite: "beforward" | "sbtjapan" | "dubicars" | "autocom" | "jpctrade";
  externalId: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  mileageKm: number;
  fuel: string;
  transmission: string;
  engineCc: number;
  bodyType: string;
  drive: string;
  seats: number;
  color: string;
  sourceCountry: string;
  sourcePriceUsd: number;
  // True when sourcePriceUsd is a freight-inclusive figure (SBT Japan's own
  // "Total Price" - their C&F to Mombasa) rather than the bare vehicle/FOB
  // price. Left undefined (treated as false) for sources that only ever
  // report a bare price, like BE FORWARD.
  freightIncluded?: boolean;
  imageUrl: string | null;
  // Set when fetchCoverImage successfully upgraded imageUrl to a real
  // detail-page photo, so upsertVehicle can skip re-measuring it. Left
  // undefined when the upgrade failed and imageUrl is still the (possibly
  // unreliable) listing-page thumbnail - that case still needs measuring.
  imageWidthPx?: number;
  sourceUrl: string;
  // Extended spec sheet from the source detail page (BE FORWARD's
  // table.specification / p.vehicle-option-list) - all optional since only
  // beforward.ts currently populates them, and only when the detail-page
  // fetch succeeds.
  refNo?: string;
  chassisNo?: string;
  modelCode?: string;
  engineCode?: string;
  steering?: string;
  location?: string;
  versionClass?: string;
  doors?: number;
  dimensions?: string;
  weightKg?: number;
  registrationYearMonth?: string;
  manufactureYearMonth?: string;
  features?: string[];
};
