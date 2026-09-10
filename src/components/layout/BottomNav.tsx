"use client";

import { Home, Search, FileText } from "lucide-react";
import { COLORS } from "@/lib/constants";
import type { Page } from "@/components/AutoBridgeApp";

/**
 * Mobile's primary navigation — a fixed app-style bottom bar instead of the
 * desktop top header's links/hamburger menu. `env(safe-area-inset-bottom)`
 * keeps it clear of the home-indicator strip on notched phones. "Contact"
 * (a WhatsApp shortcut) sat here before; replaced with "Quotation" so the
 * higher-intent printable-quote flow (with its import-only vs.
 * taxation-and-clearance choice) is one tap away on mobile too — WhatsApp
 * is still reachable from the quote page itself and every vehicle's detail
 * page, and Favorites is still reachable from Search's own filter.
 */
export function BottomNav({
  page,
  setPage,
  onGoSearch,
  onGoQuote,
}: {
  page: Page;
  setPage: (p: Page) => void;
  onGoSearch: () => void;
  onGoQuote: () => void;
}) {
  const items: { key: string; label: string; icon: typeof Home; onClick: () => void; active: boolean }[] = [
    { key: "home", label: "Home", icon: Home, onClick: () => setPage("home"), active: page === "home" },
    { key: "search", label: "Search", icon: Search, onClick: onGoSearch, active: page === "search" },
    { key: "quote", label: "Quotation", icon: FileText, onClick: onGoQuote, active: page === "quote" },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white border-t flex items-stretch"
      style={{ borderColor: COLORS.line, paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map(({ key, label, icon: Icon, onClick, active }) => (
        <button key={key} onClick={onClick} className="flex-1 flex flex-col items-center justify-center gap-0.5">
          <Icon size={20} color={active ? COLORS.burgundy : COLORS.slate} strokeWidth={active ? 2.5 : 2} />
          <span className="text-[10px] font-medium" style={{ color: active ? COLORS.burgundy : COLORS.slate }}>
            {label}
          </span>
        </button>
      ))}
    </nav>
  );
}
