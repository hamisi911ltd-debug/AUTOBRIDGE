export const FREIGHT_USD: Record<string, number> = {
  Japan: 900,
  UAE: 750,
  UK: 1300,
  USA: 1600,
  "South Korea": 950,
};

export type LandedCostInput = {
  sourceCountry: string;
  // Retail price the customer pays AutoBridge for the car itself (source
  // cost + margin) — shown as its own line and added once to the total.
  sellingPriceUsd: number;
  // Insurance estimate, computed server-side from the real source price
  // (see getPublicVehicles.ts) — shown as its own line alongside freight.
  insuranceUsd: number;
  // True when sellingPriceUsd already has freight baked in (SBT Japan's own
  // C&F-to-Mombasa "Total Price") — freight is left off the total for these,
  // since it's already inside the price passed in.
  freightIncluded: boolean;
};

export type LandedCost = {
  freight: number;
  insurance: number;
  total: number;
};

/**
 * All-in price estimate: vehicle price (source cost + AutoBridge's margin)
 * plus freight and insurance to Mombasa. Deliberately does NOT estimate KRA
 * import duty/excise/VAT/IDF/RDL — that breakdown was removed at the user's
 * explicit request after repeated rounds of disputed rates, plus a gap that
 * was never fully resolved: KRA actually values used vehicles off its CRSP
 * (Current Retail Selling Price) schedule with age-based depreciation, not
 * the invoice price, and that schedule isn't public data this app could
 * replicate — so any duty figure shown here risked reading as authoritative
 * when it wasn't. A buyer confirms actual duty with a licensed clearing
 * agent instead.
 *
 * Freight: BE FORWARD only ever publishes a bare FOB price (confirmed via
 * their own price-filter URL params, which are literally named
 * `fob_price_from`/`fob_price_to`), so freight is always added on top for
 * that source. SBT Japan is different — most of their listings also show a
 * "Total Price", which is their own C&F (Cost & Freight) figure already
 * quoted to Mombasa specifically (their default destination port). The
 * scraper captures that Total Price as sourcePriceUsd whenever it's present
 * and sets freightIncluded, so freight must NOT be added again here for
 * those vehicles — doing so would double-count shipping that's already
 * inside the price.
 */
export function computeLandedCost(v: LandedCostInput, fx: number): LandedCost {
  const freight = v.freightIncluded ? 0 : FREIGHT_USD[v.sourceCountry] || 1000;
  const insurance = v.insuranceUsd;
  const total = v.sellingPriceUsd * fx + freight * fx + insurance * fx;
  return { freight, insurance, total };
}
