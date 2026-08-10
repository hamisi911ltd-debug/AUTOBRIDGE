import { CheckCircle2, MapPin, RefreshCw } from "lucide-react";
import { COLORS } from "@/lib/constants";
import type { PublicVehicle } from "@/types/vehicle";

/**
 * A thin trust/stats strip under the hero — real, live numbers only (no
 * fabricated "cars added today" counters). Mirrors the density of a real
 * marketplace's top-of-page stat bar without inventing figures we don't
 * actually have.
 */
export function StatsBar({ vehicles }: { vehicles: PublicVehicle[] }) {
  const makeCount = new Set(vehicles.map((v) => v.make)).size;
  const countryCount = new Set(vehicles.map((v) => v.sourceCountry)).size;

  const stats = [
    { icon: CheckCircle2, label: `${vehicles.length.toLocaleString()} vehicles in stock` },
    { icon: MapPin, label: `${makeCount} makes · ${countryCount} source ${countryCount === 1 ? "market" : "markets"}` },
    { icon: RefreshCw, label: "Inventory refreshed nightly" },
  ];

  return (
    <div className="border-b" style={{ borderColor: COLORS.line, background: COLORS.card }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        {stats.map(({ icon: Icon, label }) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: COLORS.slate }}>
            <Icon size={14} color={COLORS.burgundy} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}
