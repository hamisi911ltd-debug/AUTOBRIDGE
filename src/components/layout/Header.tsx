"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Heart } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import type { Page } from "@/components/AutoBridgeApp";

const GRADIENT = "linear-gradient(90deg, #F2762E 0%, #D6336C 50%, #3B1F63 100%)";

/**
 * Desktop keeps the classic top bar (logo, nav links, icon counters, CTA).
 * Mobile navigation lives in BottomNav instead - this header shrinks down to
 * just the logo on small screens rather than duplicating Search/Favorites
 * in two places. `fixed` (not `sticky`) so it stays pinned regardless of
 * any section's own scroll/overflow behavior below it.
 */
export function Header({
  setPage,
  favoritesCount,
  onGoSearch,
  onGoFavorites,
  onGoQuote,
  totalCount,
}: {
  setPage: (p: Page) => void;
  favoritesCount: number;
  onGoSearch: () => void;
  onGoFavorites: () => void;
  onGoQuote: () => void;
  totalCount: number;
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
          <button onClick={() => setPage("home")} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo mark */}
            <img src="/ferbil-logo.svg" alt="" className="w-6 h-6 sm:w-8 sm:h-8" />
            <div className="text-left leading-none">
              <div className="text-sm sm:text-lg font-bold tracking-wide" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
                FERBIL
              </div>
              <div className="block text-[7px] sm:text-[8px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-0.5" style={{ color: COLORS.slate }}>
                Car Imports
              </div>
            </div>
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

            <div className="hidden sm:flex items-center gap-1 pl-2 sm:pl-3 border-l" style={{ borderColor: COLORS.line }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: COLORS.gold }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: COLORS.gold }} />
              </span>
              <span className="text-xs sm:text-sm font-bold animate-pulse" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
                {totalCount.toLocaleString()}+
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
