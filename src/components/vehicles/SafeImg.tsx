"use client";

import { useRef, useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";

const BRAND_GRADIENT = "linear-gradient(135deg, #3B1F63 0%, #D6336C 55%, #F2762E 100%)";

// A single request failing is not proof a photo is gone - measured live,
// a page loading many cards' photos at once briefly fails a real chunk of
// requests to some source CDNs (BE FORWARD, enhance-auto) purely from that
// burst, even though the exact same URL always loads fine on its own. Each
// candidate gets a couple of quick retries (forcing the <img> to reissue
// the identical request) before this moves on, so a bad instant of network
// load never permanently blanks out a perfectly live photo.
const MAX_RETRIES_PER_SRC = 2;
const RETRY_DELAY_MS = 700;

/**
 * A plain <img> for vehicle photos that never shows the browser's broken-
 * image icon: if a photo still fails after a couple of retries (deleted at
 * the source, blocked host), it moves on to the next of `srcs`, and once
 * none are left it shows the same branded "Photo unavailable" tile the
 * cards use. Source sites delete photos when cars sell, so some stored
 * URLs will always go dead eventually.
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
  const [retryNonce, setRetryNonce] = useState(0);
  const retriesRef = useRef(0);
  const src = list[attempt];

  function handleError() {
    if (retriesRef.current < MAX_RETRIES_PER_SRC) {
      retriesRef.current += 1;
      const n = retriesRef.current;
      setTimeout(() => setRetryNonce((v) => v + 1), RETRY_DELAY_MS * n);
    } else {
      retriesRef.current = 0;
      setAttempt((a) => a + 1);
    }
  }

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
    <img key={`${src}-${retryNonce}`} src={src} alt={alt} className={className} onError={handleError} {...rest} />
  );
}
