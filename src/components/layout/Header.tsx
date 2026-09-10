"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Heart, Scale } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { COUNTRY_ISO } from "@/lib/vehicleBranding";
import type { Page } from "@/components/AutoBridgeApp";

const GRADIENT = "linear-gradient(90deg, #F2762E 0%, #D6336C 50%, #3B1F63 100%)";
const SOURCE_COUNTRIES = ["Japan", "UAE"];

/**
 * Desktop keeps the classic top bar (logo, nav links, icon counters, CTA).
 * Mobile navigation lives in BottomNav instead — this header shrinks down to
 * just the logo on small screens rather than duplicating Search/Favorites/
 * Compare in two places. Source-country flags sit at the far right at every
 * size — this is also where the old separate hero strip's "sourced from"
 * message now lives, since the hero itself was removed. `fixed` (not
 * `sticky`) so it stays pinned regardless of any section's own scroll/
 * overflow behavior below it.
 */
export function Header({
  setPage,
  favoritesCount,
  compareCount,
  onGoSearch,
  onGoFavorites,
  onGoCompare,
}: {
  setPage: (p: Page) => void;
  favoritesCount: number;
  compareCount: number;
  onGoSearch: () => void;
  onGoFavorites: () => void;
  onGoCompare: () => void;
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
    <header className="fixed top-2 sm:top-3 inset-x-0 z-30 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto rounded-2xl shadow-md overflow-hidden" style={{ padding: "2px", background: GRADIENT }}>
        <div className="h-11 sm:h-14 rounded-[14px] bg-white/95 backdrop-blur flex items-center justify-between px-3 sm:px-5">
          <button onClick={() => setPage("home")} className="flex items-center gap-1.5 text-sm sm:text-base font-semibold shrink-0" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- small static logo asset */}
            <img src="/logo.png" alt="Ferbil Autos" className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg object-contain" />
            <span>
              Ferbil<span style={{ color: COLORS.burgundy }}>Autos</span>
            </span>
          </button>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button onClick={onGoSearch} style={{ color: COLORS.ink }}>
              Search
            </button>
            <button onClick={() => scrollToId("how-it-works")} style={{ color: COLORS.ink }}>
              How it works
            </button>
            <button onClick={() => scrollToId("faq")} style={{ color: COLORS.ink }}>
              FAQ
            </button>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2">
              <button onClick={onGoFavorites} className="inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1.5 rounded-full" style={{ color: COLORS.ink }}>
                <Heart size={15} color={COLORS.burgundy} /> {favoritesCount}
              </button>
              <button onClick={onGoCompare} className="inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1.5 rounded-full" style={{ color: COLORS.ink }}>
                <Scale size={15} color={COLORS.navy} /> {compareCount}
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
