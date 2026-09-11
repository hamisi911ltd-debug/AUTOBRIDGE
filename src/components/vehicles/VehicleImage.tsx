"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { COLORS } from "@/lib/constants";
import { thumbnailUrl } from "@/lib/thumbnail";

const BRAND_GRADIENT = "linear-gradient(135deg, #3B1F63 0%, #D6336C 55%, #F2762E 100%)";

/**
 * Drop-in replacement for a plain vehicle `<img>`. Uses object-cover so the
 * box is always fully filled, with zero letterbox gaps — every caller now
 * sizes its box at aspect-[4/3], matching typical car-listing photos
 * closely enough that this crops only a sliver off the edges rather than
 * cutting off the car (the old bug came from a taller/square box forcing a
 * much harsher crop, not from object-cover itself).
 *
 * `fallbackSrcs` (this vehicle's OTHER real photos, if any) are tried in
 * order on load failure before giving up — a single dead/expired photo URL
 * (source-site listings do get delisted, taking their photo with them) no
 * longer blanks the whole card out when a second genuine photo of the same
 * car exists. Only once every src is exhausted does the branded placeholder
 * show.
 */
export function VehicleImage({
  src,
  fallbackSrcs = [],
  alt,
  iconSize = 40,
  imgClassName = "",
  banner,
  priority = false,
}: {
  src: string | null;
  /** This vehicle's other real photos — tried in order if `src` fails to load. */
  fallbackSrcs?: string[];
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
  // For each real photo, try its downsized thumbnail variant first, but
  // fall back to the original full-size URL if that specific variant 404s —
  // not every source photo actually has a "medium" size on disk (confirmed:
  // some BE FORWARD listings only ever had a "large" file uploaded), so a
  // blind rewrite with no fallback was turning some genuinely-live photos
  // into permanent "Photo unavailable" cards.
  const candidates = [src, ...fallbackSrcs]
    .filter((s): s is string => !!s)
    .flatMap((url) => {
      const thumb = thumbnailUrl(url);
      return thumb !== url ? [thumb, url] : [url];
    });
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(priority);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const currentSrc = candidates[attempt] ?? null;
  const exhausted = attempt >= candidates.length;

  useEffect(() => {
    // A priority image is already in the server-rendered HTML, so the
    // browser can start (and finish) loading it before React hydrates and
    // attaches onLoad — the native `load` event fires and is missed, and
    // `loaded` would stay false forever, leaving a fully-downloaded photo
    // stuck at opacity-0. `.complete` is a DOM property, not an event, so
    // it's still accurate after the fact — this catches that race.
    if (imgRef.current?.complete) setLoaded(true);
  }, [currentSrc]);

  useEffect(() => {
    if (!currentSrc || priority) {
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
  }, [priority, currentSrc]);

  if (!currentSrc || exhausted) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5" style={{ background: BRAND_GRADIENT }}>
        <ImageOff size={iconSize} color="rgba(255,255,255,0.85)" />
        <span className="text-[9px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.75)" }}>
          Photo unavailable
        </span>
      </div>
    );
  }

  return (
    <>
      {!loaded && <div className="absolute inset-0 img-shimmer" />}
      <div ref={wrapperRef} className="absolute inset-0">
        {visible && (
          // imgClassName (a hover-zoom transform, where callers pass one) lives on
          // this wrapper rather than the <img> itself, with the banner nested
          // inside it — so a zoomed photo and the strip covering its watermark
          // scale and move together instead of the strip staying put while the
          // photo grows out from under it and exposes the watermark again.
          <div className={`absolute inset-0 ${imgClassName}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- external CDN, many hosts */}
            <img
              key={currentSrc}
              ref={imgRef}
              src={currentSrc}
              alt={alt}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => {
                setLoaded(false);
                setAttempt((a) => a + 1);
              }}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            />
            {banner && (
              <div
                className="absolute bottom-0 inset-x-0 h-4 sm:h-[18px] flex items-center justify-center gap-1"
                style={{ background: "rgba(242,118,46,0.45)" }}
              >
                <span className="text-[8px] sm:text-[9px] font-bold text-white">
                  {banner.year} &middot; {banner.country}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
