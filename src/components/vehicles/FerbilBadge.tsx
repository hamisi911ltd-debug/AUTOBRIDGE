import { BRAND } from "@/lib/brand";

/**
 * A small Ferbil-branded number-plate graphic in the corner of every
 * vehicle photo. Real per-photo plate detection (position, angle,
 * perspective) isn't reliably automatable without a trained detection
 * model, so rather than trying to warp this onto each car's actual plate,
 * it sits as its own small plate in a fixed corner - the one spot every
 * photo shares regardless of the real plate's position. Opposite the
 * year/country strip at the bottom, so the two never overlap.
 *
 * The plate graphic itself is real Ferbil brand artwork, not a generic
 * text string - a white-label template build shows the bare photo
 * instead (see BRAND.showPlateBadge) rather than a placeholder plate
 * that would need its own artwork per deployment.
 */
export function FerbilBadge({ size = "md" }: { size?: "sm" | "md" }) {
  if (!BRAND.showPlateBadge) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static plate mark, not worth next/image here
    <img
      src="/ferbil-plate.png"
      alt={BRAND.siteName}
      className={`absolute z-10 rounded shadow-sm ${size === "sm" ? "top-1 left-1 sm:top-1.5 sm:left-1.5 w-10 sm:w-12" : "top-1.5 left-1.5 sm:top-2 sm:left-2 w-14 sm:w-16"}`}
    />
  );
}
