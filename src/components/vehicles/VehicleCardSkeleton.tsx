import { COLORS } from "@/lib/constants";

/**
 * Placeholder card matching VehicleCard's real shape, shown while the full
 * catalogue is still loading in behind a search - a plain "Loading…" line
 * above a grid that still showed whatever small starter set of vehicles
 * happened to be on hand read as the real, complete result (and often
 * wasn't), which is confusing on a filtered search. A grid of these instead
 * makes it obvious the real results aren't in yet.
 */
export function VehicleCardSkeleton() {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden border flex flex-col" style={{ borderColor: COLORS.line }}>
      <div className="aspect-[4/3] img-shimmer" />
      <div className="p-1.5 sm:p-2 flex flex-col gap-1.5">
        <div className="h-3 rounded skeleton-shimmer" style={{ width: "85%" }} />
        <div className="h-3 rounded skeleton-shimmer" style={{ width: "55%" }} />
        <div className="h-4 rounded skeleton-shimmer mt-1" style={{ width: "60%" }} />
      </div>
    </div>
  );
}

/** A full grid of skeleton cards, same column layout as the real results grid. */
export function VehicleCardSkeletonGrid({ count = 15 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
      {Array.from({ length: count }, (_, i) => (
        <VehicleCardSkeleton key={i} />
      ))}
    </div>
  );
}
