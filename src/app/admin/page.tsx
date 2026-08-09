import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { RunScrapeButton } from "@/app/admin/RunScrapeButton";
import { BarChart, ChartLegend, CHART_COLORS } from "@/components/admin/charts/BarChart";
import { AreaChart } from "@/components/admin/charts/AreaChart";
import { computeSellingPriceUsd } from "@/lib/pricing/engine";
import { formatUsd } from "@/lib/format";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border p-5" style={{ borderColor: COLORS.line }}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.slate }}>
        {label}
      </div>
      <div className="text-2xl font-bold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: COLORS.slate }}>
          {sub}
        </div>
      )}
    </div>
  );
}

const PRICE_BANDS = [
  { label: "Under $10k", min: 0, max: 10_000 },
  { label: "$10k–20k", min: 10_000, max: 20_000 },
  { label: "$20k–40k", min: 20_000, max: 40_000 },
  { label: "$40k–70k", min: 40_000, max: 70_000 },
  { label: "Above $70k", min: 70_000, max: Infinity },
];

export default async function AdminDashboardPage() {
  const [
    totalVehicles,
    eligibleVehicles,
    manualVehicles,
    beforwardCount,
    sbtCount,
    totalEnquiries,
    unhandledEnquiries,
    activeRules,
    adminCount,
    lastScraped,
    recentEnquiries,
    byMakeRaw,
    byBodyTypeRaw,
    enquiriesLast14d,
    priceRows,
    rules,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { eligible: true } }),
    prisma.vehicle.count({ where: { sourceSite: null } }),
    prisma.vehicle.count({ where: { sourceSite: "beforward" } }),
    prisma.vehicle.count({ where: { sourceSite: "sbtjapan" } }),
    prisma.enquiry.count(),
    prisma.enquiry.count({ where: { handled: false } }),
    prisma.pricingRule.count({ where: { active: true } }),
    prisma.user.count(),
    prisma.vehicle.findFirst({ where: { lastScrapedAt: { not: null } }, orderBy: { lastScrapedAt: "desc" }, select: { lastScrapedAt: true } }),
    prisma.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { vehicle: true } }),
    prisma.vehicle.groupBy({ by: ["make"], _count: { _all: true }, orderBy: { _count: { make: "desc" } }, take: 8 }),
    prisma.vehicle.groupBy({ by: ["bodyType"], _count: { _all: true }, orderBy: { _count: { bodyType: "desc" } } }),
    prisma.enquiry.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) } },
      select: { createdAt: true },
    }),
    prisma.vehicle.findMany({ where: { eligible: true }, select: { sourceCountry: true, sourcePriceUsd: true, make: true, model: true, bodyType: true } }),
    prisma.pricingRule.findMany({ where: { active: true } }),
  ]);

  const bySourceSite = [
    { label: "BE FORWARD", value: beforwardCount, color: CHART_COLORS.blue },
    { label: "SBT Japan", value: sbtCount, color: CHART_COLORS.orange },
    { label: "Hand-entered", value: manualVehicles, color: CHART_COLORS.aqua },
  ].filter((s) => s.value > 0);

  const byMake = byMakeRaw.map((r) => ({ label: r.make, value: r._count._all }));
  const byBodyType = byBodyTypeRaw.map((r) => ({ label: r.bodyType, value: r._count._all }));

  // Bucket enquiries into the last 14 calendar days, zero-filled so a quiet
  // day still shows as a point on the line instead of a gap.
  const dayBuckets = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayBuckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const e of enquiriesLast14d) {
    const key = e.createdAt.toISOString().slice(0, 10);
    if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }
  const enquiriesByDay = [...dayBuckets.entries()].map(([date, value]) => ({
    label: new Date(date).toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
    value,
  }));

  const priceDistribution = PRICE_BANDS.map((band) => ({
    label: band.label,
    value: priceRows.filter((v) => {
      const { sellingPriceUsd } = computeSellingPriceUsd(v, rules);
      return sellingPriceUsd >= band.min && sellingPriceUsd < band.max;
    }).length,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Dashboard
        </h1>
        <RunScrapeButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total vehicles" value={totalVehicles} sub={`${eligibleVehicles} eligible`} />
        <StatCard label="From BE FORWARD" value={beforwardCount} />
        <StatCard label="From SBT Japan" value={sbtCount} />
        <StatCard label="Hand-entered" value={manualVehicles} />
        <StatCard label="Enquiries" value={totalEnquiries} sub={unhandledEnquiries > 0 ? `${unhandledEnquiries} unhandled` : "all handled"} />
        <StatCard label="Active pricing rules" value={activeRules} />
        <StatCard label="Admin users" value={adminCount} />
        <StatCard
          label="Last scrape"
          value={lastScraped?.lastScrapedAt ? lastScraped.lastScrapedAt.toLocaleDateString() : "Never"}
          sub={lastScraped?.lastScrapedAt ? lastScraped.lastScrapedAt.toLocaleTimeString() : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 mb-6">
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: COLORS.line }}>
          <h2 className="font-semibold mb-1" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Enquiries, last 14 days
          </h2>
          <AreaChart data={enquiriesByDay} unitSingular="enquiry" unitPlural="enquiries" />
        </div>
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: COLORS.line }}>
          <h2 className="font-semibold mb-3" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Inventory by source
          </h2>
          <ChartLegend items={bySourceSite.map((s) => ({ label: s.label, color: s.color }))} />
          <div className="space-y-2.5">
            {bySourceSite.map((s) => (
              <BarChart key={s.label} data={[{ label: s.label, value: s.value }]} color={s.color} height={20} gap={0} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: COLORS.line }}>
          <h2 className="font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Top makes
          </h2>
          <BarChart data={byMake} />
        </div>
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: COLORS.line }}>
          <h2 className="font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            By body type
          </h2>
          <BarChart data={byBodyType} color={CHART_COLORS.aqua} />
        </div>
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: COLORS.line }}>
          <h2 className="font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Selling price spread
          </h2>
          <BarChart data={priceDistribution} color={CHART_COLORS.violet} formatValue={(v) => v.toLocaleString()} />
          <p className="text-[11px] mt-3" style={{ color: COLORS.slate }}>
            Eligible vehicles only, {formatUsd(0)}–{formatUsd(70000)}+ bands.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: COLORS.line }}>
          <h2 className="font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Recent enquiries
          </h2>
          {recentEnquiries.length === 0 ? (
            <p className="text-sm" style={{ color: COLORS.slate }}>
              No enquiries yet.
            </p>
          ) : (
            <div className="space-y-3">
              {recentEnquiries.map((e) => (
                <div key={e.id} className="text-sm border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: COLORS.line }}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: COLORS.navy }}>
                      {e.name}
                    </span>
                    {!e.handled && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FEF3C7", color: "#92400E" }}>
                        New
                      </span>
                    )}
                  </div>
                  <div style={{ color: COLORS.slate }}>
                    {e.vehicle.year} {e.vehicle.make} {e.vehicle.model} · {e.phone}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/admin/enquiries" className="text-xs font-semibold mt-4 inline-block" style={{ color: COLORS.burgundy }}>
            View all enquiries →
          </Link>
        </div>

        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: COLORS.line }}>
          <h2 className="font-semibold mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Quick links
          </h2>
          <div className="space-y-2 text-sm">
            <Link href="/admin/vehicles" className="block hover:underline" style={{ color: COLORS.navy }}>
              Manage vehicles →
            </Link>
            <Link href="/admin/pricing" className="block hover:underline" style={{ color: COLORS.navy }}>
              Manage pricing rules →
            </Link>
            <Link href="/admin/enquiries" className="block hover:underline" style={{ color: COLORS.navy }}>
              Manage enquiries →
            </Link>
            <Link href="/admin/vehicles/new" className="block hover:underline" style={{ color: COLORS.navy }}>
              Add a vehicle by hand →
            </Link>
            <Link href="/admin/users" className="block hover:underline" style={{ color: COLORS.navy }}>
              Manage users →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
