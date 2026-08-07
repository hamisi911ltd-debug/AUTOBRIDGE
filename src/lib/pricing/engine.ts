import type { PricingRule } from "@/generated/prisma/client";

export type VehicleForPricing = {
  make: string;
  model: string;
  bodyType: string;
  sourceCountry: string;
  sourcePriceUsd: number;
};

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
    case "PRICE_BAND":
      return (
        (rule.priceMinUsd ?? 0) <= vehicle.sourcePriceUsd &&
        (rule.priceMaxUsd ?? Infinity) > vehicle.sourcePriceUsd
      );
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

function marginForRule(rule: PricingRule, sourcePriceUsd: number): number {
  if (rule.markupType === "FIXED") {
    return clampMargin(rule, rule.value ?? 0);
  }
  if (rule.markupType === "PERCENT") {
    return clampMargin(rule, sourcePriceUsd * (rule.value ?? 0));
  }
  // TIERED
  const tiers: Tier[] = rule.tiers ? JSON.parse(rule.tiers) : [];
  const band = tiers.find(
    (t) => sourcePriceUsd >= t.min && (t.max == null || sourcePriceUsd < t.max)
  );
  if (!band) return 0;
  return clampMargin(rule, sourcePriceUsd * band.percent);
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
  const margin = Math.round(marginForRule(rule, vehicle.sourcePriceUsd));

  return {
    sellingPriceUsd: Math.round(vehicle.sourcePriceUsd) + margin,
    marginUsd: margin,
    appliedRule: { id: rule.id, name: rule.name, scopeType: rule.scopeType },
  };
}
