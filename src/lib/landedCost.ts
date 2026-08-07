export const FREIGHT_USD: Record<string, number> = {
  Japan: 900,
  UAE: 750,
  UK: 1300,
  USA: 1600,
  "South Korea": 950,
};

export type LandedCostInput = {
  sourceCountry: string;
  fuel: string;
  engineCc: number;
  sellingPriceUsd: number;
};

export type LandedCost = {
  freight: number;
  insurance: number;
  cifUsd: number;
  cifKes: number;
  importDuty: number;
  excise: number;
  exciseRate: number;
  vat: number;
  idf: number;
  rdl: number;
  portClearing: number;
  registration: number;
  total: number;
};

function exciseRateFor(v: Pick<LandedCostInput, "fuel" | "engineCc">): number {
  if (v.fuel === "Electric") return 0.1;
  if (v.fuel === "Hybrid") return 0.2;
  if (v.engineCc <= 1500) return 0.2;
  if (v.engineCc <= 3000) return 0.25;
  return 0.35;
}

/**
 * Kenya landed-cost estimate (freight, duty, excise, VAT, IDF, RDL, port &
 * registration) computed off the customer-facing selling price — the
 * AutoBridge margin is folded into that price upstream (Model 1: Reseller),
 * so there is no separate service-fee line here.
 */
export function computeLandedCost(v: LandedCostInput, fx: number): LandedCost {
  const freight = FREIGHT_USD[v.sourceCountry] || 1000;
  const insurance = Math.round(v.sellingPriceUsd * 0.01);
  const cifUsd = v.sellingPriceUsd + freight + insurance;
  const cifKes = cifUsd * fx;
  const importDuty = 0.25 * cifKes;
  const exciseRate = exciseRateFor(v);
  const excise = exciseRate * (cifKes + importDuty);
  const vat = 0.16 * (cifKes + importDuty + excise);
  const idf = Math.max(0.0225 * cifKes, 5000);
  const rdl = 0.02 * cifKes;
  const portClearing = 150000;
  const registration = 10000;
  const total = cifKes + importDuty + excise + vat + idf + rdl + portClearing + registration;
  return { freight, insurance, cifUsd, cifKes, importDuty, excise, exciseRate, vat, idf, rdl, portClearing, registration, total };
}
