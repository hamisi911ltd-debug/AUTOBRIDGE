"use client";

import { Home, Search, Heart, Scale } from "lucide-react";
import { COLORS } from "@/lib/constants";
import type { Page } from "@/components/AutoBridgeApp";

/**
 * Mobile's primary navigation — a fixed app-style bottom bar instead of the
 * desktop top header's links/hamburger menu. `env(safe-area-inset-bottom)`
 * keeps it clear of the home-indicator strip on notched phones.
 */
export function BottomNav({
  page,
  setPage,
  favoritesCount,
  compareCount,
  onGoSearch,
  onGoFavorites,
  onGoCompare,
}: {
  page: Page;
  setPage: (p: Page) => void;
  favoritesCount: number;
  compareCount: number;
  onGoSearch: () => void;
  onGoFavorites: () => void;
  onGoCompare: () => void;
}) {
  const items: { key: string; label: string; icon: typeof Home; onClick: () => void; active: boolean; badge?: number }[] = [
    { key: "home", label: "Home", icon: Home, onClick: () => setPage("home"), active: page === "home" },
    { key: "search", label: "Search", icon: Search, onClick: onGoSearch, active: page === "search" },
    { key: "saved", label: "Saved", icon: Heart, onClick: onGoFavorites, active: false, badge: favoritesCount },
    { key: "compare", label: "Compare", icon: Scale, onClick: onGoCompare, active: page === "compare", badge: compareCount },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white border-t flex items-stretch"
      style={{ borderColor: COLORS.line, paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map(({ key, label, icon: Icon, onClick, active, badge }) => (
        <button key={key} onClick={onClick} className="flex-1 flex flex-col items-center justify-center gap-0.5">
          <span className="relative">
            <Icon size={20} color={active ? COLORS.burgundy : COLORS.slate} strokeWidth={active ? 2.5 : 2} />
            {!!badge && (
              <span
                className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ background: COLORS.gold }}
              >
                {badge}
              </span>
            )}
          </span>
          <span className="text-[10px] font-medium" style={{ color: active ? COLORS.burgundy : COLORS.slate }}>
            {label}
          </span>
        </button>
      ))}
    </nav>
  );
}
