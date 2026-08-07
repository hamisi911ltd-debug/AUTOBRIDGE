"use client";

import { COLORS, FONT_DISPLAY } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="text-white pt-14 pb-8" style={{ background: COLORS.navyDeep }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
        <div>
          <div className="text-lg font-semibold mb-3" style={{ fontFamily: FONT_DISPLAY }}>
            Auto<span style={{ color: COLORS.gold }}>Bridge</span>
          </div>
          <p className="text-xs" style={{ color: "#8792A8" }}>
            Kenya&apos;s import marketplace. Search, estimate, and bring your next car home with confidence.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#8792A8" }}>
            Explore
          </div>
          <ul className="text-sm space-y-2" style={{ color: "#C7CEDB" }}>
            <li>Search vehicles</li>
            <li>Import guide</li>
            <li>Duty calculator</li>
            <li>Track a shipment</li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#8792A8" }}>
            Company
          </div>
          <ul className="text-sm space-y-2" style={{ color: "#C7CEDB" }}>
            <li>About</li>
            <li>How it works</li>
            <li>FAQ</li>
            <li>Contact</li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#8792A8" }}>
            Stay updated
          </div>
          <div className="flex gap-2">
            <input
              placeholder="Email address"
              className="flex-1 px-3 py-2 rounded-lg text-xs text-white"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
            <button className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: COLORS.gold, color: COLORS.navyDeep }}>
              Join
            </button>
          </div>
        </div>
      </div>
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 text-xs flex flex-col sm:flex-row justify-between gap-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: "#6B7688" }}
      >
        <span>© 2026 AutoBridge. Kenya&apos;s import marketplace.</span>
        <span>Nairobi · Mombasa · Kisumu</span>
      </div>
    </footer>
  );
}
