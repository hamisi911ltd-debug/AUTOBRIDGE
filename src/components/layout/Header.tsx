"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Heart } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { COUNTRY_ISO } from "@/lib/vehicleBranding";
import type { Page } from "@/components/AutoBridgeApp";

const GRADIENT = "linear-gradient(90deg, #F2762E 0%, #D6336C 50%, #3B1F63 100%)";
const SOURCE_COUNTRIES = ["Japan", "UAE"];

/**
 * Desktop keeps the classic top bar (logo, nav links, icon counters, CTA).
 * Mobile navigation lives in BottomNav instead — this header shrinks down to
 * just the logo on small screens rather than duplicating Search/Favorites
 * in two places. Source-country flags sit at the far right at every
 * size — this is also where the old separate hero strip's "sourced from"
 * message now lives, since the hero itself was removed. `fixed` (not
 * `sticky`) so it stays pinned regardless of any section's own scroll/
 * overflow behavior below it.
 */
export function Header({
  setPage,
  favoritesCount,
  onGoSearch,
  onGoFavorites,
  onGoQuote,
}: {
  setPage: (p: Page) => void;
  favoritesCount: number;
  onGoSearch: () => void;
  onGoFavorites: () => void;
  onGoQuote: () => void;
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [notifOpen]);

  function scrollToId(id: string) {
    setPage("home");
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  }

  return (
    <header className="w-full">
      <div className="w-full overflow-hidden" style={{ padding: "3px 0", background: GRADIENT, boxShadow: "0 6px 20px rgba(59,31,99,0.28)" }}>
        <div className="h-11 sm:h-14 bg-white/95 backdrop-blur flex items-center justify-between px-3 sm:px-6">
          <button onClick={() => setPage("home")} className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <span className="text-sm sm:text-xl font-bold tracking-tight" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
              Kenya&apos;s Vehicle Import Marketplace
            </span>
          </button>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button onClick={onGoSearch} style={{ color: COLORS.ink }}>
              Search
            </button>
            <button onClick={onGoQuote} style={{ color: COLORS.ink }}>
              Get an invoice
            </button>
            <button onClick={() => scrollToId("how-it-works")} style={{ color: COLORS.ink }}>
              How it works
            </button>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2">
              <button onClick={onGoFavorites} className="inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1.5 rounded-full" style={{ color: COLORS.ink }}>
                <Heart size={15} color={COLORS.burgundy} /> {favoritesCount}
              </button>
              <button onClick={onGoSearch} className="px-3.5 py-1.5 rounded-full text-sm font-semibold text-white" style={{ background: COLORS.burgundy }}>
                Get started
              </button>
            </div>

            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen((o) => !o)} aria-label="Notifications" className="w-8 h-8 rounded-full flex items-center justify-center">
                <Bell size={17} color={COLORS.navy} />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border shadow-lg p-4 text-center" style={{ borderColor: COLORS.line }}>
                  <p className="text-sm font-medium" style={{ color: COLORS.navy }}>
                    No notifications yet
                  </p>
                  <p className="text-xs mt-1" style={{ color: COLORS.slate }}>
                    Updates on your enquiries and saved cars will show up here.
                  </p>
                </div>
              )}
            </div>

            {/* Source-country flags — every size, far right */}
            <div className="flex items-center gap-1 pl-1.5 sm:pl-2 border-l" style={{ borderColor: COLORS.line }} title="Sourced from Japan & UAE">
              {SOURCE_COUNTRIES.map((c) => (
                // eslint-disable-next-line @next/next/no-img-element -- external flag CDN
                <img key={c} src={`https://flagcdn.com/w40/${COUNTRY_ISO[c]}.png`} alt={c} className="w-5 h-3.5 sm:w-6 sm:h-4 object-cover rounded-sm" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
