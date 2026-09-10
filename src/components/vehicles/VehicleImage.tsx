"use client";

import { useEffect, useRef, useState } from "react";
import { Car } from "lucide-react";
import { COLORS } from "@/lib/constants";

/**
 * Drop-in replacement for a plain vehicle `<img>`. Uses object-cover so the
 * box is always fully filled, with zero letterbox gaps — every caller now
 * sizes its box at aspect-[4/3], matching typical car-listing photos
 * closely enough that this crops only a sliver off the edges rather than
 * cutting off the car (the old bug came from a taller/square box forcing a
 * much harsher crop, not from object-cover itself). Falls back to a car
 * icon when there's no photo, or when the recorded photo URL has gone dead
 * since it was scraped (source-site listings do get delisted, taking their
 * photo with them — an `onError` catch is the only way to detect that at
 * render time, since we don't re-check every stored URL is still live on
 * every page load).
 */
export function VehicleImage({
  src,
  alt,
  iconSize = 40,
  imgClassName = "",
  banner,
  priority = false,
}: {
  src: string | null;
  alt: string;
  iconSize?: number;
  imgClassName?: string;
  /** Thin white strip along the bottom edge showing year + source country
   * in orange — used on primary browsing cards only (not tiny thumbnails),
   * doubling as cover for whatever source-site watermark sits right at
   * that edge. */
  banner?: { year: number; country: string };
  /** Eager, high-priority load for the single most prominent image in a
   * view (first card in a grid, the big detail-page photo) — everything
   * else stays lazy by default. */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(priority);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!src || priority) {
      setVisible(true);
      return;
    }

    const node = wrapperRef.current;
    if (!node || typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [priority, src]);

  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <div
          className="rounded-full flex items-center justify-center"
          style={{ width: iconSize * 1.7, height: iconSize * 1.7, background: "rgba(255,255,255,0.06)" }}
        >
          <Car size={iconSize} color={COLORS.goldLight} strokeWidth={1.2} />
        </div>
      </div>
    );
  }

  return (
    <>
      {!loaded && <div className="absolute inset-0 img-shimmer" />}
      <div ref={wrapperRef} className="absolute inset-0">
        {visible && (
          /* eslint-disable-next-line @next/next/no-img-element -- external CDN, many hosts */
          <img
            src={src}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
          />
        )}
      </div>
      {banner && (
        <div className="absolute bottom-0 inset-x-0 h-4 sm:h-[18px] bg-white/95 flex items-center justify-center gap-1">
          <span className="text-[8px] sm:text-[9px] font-bold" style={{ color: "#F2762E" }}>
            {banner.year} &middot; {banner.country}
          </span>
        </div>
      )}
    </>
  );
}
