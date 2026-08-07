"use client";

import { useState } from "react";
import { Heart, Menu, Scale } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import type { Page } from "@/components/AutoBridgeApp";

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
  const [menuOpen, setMenuOpen] = useState(false);

  function scrollToId(id: string) {
    setPage("home");
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b" style={{ borderColor: COLORS.line }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => setPage("home")} className="text-lg font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Auto<span style={{ color: COLORS.burgundy }}>Bridge</span>
        </button>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
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
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={onGoFavorites} className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-full" style={{ color: COLORS.ink }}>
            <Heart size={16} color={COLORS.burgundy} /> {favoritesCount}
          </button>
          <button onClick={onGoCompare} className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-full" style={{ color: COLORS.ink }}>
            <Scale size={16} color={COLORS.navy} /> {compareCount}
          </button>
          <button onClick={onGoSearch} className="px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: COLORS.burgundy }}>
            Get started
          </button>
          <button onClick={() => setMenuOpen((o) => !o)} className="md:hidden">
            <Menu size={22} color={COLORS.navy} />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-3 text-sm font-medium border-t" style={{ borderColor: COLORS.line }}>
          <button
            onClick={() => {
              onGoSearch();
              setMenuOpen(false);
            }}
            className="text-left pt-3"
          >
            Search
          </button>
          <button
            onClick={() => {
              scrollToId("how-it-works");
              setMenuOpen(false);
            }}
            className="text-left"
          >
            How it works
          </button>
          <button
            onClick={() => {
              scrollToId("faq");
              setMenuOpen(false);
            }}
            className="text-left"
          >
            FAQ
          </button>
          <button
            onClick={() => {
              onGoFavorites();
              setMenuOpen(false);
            }}
            className="text-left"
          >
            Saved ({favoritesCount})
          </button>
          <button
            onClick={() => {
              onGoCompare();
              setMenuOpen(false);
            }}
            className="text-left"
          >
            Compare ({compareCount})
          </button>
        </div>
      )}
    </header>
  );
}
