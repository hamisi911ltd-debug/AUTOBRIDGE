import { Car } from "lucide-react";
import { COLORS } from "@/lib/constants";

/**
 * Drop-in replacement for a plain vehicle `<img>` that crops off the source
 * site's watermark strip (e.g. "www.sbtjapan.com") printed along the bottom
 * of the original photo. Renders the image oversized and pinned to the top;
 * the caller's container must be `relative overflow-hidden` so the extra
 * height — including the watermark band — spills past the bottom edge and
 * is clipped, all in CSS with no server-side image processing needed.
 * Falls back to a car icon when there's no photo.
 */
export function VehicleImage({
  src,
  alt,
  iconSize = 40,
  imgClassName = "",
}: {
  src: string | null;
  alt: string;
  iconSize?: number;
  imgClassName?: string;
}) {
  if (!src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <Car size={iconSize} color={COLORS.goldLight} strokeWidth={1.2} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external CDN, many hosts
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`absolute inset-x-0 top-0 w-full object-cover ${imgClassName}`}
      style={{ height: "116%" }}
    />
  );
}
