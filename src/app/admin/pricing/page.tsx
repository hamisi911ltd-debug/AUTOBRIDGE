import { prisma } from "@/lib/prisma";
import { PricingRulesManager } from "@/app/admin/pricing/PricingRulesManager";

export default async function AdminPricingPage() {
  const [rules, vehicles] = await Promise.all([
    prisma.pricingRule.findMany({ orderBy: [{ priority: "desc" }, { createdAt: "asc" }] }),
    prisma.vehicle.findMany({
      select: { id: true, make: true, model: true, bodyType: true, sourceCountry: true, sourcePriceUsd: true, year: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const serializedRules = rules.map((r) => ({
    id: r.id,
    name: r.name,
    scopeType: r.scopeType,
    scopeValue: r.scopeValue,
    markupType: r.markupType,
    value: r.value,
    tiers: r.tiers,
    priceMinUsd: r.priceMinUsd,
    priceMaxUsd: r.priceMaxUsd,
    minProfitUsd: r.minProfitUsd,
    maxProfitUsd: r.maxProfitUsd,
    priority: r.priority,
    active: r.active,
  }));

  return <PricingRulesManager initialRules={serializedRules} vehicles={vehicles} />;
}
