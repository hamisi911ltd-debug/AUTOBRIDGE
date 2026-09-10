import type { PricingRule } from "@/generated/prisma/client";
import { computeFreightUsd, computeInsuranceUsd } from "@/lib/landedCost";

export type VehicleForPricing = {
  make: string;
  model: string;
  bodyType: string;
  sourceCountry: string;
  sourcePriceUsd: number;
  // Needed to work out the commission base below — see commissionBaseUsd.
  freightIncluded: boolean;
};

/**
 * The amount commission is actually calculated against: source price plus
 * freight and insurance to Mombasa, not the bare vehicle price alone. Buyers
 * requested this explicitly — a markup meant to reflect margin on the whole
 * landed deal should scale with the deal's real size (a car with expensive
 * shipping is a bigger transaction), not just the FOB price. This is also
 * what PRICE_BAND scope and TIERED markup bands are matched against, so a
 * near-threshold vehicle's shipping cost can tip it into the next band.
 */
export function commissionBaseUsd(vehicle: VehicleForPricing): number {
  const freight = computeFreightUsd(vehicle.sourceCountry, vehicle.freightIncluded);
  const insurance = computeInsuranceUsd(vehicle.sourcePriceUsd);
  return vehicle.sourcePriceUsd + freight + insurance;
}

export type Tier = { min: number; max: number | null; percent: number };

export type PriceResult = {
  sellingPriceUsd: number;
  marginUsd: number;
  appliedRule: { id: string; name: string; scopeType: PricingRule["scopeType"] } | null;
};

const SPECIFICITY: Record<PricingRule["scopeType"], number> = {
  MODEL: 6,
  MAKE: 5,
  BODY_TYPE: 4,
  COUNTRY: 3,
  EXPORTER: 2,
  PRICE_BAND: 1,
  GLOBAL: 0,
};

function ruleMatches(rule: PricingRule, vehicle: VehicleForPricing): boolean {
  switch (rule.scopeType) {
    case "MAKE":
      return rule.scopeValue === vehicle.make;
    case "MODEL":
      return rule.scopeValue === vehicle.model;
    case "BODY_TYPE":
      return rule.scopeValue === vehicle.bodyType;
    case "COUNTRY":
      return rule.scopeValue === vehicle.sourceCountry;
    case "EXPORTER":
      return false; // no exporter field on Vehicle yet
    case "PRICE_BAND": {
      const base = commissionBaseUsd(vehicle);
      return (rule.priceMinUsd ?? 0) <= base && (rule.priceMaxUsd ?? Infinity) > base;
    }
    case "GLOBAL":
      return true;
    default:
      return false;
  }
}

function clampMargin(rule: PricingRule, margin: number): number {
  let m = margin;
  if (rule.minProfitUsd != null) m = Math.max(m, rule.minProfitUsd);
  if (rule.maxProfitUsd != null) m = Math.min(m, rule.maxProfitUsd);
  return m;
}

function marginForRule(rule: PricingRule, commissionBase: number): number {
  if (rule.markupType === "FIXED") {
    return clampMargin(rule, rule.value ?? 0);
  }
  if (rule.markupType === "PERCENT") {
    return clampMargin(rule, commissionBase * (rule.value ?? 0));
  }
  // TIERED
  const tiers: Tier[] = rule.tiers ? JSON.parse(rule.tiers) : [];
  const band = tiers.find(
    (t) => commissionBase >= t.min && (t.max == null || commissionBase < t.max)
  );
  if (!band) return 0;
  return clampMargin(rule, commissionBase * band.percent);
}

/**
 * Resolves the single best-matching active rule for a vehicle (most specific
 * scope wins, then highest priority, then most recently updated) and applies
 * its markup to sourcePriceUsd. Pure function — no I/O — so callers fetch the
 * rule set once and reuse it across a whole vehicle list.
 */
export function computeSellingPriceUsd(
  vehicle: VehicleForPricing,
  rules: PricingRule[]
): PriceResult {
  const candidates = rules.filter((r) => r.active && ruleMatches(r, vehicle));

  if (candidates.length === 0) {
    return { sellingPriceUsd: Math.round(vehicle.sourcePriceUsd), marginUsd: 0, appliedRule: null };
  }

  candidates.sort((a, b) => {
    const specDiff = SPECIFICITY[b.scopeType] - SPECIFICITY[a.scopeType];
    if (specDiff !== 0) return specDiff;
    const priorityDiff = b.priority - a.priority;
    if (priorityDiff !== 0) return priorityDiff;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const rule = candidates[0];
  const margin = Math.round(marginForRule(rule, commissionBaseUsd(vehicle)));

  return {
    sellingPriceUsd: Math.round(vehicle.sourcePriceUsd) + margin,
    marginUsd: margin,
    appliedRule: { id: rule.id, name: rule.name, scopeType: rule.scopeType },
  };
}
