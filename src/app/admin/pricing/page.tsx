import { prisma } from "@/lib/prisma";
import { PricingRulesManager } from "@/app/admin/pricing/PricingRulesManager";

export default async function AdminPricingPage() {
  const [rules, vehicles] = await Promise.all([
    prisma.pricingRule.findMany({ orderBy: [{ priority: "desc" }, { createdAt: "asc" }] }),
    // Just enough for a representative preview picker, not the full 27k+
    // table — that was fetched (and rendered as a 27,000-option <select>)
    // on every single visit to this page, the main reason it was slow.
    prisma.vehicle.findMany({
      select: { id: true, make: true, model: true, bodyType: true, sourceCountry: true, sourcePriceUsd: true, year: true },
      orderBy: { createdAt: "desc" },
      take: 300,
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
