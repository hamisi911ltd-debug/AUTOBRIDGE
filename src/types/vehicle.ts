/**
 * The customer-facing vehicle shape. `sourcePriceUsd` never appears here —
 * only `sellingPriceUsd` (source cost + pricing-engine markup) is sent to
 * any non-admin page, per the Model 1 reseller pricing decision.
 */
export type PublicVehicle = {
  id: string;
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
  sellingPriceUsd: number;
  imageUrl: string | null;
  // Up to 5 gallery photos; imageUrls[0] is always the same as imageUrl.
  // Empty when the vehicle only has a single cover photo.
  imageUrls: string[];
  // True when a real multi-photo gallery was fetched for this vehicle
  // (rather than just a single listing thumbnail) — lets image-heavy
  // sections (promo carousel, featured grid) prefer the sharpest photos.
  hqImage: boolean;
  condition: string;
  badge: string | null;
  lifestyle: string[];
  eligible: boolean;
  ineligibleReason: string | null;
};
