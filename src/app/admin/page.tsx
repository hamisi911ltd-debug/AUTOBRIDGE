import Link from "next/link";
import { Car, Tag, MessageSquare, PlusCircle, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { RunScrapeButton } from "@/app/admin/RunScrapeButton";
import { BarChart } from "@/components/admin/charts/BarChart";
import { DonutChart } from "@/components/admin/charts/DonutChart";
import { formatUsd } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// The dashboard's own three brand hues, reused as the chart palette here
// per direct request, in place of the general-purpose validated chart
// palette used elsewhere (this page is internal-only, not the public site).
const BRAND_ORANGE = "#F2762E";
const BRAND_MAGENTA = "#D6336C";
const BRAND_VIOLET = "#3B1F63";

function StatCard({ label, value, sub, delay = 0 }: { label: string; value: string | number; sub?: string; delay?: number }) {
  return (
    <div
      className="bg-white rounded-2xl border p-2.5 sm:p-5 transition-shadow hover:shadow-md"
      style={{ borderColor: COLORS.line, animation: `dashFadeUp 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}s both` }}
    >
      <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-0.5 sm:mb-1 truncate" style={{ color: COLORS.slate }}>
        {label}
      </div>
      <div className="text-base sm:text-2xl font-bold truncate" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate" style={{ color: COLORS.slate }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/** Shared entrance animation for dashboard cards: subtle fade + rise, staggered by the caller via `delay`. */
function DashboardAnimations() {
  return <style>{`@keyframes dashFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>;
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
    lastScraped,
    byMakeRaw,
    eligibleRows,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { eligible: true } }),
    prisma.vehicle.count({ where: { sourceSite: null } }),
    prisma.vehicle.count({ where: { sourceSite: "beforward" } }),
    prisma.vehicle.count({ where: { sourceSite: "sbtjapan" } }),
    prisma.vehicle.findFirst({ where: { lastScrapedAt: { not: null } }, orderBy: { lastScrapedAt: "desc" }, select: { lastScrapedAt: true } }),
    prisma.vehicle.groupBy({ by: ["make"], _count: { _all: true }, orderBy: { _count: { make: "desc" } }, take: 8 }),
    // Minimal columns only, no full-row fetch, no per-vehicle pricing
    // computation. This one lightweight query drives both the price-band
    // chart and the publicly-visible dedup count below, replacing what used
    // to be a call into the full getPublicVehicles() pipeline (which
    // fetched every column and priced every row just to get a count, the
    // main reason this page was slow to open).
    prisma.vehicle.findMany({
      where: { eligible: true },
      select: { sourceCountry: true, sourcePriceUsd: true, make: true, model: true, bodyType: true, year: true, trim: true, mileageKm: true },
    }),
  ]);
  const priceRows = eligibleRows;

  const bySourceSite = [
    { label: "BE FORWARD", value: beforwardCount, color: BRAND_ORANGE },
    { label: "SBT Japan", value: sbtCount, color: BRAND_MAGENTA },
    { label: "Hand-entered", value: manualVehicles, color: BRAND_VIOLET },
  ].filter((s) => s.value > 0);

  // Same identical-stock-unit dedup key the public site uses (see
  // getPublicVehicles.ts), computed here from the lightweight column
  // selection above rather than re-deriving it via a second heavy query.
  const publicDedupKeys = new Set(eligibleRows.map((v) => [v.make, v.model, v.year, v.trim, v.mileageKm, v.sourcePriceUsd].join("|")));
  const publicByMake = new Map<string, Set<string>>();
  for (const v of eligibleRows) {
    const key = [v.make, v.model, v.year, v.trim, v.mileageKm, v.sourcePriceUsd].join("|");
    const set = publicByMake.get(v.make) ?? new Set<string>();
    set.add(key);
    publicByMake.set(v.make, set);
  }
  const publicVisibleCount = publicDedupKeys.size;
  const makeComparison = byMakeRaw.map((r) => ({
    make: r.make,
    scraped: r._count._all,
    visible: publicByMake.get(r.make)?.size ?? 0,
  }));

  // Bucketed on the raw source price, not the pricing-engine's marked-up
  // sellingPriceUsd, running the full tiered-rule resolution against every
  // eligible row (tens of thousands on this table) was the main reason this
  // dashboard was slow to open. Source price bands still land in the same
  // bracket almost always (margin is a modest percentage on top), and this
  // chart is a rough distribution view, not a precise pricing tool.
  const priceDistribution = PRICE_BANDS.map((band) => ({
    label: band.label,
    value: priceRows.filter((v) => v.sourcePriceUsd >= band.min && v.sourcePriceUsd < band.max).length,
  }));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2.5 sm:mb-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Dashboard
          </h1>
          <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: COLORS.slate }}>
            Last scrape: {lastScraped?.lastScrapedAt ? `${lastScraped.lastScrapedAt.toLocaleDateString()}, ${lastScraped.lastScrapedAt.toLocaleTimeString()}` : "never"}
          </p>
        </div>
        <RunScrapeButton />
      </div>

      <DashboardAnimations />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-2 sm:mb-4">
        <StatCard label="Total scraped" value={totalVehicles.toLocaleString()} sub={`${eligibleVehicles.toLocaleString()} within import age`} delay={0} />
        <StatCard label="Publicly visible" value={publicVisibleCount.toLocaleString()} sub="live on the site now" delay={0.04} />
        <StatCard label="From BE FORWARD" value={beforwardCount.toLocaleString()} delay={0.08} />
        <StatCard label="From SBT Japan" value={sbtCount.toLocaleString()} delay={0.12} />
      </div>

      <div className="hidden md:grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-3 sm:mb-6">
        {[
          { href: "/admin/vehicles", label: "Manage vehicles", icon: Car },
          { href: "/admin/pricing", label: "Pricing rules", icon: Tag },
          { href: "/admin/enquiries", label: "Enquiries", icon: MessageSquare },
          { href: "/admin/vehicles/new", label: "Add a vehicle", icon: PlusCircle },
          { href: "/admin/users", label: "Manage users", icon: Users },
        ].map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-2 rounded-xl border bg-white p-2 sm:p-3 transition-colors hover:border-transparent"
              style={{ borderColor: COLORS.line }}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: COLORS.card }}>
                <Icon size={14} color={COLORS.burgundy} />
              </div>
              <span className="text-[11px] sm:text-sm font-medium truncate" style={{ color: COLORS.navy }}>
                {l.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-3 sm:gap-6 mb-3 sm:mb-6">
        <div className="bg-white rounded-2xl border p-3 sm:p-5 flex flex-col justify-center" style={{ borderColor: COLORS.line, animation: "dashFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.36s both" }}>
          <h2 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Inventory by source
          </h2>
          <DonutChart data={bySourceSite} centerLabel="Vehicles" />
        </div>
        <div className="bg-white rounded-2xl border p-3 sm:p-5" style={{ borderColor: COLORS.line, animation: "dashFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.4s both" }}>
          <h2 className="text-sm sm:text-base font-semibold mb-1" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Top makes: scraped vs. publicly visible
          </h2>
          <p className="text-[11px] sm:text-xs mb-3 sm:mb-4" style={{ color: COLORS.slate }}>
            Solid bar is publicly visible, pale track is total scraped. The gap is what dedup/eligibility filtered out.
          </p>
          <BarChart
            data={makeComparison.map((m) => ({ label: m.make, value: m.visible, compareValue: m.scraped }))}
            color={BRAND_ORANGE}
            compareLabel="visible / scraped"
            height={14}
            gap={8}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-3 sm:gap-6">
        <div className="bg-white rounded-2xl border p-3 sm:p-5" style={{ borderColor: COLORS.line, animation: "dashFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.44s both" }}>
          <h2 className="text-sm sm:text-base font-semibold mb-2 sm:mb-4" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Selling price spread
          </h2>
          <BarChart data={priceDistribution} color={BRAND_MAGENTA} formatValue={(v) => v.toLocaleString()} height={14} gap={8} />
          <p className="text-[10px] sm:text-[11px] mt-2 sm:mt-3" style={{ color: COLORS.slate }}>
            Eligible vehicles only, {formatUsd(0)} to {formatUsd(70000)}+ bands.
          </p>
        </div>
      </div>
    </div>
  );
}
