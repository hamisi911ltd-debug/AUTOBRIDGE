import type { ReactNode } from "react";
import { COLORS } from "@/lib/constants";

/**
 * Hand-drawn line-art illustrations for each import step, not icon glyphs —
 * built as inline SVG (no external asset, no licensing/rot risk) so they
 * stay crisp at any size and match the site's own navy/gold/burgundy palette
 * rather than a generic icon set's single-colour look.
 */

const STROKE = COLORS.gold;
const STROKE_SOFT = "#7A6A45";
const FILL = COLORS.goldLight;

function Badge({ children }: { children: ReactNode }) {
  return (
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
      style={{ background: "rgba(198,149,44,0.12)" }}
    >
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        {children}
      </svg>
    </div>
  );
}

export function SearchIllustration() {
  return (
    <Badge>
      <rect x="4" y="16" width="18" height="12" rx="1.5" stroke={STROKE_SOFT} strokeWidth="1.6" />
      <path d="M4 18l9 5 9-5" stroke={STROKE_SOFT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26" cy="14" r="7" stroke={STROKE} strokeWidth="2" fill="rgba(198,149,44,0.15)" />
      <path d="M31 19l4.5 4.5" stroke={STROKE} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M23 14h6M26 11v6" stroke={FILL} strokeWidth="1.6" strokeLinecap="round" />
    </Badge>
  );
}

export function ReserveIllustration() {
  return (
    <Badge>
      <rect x="6" y="8" width="24" height="22" rx="2.5" stroke={STROKE_SOFT} strokeWidth="1.6" />
      <path d="M6 15h24" stroke={STROKE_SOFT} strokeWidth="1.6" />
      <path d="M12 5v6M24 5v6" stroke={STROKE_SOFT} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="24" cy="24" r="8" fill={COLORS.navy} stroke={STROKE} strokeWidth="2" />
      <path d="M20.5 24l2.5 2.5 4.5-5" stroke={STROKE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Badge>
  );
}

export function ShipIllustration() {
  return (
    <Badge>
      <path
        d="M4 24h32l-3.5 8h-25L4 24z"
        stroke={STROKE_SOFT}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <rect x="12" y="12" width="16" height="10" rx="1" stroke={STROKE} strokeWidth="1.8" fill="rgba(198,149,44,0.15)" />
      <path d="M12 16h16M16 12v10M22 12v10" stroke={STROKE} strokeWidth="1.3" />
      <path d="M20 12V6M20 6h6" stroke={STROKE_SOFT} strokeWidth="1.6" strokeLinecap="round" />
    </Badge>
  );
}

export function ClearanceIllustration() {
  return (
    <Badge>
      <path
        d="M20 5l13 5v4H7V10l13-5z"
        stroke={STROKE_SOFT}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 14v13M17 14v13M23 14v13M31 14v13" stroke={STROKE_SOFT} strokeWidth="1.6" />
      <path d="M6 32h28" stroke={STROKE_SOFT} strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M27 20l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6v-4l5-2z"
        fill={COLORS.navy}
        stroke={STROKE}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M24.5 26l1.8 1.8 3.2-3.6" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Badge>
  );
}

export function DeliveredIllustration() {
  return (
    <Badge>
      <path d="M6 26l2-8a2 2 0 0 1 2-1.5h14a2 2 0 0 1 2 1.5l2 8" stroke={STROKE_SOFT} strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="5" y="26" width="24" height="4" rx="1.5" stroke={STROKE_SOFT} strokeWidth="1.6" />
      <circle cx="11" cy="30" r="2.4" fill={COLORS.navy} stroke={STROKE_SOFT} strokeWidth="1.4" />
      <circle cx="23" cy="30" r="2.4" fill={COLORS.navy} stroke={STROKE_SOFT} strokeWidth="1.4" />
      <path
        d="M30 6c-4 0-7 3-7 7 0 5 7 12 7 12s7-7 7-12c0-4-3-7-7-7z"
        fill={COLORS.navy}
        stroke={STROKE}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="13" r="2.6" fill={FILL} />
    </Badge>
  );
}
