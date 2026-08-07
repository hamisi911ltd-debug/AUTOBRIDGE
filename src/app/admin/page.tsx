import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { RunScrapeButton } from "@/app/admin/RunScrapeButton";

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

export default async function AdminDashboardPage() {
  const [
    totalVehicles,
    eligibleVehicles,
    scrapedVehicles,
    manualVehicles,
    beforwardCount,
    sbtCount,
    totalEnquiries,
    unhandledEnquiries,
    activeRules,
    lastScraped,
    recentEnquiries,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { eligible: true } }),
    prisma.vehicle.count({ where: { sourceSite: { not: null } } }),
    prisma.vehicle.count({ where: { sourceSite: null } }),
    prisma.vehicle.count({ where: { sourceSite: "beforward" } }),
    prisma.vehicle.count({ where: { sourceSite: "sbtjapan" } }),
    prisma.enquiry.count(),
    prisma.enquiry.count({ where: { handled: false } }),
    prisma.pricingRule.count({ where: { active: true } }),
    prisma.vehicle.findFirst({ where: { lastScrapedAt: { not: null } }, orderBy: { lastScrapedAt: "desc" }, select: { lastScrapedAt: true } }),
    prisma.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { vehicle: true } }),
  ]);

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
        <StatCard
          label="Last scrape"
          value={lastScraped?.lastScrapedAt ? lastScraped.lastScrapedAt.toLocaleDateString() : "Never"}
          sub={lastScraped?.lastScrapedAt ? lastScraped.lastScrapedAt.toLocaleTimeString() : undefined}
        />
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
          </div>
        </div>
      </div>
    </div>
  );
}
