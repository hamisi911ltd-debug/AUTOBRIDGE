"use client";

import { COLORS, FONT_DISPLAY } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="text-white py-5" style={{ background: COLORS.navyDeep }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-center sm:text-left">
        <div className="flex items-center gap-2 font-semibold" style={{ fontFamily: FONT_DISPLAY }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- small static logo asset */}
          <img src="/logo.png" alt="" className="w-5 h-5 rounded object-contain" />
          Ferbil<span style={{ color: COLORS.gold }}>Autos</span>
        </div>
        <span style={{ color: "#8792A8" }}>Kenya&apos;s vehicle import marketplace, sourced from Japan and the UAE.</span>
        <span style={{ color: "#6B7688" }}>© 2026 Ferbil Autos</span>
      </div>
    </footer>
  );
}
