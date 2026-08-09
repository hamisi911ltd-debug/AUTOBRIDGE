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
  // True when the source CDN reliably serves large (1200px+) photos rather
  // than a capped thumbnail — lets image-heavy sections (promo carousel,
  // featured grid) prefer the sharpest photos without exposing which site
  // a listing came from.
  hqImage: boolean;
  condition: string;
  badge: string | null;
  lifestyle: string[];
  eligible: boolean;
  ineligibleReason: string | null;
};
