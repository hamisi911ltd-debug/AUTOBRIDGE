import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { toggleEnquiryHandled } from "@/app/admin/actions";
import { DeleteEnquiryButton } from "@/app/admin/enquiries/DeleteEnquiryButton";

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;

  const enquiries = await prisma.enquiry.findMany({
    where: filter === "unhandled" ? { handled: false } : undefined,
    orderBy: { createdAt: "desc" },
    include: { vehicle: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Enquiries <span className="text-base font-normal" style={{ color: COLORS.slate }}>({enquiries.length})</span>
        </h1>
        <div className="flex gap-2 text-sm font-medium">
          <Link
            href="/admin/enquiries"
            className="px-3 py-1.5 rounded-full"
            style={{ background: !filter ? COLORS.navy : "#F1F1EC", color: !filter ? "white" : COLORS.ink }}
          >
            All
          </Link>
          <Link
            href="/admin/enquiries?filter=unhandled"
            className="px-3 py-1.5 rounded-full"
            style={{ background: filter === "unhandled" ? COLORS.navy : "#F1F1EC", color: filter === "unhandled" ? "white" : COLORS.ink }}
          >
            Unhandled
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {enquiries.map((e) => (
          <div key={e.id} className="bg-white rounded-2xl border p-4 flex items-start justify-between gap-4" style={{ borderColor: COLORS.line }}>
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold" style={{ color: COLORS.navy }}>
                  {e.name}
                </span>
                {!e.handled && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FEF3C7", color: "#92400E" }}>
                    New
                  </span>
                )}
              </div>
              <div style={{ color: COLORS.slate }}>
                {e.vehicle.year} {e.vehicle.make} {e.vehicle.model} {e.vehicle.trim}
              </div>
              <div className="mt-1" style={{ color: COLORS.ink }}>
                {e.phone}
                {e.email ? ` · ${e.email}` : ""}
              </div>
              {e.message && (
                <p className="mt-2 text-sm" style={{ color: COLORS.ink }}>
                  {e.message}
                </p>
              )}
              <div className="mt-2 text-xs" style={{ color: COLORS.slate }}>
                <span>{e.createdAt.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <form action={toggleEnquiryHandled}>
                <input type="hidden" name="id" value={e.id} />
                <button
                  type="submit"
                  className="text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap"
                  style={{
                    background: e.handled ? "#F1F1EC" : COLORS.burgundy,
                    color: e.handled ? COLORS.ink : "white",
                  }}
                >
                  {e.handled ? "Mark unhandled" : "Mark handled"}
                </button>
              </form>
              <DeleteEnquiryButton id={e.id} />
            </div>
          </div>
        ))}
        {enquiries.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: COLORS.slate }}>
            No enquiries here.
          </p>
        )}
      </div>
    </div>
  );
}
