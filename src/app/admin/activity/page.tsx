import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const WINDOW_DAYS = 30;
const TOP_VEHICLES = 10;

const TYPE_LABEL: Record<string, string> = {
  PAGE_VIEW: "Page view",
  VEHICLE_VIEW: "Vehicle click",
  QUOTE_DOWNLOAD: "Quote downloaded",
};
const TYPE_COLOR: Record<string, string> = {
  PAGE_VIEW: COLORS.slate,
  VEHICLE_VIEW: COLORS.gold,
  QUOTE_DOWNLOAD: COLORS.burgundy,
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border p-3 sm:p-5" style={{ borderColor: COLORS.line }}>
      <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-0.5 sm:mb-1" style={{ color: COLORS.slate }}>
        {label}
      </div>
      <div className="text-lg sm:text-2xl font-bold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] sm:text-xs mt-0.5" style={{ color: COLORS.slate }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function vehicleLabel(e: { vehicleYear: number | null; vehicleMake: string | null; vehicleModel: string | null }): string | null {
  if (!e.vehicleMake) return null;
  return [e.vehicleYear, e.vehicleMake, e.vehicleModel].filter(Boolean).join(" ");
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);
  const since = daysAgo(WINDOW_DAYS);

  const [pageViews, vehicleClicks, quoteDownloads, enquiries30d, uniqueVisitorRows, topVehicleGroups, recentEvents, totalEvents] = await Promise.all([
    prisma.siteEvent.count({ where: { type: "PAGE_VIEW", createdAt: { gte: since } } }),
    prisma.siteEvent.count({ where: { type: "VEHICLE_VIEW", createdAt: { gte: since } } }),
    prisma.siteEvent.count({ where: { type: "QUOTE_DOWNLOAD", createdAt: { gte: since } } }),
    prisma.enquiry.count({ where: { createdAt: { gte: since } } }),
    // Distinct visitors seen in the window - a rough, anonymous "how many
    // different browsers visited" figure, not a precise unique-human count
    // (the same person on two devices counts twice, a shared/cleared
    // browser can undercount).
    prisma.siteEvent.findMany({
      where: { createdAt: { gte: since }, visitorId: { not: null } },
      distinct: ["visitorId"],
      select: { visitorId: true },
    }),
    prisma.siteEvent.groupBy({
      by: ["vehicleId", "vehicleMake", "vehicleModel", "vehicleYear"],
      where: { type: "VEHICLE_VIEW", createdAt: { gte: since }, vehicleId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { vehicleId: "desc" } },
      take: TOP_VEHICLES,
    }),
    prisma.siteEvent.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.siteEvent.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalEvents / PAGE_SIZE));

  function pageHref(p: number) {
    return p <= 1 ? "/admin/activity" : `/admin/activity?page=${p}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Activity
        </h1>
        <p className="text-xs sm:text-sm mt-0.5" style={{ color: COLORS.slate }}>
          Anonymous site traffic - no names or contact details, last {WINDOW_DAYS} days unless noted.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-6">
        <StatCard label="Page views" value={pageViews.toLocaleString()} />
        <StatCard label="Visitors (approx.)" value={uniqueVisitorRows.length.toLocaleString()} />
        <StatCard label="Vehicles clicked" value={vehicleClicks.toLocaleString()} />
        <StatCard label="Quotes downloaded" value={quoteDownloads.toLocaleString()} />
        <StatCard label="Enquiries" value={enquiries30d.toLocaleString()} sub="from the Enquiries page" />
      </div>

      <div className="bg-white rounded-2xl border p-3 sm:p-5 mb-6" style={{ borderColor: COLORS.line }}>
        <h2 className="text-sm sm:text-base font-semibold mb-3" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Most-clicked vehicles
        </h2>
        {topVehicleGroups.length === 0 ? (
          <p className="text-sm" style={{ color: COLORS.slate }}>
            No vehicle clicks recorded yet.
          </p>
        ) : (
          <div className="space-y-1">
            {topVehicleGroups.map((g, i) => (
              <div key={`${g.vehicleId}-${i}`} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0" style={{ borderColor: COLORS.line }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-semibold w-5 shrink-0 text-right" style={{ color: COLORS.slate }}>
                    {i + 1}
                  </span>
                  {g.vehicleId ? (
                    <Link href={`/admin/vehicles/${g.vehicleId}/edit`} className="text-sm font-medium truncate hover:underline" style={{ color: COLORS.navy }}>
                      {vehicleLabel(g) ?? g.vehicleId}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium truncate" style={{ color: COLORS.navy }}>
                      {vehicleLabel(g) ?? "Unknown vehicle"}
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold shrink-0" style={{ color: COLORS.burgundy }}>
                  {g._count._all} click{g._count._all === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: COLORS.line }}>
        <div className="p-3 sm:p-5 pb-2 sm:pb-3 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm sm:text-base font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Recent activity
          </h2>
          <span className="text-xs" style={{ color: COLORS.slate }}>
            {totalEvents.toLocaleString()} events recorded in total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: COLORS.line, color: COLORS.slate }}>
                <th className="px-3 sm:px-5 py-2 font-medium">Type</th>
                <th className="px-3 sm:px-5 py-2 font-medium">Vehicle</th>
                <th className="px-3 sm:px-5 py-2 font-medium">Page</th>
                <th className="px-3 sm:px-5 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 sm:px-5 py-8 text-center" style={{ color: COLORS.slate }}>
                    Nothing recorded yet - activity appears here as visitors browse the site.
                  </td>
                </tr>
              )}
              {recentEvents.map((e) => (
                <tr key={e.id} className="border-t" style={{ borderColor: COLORS.line }}>
                  <td className="px-3 sm:px-5 py-2 sm:py-2.5 font-medium" style={{ color: TYPE_COLOR[e.type] ?? COLORS.ink }}>
                    {TYPE_LABEL[e.type] ?? e.type}
                  </td>
                  <td className="px-3 sm:px-5 py-2 sm:py-2.5 truncate max-w-[220px]" style={{ color: COLORS.navy }}>
                    {vehicleLabel(e) ?? "—"}
                  </td>
                  <td className="px-3 sm:px-5 py-2 sm:py-2.5" style={{ color: COLORS.slate }}>
                    {e.path ?? "—"}
                  </td>
                  <td className="px-3 sm:px-5 py-2 sm:py-2.5 whitespace-nowrap" style={{ color: COLORS.slate }}>
                    {e.createdAt.toLocaleDateString()}, {e.createdAt.toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-t text-sm" style={{ borderColor: COLORS.line }}>
            <span style={{ color: COLORS.slate }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Link
                href={pageHref(Math.max(1, page - 1))}
                aria-disabled={page <= 1}
                className="px-3 py-1.5 rounded-full font-medium"
                style={{ background: page <= 1 ? "#F1F1EC" : COLORS.card, color: page <= 1 ? COLORS.slate : COLORS.navy, pointerEvents: page <= 1 ? "none" : "auto" }}
              >
                Previous
              </Link>
              <Link
                href={pageHref(Math.min(totalPages, page + 1))}
                aria-disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-full font-medium"
                style={{ background: page >= totalPages ? "#F1F1EC" : COLORS.card, color: page >= totalPages ? COLORS.slate : COLORS.navy, pointerEvents: page >= totalPages ? "none" : "auto" }}
              >
                Next
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
