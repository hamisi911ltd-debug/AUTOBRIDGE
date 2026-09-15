/**
 * A small Ferbil-branded number-plate graphic in the corner of every
 * vehicle photo. Real per-photo plate detection (position, angle,
 * perspective) isn't reliably automatable without a trained detection
 * model, so rather than trying to warp this onto each car's actual plate,
 * it sits as its own small plate in a fixed corner - the one spot every
 * photo shares regardless of the real plate's position. Opposite the
 * year/country strip at the bottom, so the two never overlap.
 */
export function FerbilBadge({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static plate mark, not worth next/image here
    <img
      src="/ferbil-plate.png"
      alt="Ferbil Car Imports"
      className={`absolute z-10 rounded shadow-sm ${size === "sm" ? "top-1 left-1 sm:top-1.5 sm:left-1.5 w-10 sm:w-12" : "top-1.5 left-1.5 sm:top-2 sm:left-2 w-14 sm:w-16"}`}
    />
  );
}
