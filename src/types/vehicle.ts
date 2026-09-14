/**
 * The customer-facing vehicle shape. `sourcePriceUsd` never appears here -
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
  // Which scraper this vehicle came from ("beforward" / "sbtjapan" /
  // "dubicars"), or null for a hand-entered listing. Public-facing use is
  // narrow (currently: sizing the watermark-hiding strip taller on SBT
  // Japan photos, whose watermark sits lower/larger than the others') -
  // not a general "source" badge shown to shoppers.
  sourceSite: string | null;
  sellingPriceUsd: number;
  // Insurance estimate for the freight+insurance line - computed server-side
  // from the real sourcePriceUsd before it's stripped, since it depends on
  // the hidden source price rather than anything public.
  insuranceUsd: number;
  // True when sellingPriceUsd already has freight baked in (SBT Japan's own
  // C&F-to-Mombasa "Total Price") - computeLandedCost must not add freight
  // again on top, or the total double-counts shipping.
  freightIncluded: boolean;
  imageUrl: string | null;
  // Up to 5 gallery photos; imageUrls[0] is always the same as imageUrl.
  // Empty when the vehicle only has a single cover photo.
  imageUrls: string[];
  // True when a real multi-photo gallery was fetched for this vehicle
  // (rather than just a single listing thumbnail) - lets image-heavy
  // sections (promo carousel, featured grid) prefer the sharpest photos.
  hqImage: boolean;
  // True when imageUrl/imageUrls were borrowed from another in-stock unit of
  // the same make+model (this exact unit has no photo of its own yet) - the
  // UI must label this clearly rather than presenting it as this car's photo.
  isRepresentativePhoto: boolean;
  condition: string;
  badge: string | null;
  lifestyle: string[];
  eligible: boolean;
  ineligibleReason: string | null;
  // Extended spec sheet - populated for BE FORWARD listings scraped after
  // this field set was added; older rows and other sources leave these null.
  refNo: string | null;
  chassisNo: string | null;
  modelCode: string | null;
  engineCode: string | null;
  steering: string | null;
  location: string | null;
  versionClass: string | null;
  doors: number | null;
  dimensions: string | null;
  weightKg: number | null;
  registrationYearMonth: string | null;
  manufactureYearMonth: string | null;
  features: string[];
};
