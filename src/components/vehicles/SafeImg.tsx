"use client";

import { useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";

const BRAND_GRADIENT = "linear-gradient(135deg, #3B1F63 0%, #D6336C 55%, #F2762E 100%)";

/**
 * A plain <img> for vehicle photos that never shows the browser's broken-
 * image icon: if a photo fails (deleted at the source, blocked host), it
 * moves on to the next of `srcs`, and once none are left it shows the same
 * branded "Photo unavailable" tile the cards use. Source sites delete
 * photos when cars sell, so some stored URLs will always go dead.
 */
export function SafeImg({
  srcs,
  alt,
  className = "",
  iconSize = 28,
  ...rest
}: { srcs: (string | null | undefined)[]; alt: string; iconSize?: number } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "onError">) {
  const list = [...new Set(srcs.filter((s): s is string => !!s))];
  const [attempt, setAttempt] = useState(0);
  const src = list[attempt];

  if (!src) {
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-1`} style={{ background: BRAND_GRADIENT }} role="img" aria-label={alt}>
        <ImageOff size={iconSize} color="rgba(255,255,255,0.85)" />
        <span className="text-[9px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.75)" }}>
          Photo unavailable
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- photos come from many external hosts
    <img key={src} src={src} alt={alt} className={className} onError={() => setAttempt((a) => a + 1)} {...rest} />
  );
}
