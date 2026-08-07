import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { computeSellingPriceUsd } from "@/lib/pricing/engine";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { formatUsd } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 50;

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; eligible?: string; page?: string }>;
}) {
  const { q, source, eligible, page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);

  const where: Prisma.VehicleWhereInput = {};
  if (q) {
    where.OR = [
      { make: { contains: q } },
      { model: { contains: q } },
      { trim: { contains: q } },
      { externalId: { contains: q } },
    ];
  }
  if (source === "beforward" || source === "sbtjapan") {
    where.sourceSite = source;
  } else if (source === "manual") {
    where.sourceSite = null;
  }
  if (eligible === "yes") where.eligible = true;
  if (eligible === "no") where.eligible = false;

  const [vehicles, total, rules] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.vehicle.count({ where }),
    prisma.pricingRule.findMany({ where: { active: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { q, source, eligible, page: String(page), ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/admin/vehicles?${qs}` : "/admin/vehicles";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Vehicles <span className="text-base font-normal" style={{ color: COLORS.slate }}>({total})</span>
        </h1>
        <Link href="/admin/vehicles/new" className="text-sm font-semibold px-4 py-2 rounded-full text-white" style={{ background: COLORS.navy }}>
          + New vehicle
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-3 mb-4" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search make, model, trim, ref no…"
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[220px]"
          style={{ borderColor: "#D8DCE3" }}
        />
        <select name="source" defaultValue={source || ""} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "#D8DCE3" }}>
          <option value="">All sources</option>
          <option value="beforward">BE FORWARD</option>
          <option value="sbtjapan">SBT Japan</option>
          <option value="manual">Hand-entered</option>
        </select>
        <select name="eligible" defaultValue={eligible || ""} className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "#D8DCE3" }}>
          <option value="">Eligible + not</option>
          <option value="yes">Eligible only</option>
          <option value="no">Not eligible only</option>
        </select>
        <button type="submit" className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ background: COLORS.burgundy }}>
          Filter
        </button>
        {(q || source || eligible) && (
          <Link href="/admin/vehicles" className="text-sm font-medium" style={{ color: COLORS.slate }}>
            Clear
          </Link>
        )}
      </form>

      <div className="bg-white rounded-2xl border overflow-x-auto" style={{ borderColor: COLORS.line }}>
        <table className="w-full text-sm">
          <thead style={{ background: COLORS.card }}>
            <tr className="text-left">
              <th className="p-3"></th>
              <th className="p-3">Vehicle</th>
              <th className="p-3">Source</th>
              <th className="p-3">Source price</th>
              <th className="p-3">Selling price</th>
              <th className="p-3">Eligible</th>
              <th className="p-3"></th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const { sellingPriceUsd } = computeSellingPriceUsd(v, rules);
              return (
                <tr key={v.id} className="border-t" style={{ borderColor: COLORS.line }}>
                  <td className="p-3">
                    <div className="w-14 h-10 rounded-md overflow-hidden flex items-center justify-center" style={{ background: COLORS.navy }}>
                      {v.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- external CDN, many hosts
                        <img src={v.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px]" style={{ color: COLORS.goldLight }}>
                          No photo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 font-medium">
                    {v.year} {v.make} {v.model} <span style={{ color: COLORS.slate }}>{v.trim}</span>
                  </td>
                  <td className="p-3">
                    {v.sourceSite ? (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "#E8ECF3", color: COLORS.navy }}>
                        {v.sourceSite === "beforward" ? "BE FORWARD" : "SBT Japan"}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "#F1F1EC", color: COLORS.slate }}>
                        Hand-entered
                      </span>
                    )}
                  </td>
                  <td className="p-3">{formatUsd(v.sourcePriceUsd)}</td>
                  <td className="p-3 font-semibold" style={{ color: COLORS.burgundy }}>
                    {formatUsd(sellingPriceUsd)}
                  </td>
                  <td className="p-3">
                    {v.eligible ? (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "#DCFCE7", color: "#166534" }}>
                        Eligible
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">Not eligible</span>
                    )}
                  </td>
                  <td className="p-3">
                    {v.sourceUrl && (
                      <a href={v.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-medium" style={{ color: COLORS.slate }}>
                        Original listing ↗
                      </a>
                    )}
                  </td>
                  <td className="p-3">
                    <Link href={`/admin/vehicles/${v.id}/edit`} className="text-xs font-medium" style={{ color: COLORS.navy }}>
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-sm" style={{ color: COLORS.slate }}>
                  No vehicles match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span style={{ color: COLORS.slate }}>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Link
              href={pageHref({ page: String(Math.max(1, page - 1)) })}
              aria-disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border font-medium"
              style={{ borderColor: "#D8DCE3", color: page <= 1 ? COLORS.slate : COLORS.navy, pointerEvents: page <= 1 ? "none" : "auto", opacity: page <= 1 ? 0.5 : 1 }}
            >
              ← Prev
            </Link>
            <Link
              href={pageHref({ page: String(Math.min(totalPages, page + 1)) })}
              aria-disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border font-medium"
              style={{
                borderColor: "#D8DCE3",
                color: page >= totalPages ? COLORS.slate : COLORS.navy,
                pointerEvents: page >= totalPages ? "none" : "auto",
                opacity: page >= totalPages ? 0.5 : 1,
              }}
            >
              Next →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
