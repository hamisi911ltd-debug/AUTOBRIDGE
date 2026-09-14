import { FONT_DISPLAY } from "@/lib/constants";

/**
 * A small corner mark on every vehicle photo - the Ferbil logo mark next to
 * "FERBIL" over "car imports", in the same serif display face as the rest
 * of the site's branding. Sits top-left, opposite the year/country strip at
 * the bottom, so the two never overlap. Chosen over trying to overlay the
 * logo onto each photo's actual number plate - plate position varies per
 * photo with no reliable way to detect it, where a fixed corner is the one
 * spot every photo shares.
 */
export function FerbilBadge() {
  return (
    <div
      className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-10 flex items-center gap-1 sm:gap-1.5 pl-1 pr-1.5 sm:pl-1.5 sm:pr-2 py-1 rounded-md sm:rounded-lg"
      style={{ background: "rgba(11,31,58,0.55)", backdropFilter: "blur(2px)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo mark, not worth next/image here */}
      <img src="/ferbil-logo.svg" alt="" className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded shrink-0" />
      <div className="leading-none">
        <div className="text-[8px] sm:text-[10px] font-bold text-white tracking-wide" style={{ fontFamily: FONT_DISPLAY }}>
          FERBIL
        </div>
        <div className="text-[5px] sm:text-[6px] text-white/80 tracking-[0.12em] uppercase mt-px" style={{ fontFamily: FONT_DISPLAY }}>
          Car Imports
        </div>
      </div>
    </div>
  );
}
