"use client";

import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { COMPANY } from "@/lib/company";
import { whatsAppLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import type { Page } from "@/components/AutoBridgeApp";

const GRADIENT = "linear-gradient(90deg, #F2762E 0%, #D6336C 50%, #3B1F63 100%)";
// Orange-themed footer — white at full and reduced opacity reads cleanly on
// the solid COLORS.gold background this now uses (the navy-tuned muted
// grays it had before were sized for a dark navy footer, not orange).
const MUTED = "rgba(255,255,255,0.85)";
const FAINT = "rgba(255,255,255,0.65)";

/**
 * No gap above or below — sits flush against the page content, and its own
 * bottom padding (not blank page background) is what clears the fixed
 * mobile BottomNav, so that clearance reads as more footer, not empty
 * space. Always anchored to the true bottom of the viewport: the page
 * shell above this is a flex column with `<main>` set to flex-1 (see
 * AutoBridgeApp), so on a short page it sits flush with the bottom edge
 * instead of floating wherever the content happens to end.
 */
export function Footer({
  setPage,
  onGoSearch,
  onGoQuote,
}: {
  setPage?: (p: Page) => void;
  onGoSearch?: () => void;
  onGoQuote?: () => void;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="text-white pb-16 md:pb-0" style={{ background: COLORS.gold }}>
      {/* Mobile: one compact block — logo, a single row of links, phone &
         email — instead of the full 3-section desktop layout stacked tall. */}
      <div className="sm:hidden max-w-7xl mx-auto px-4 py-3.5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-md shrink-0" style={{ background: GRADIENT }} />
          <span className="text-xs font-bold" style={{ fontFamily: FONT_DISPLAY }}>
            {COMPANY.name}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] mb-1.5">
          <button onClick={() => setPage?.("home")} style={{ color: MUTED }}>
            Home
          </button>
          <button onClick={() => onGoSearch?.()} style={{ color: MUTED }}>
            Search cars
          </button>
          <button onClick={() => onGoQuote?.()} style={{ color: MUTED }}>
            Get an invoice
          </button>
          <Link href="/privacy" style={{ color: MUTED }}>
            Privacy Policy
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: MUTED }}>
          <span className="flex items-center gap-1">
            <Phone size={11} className="shrink-0" /> {COMPANY.phone}
          </span>
          <span className="flex items-center gap-1">
            <Mail size={11} className="shrink-0" /> {COMPANY.email}
          </span>
        </div>
      </div>

      {/* Desktop / tablet: full 3-column layout. */}
      <div className="hidden sm:grid max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-7 grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-lg shrink-0" style={{ background: GRADIENT }} />
            <span className="text-sm font-bold leading-tight" style={{ fontFamily: FONT_DISPLAY }}>
              {COMPANY.name}
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
            Kenya&apos;s vehicle import marketplace — real, import-eligible cars sourced from Japan and the UAE, landed
            and cleared in-house.
          </p>
          <a
            href={whatsAppLink("Hi, I'd like help finding a car.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-xs font-semibold px-3.5 py-2 rounded-full"
            style={{ background: "#25D366", color: "#fff" }}
          >
            <WhatsAppIcon size={13} /> Chat with us
          </a>
        </div>

        {/* Explore */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2 text-white">Explore</div>
          <ul className="space-y-2 text-xs">
            <li>
              <button onClick={() => setPage?.("home")} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                Home
              </button>
            </li>
            <li>
              <button onClick={() => onGoSearch?.()} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                Search cars
              </button>
            </li>
            <li>
              <button onClick={() => onGoQuote?.()} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                Get an invoice
              </button>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white transition-colors" style={{ color: MUTED }}>
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2 text-white">Contact</div>
          <ul className="space-y-2 text-xs" style={{ color: MUTED }}>
            <li className="flex items-start gap-2">
              <MapPin size={13} className="shrink-0 mt-0.5" />
              <span>
                {COMPANY.poBox}
                <br />
                {COMPANY.addressLines.join(", ")}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={13} className="shrink-0" /> {COMPANY.phone}
            </li>
            <li className="flex items-center gap-2">
              <Mail size={13} className="shrink-0" /> {COMPANY.email}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.25)" }}>
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 sm:py-2.5 flex flex-col sm:flex-row items-center justify-between gap-0.5 sm:gap-1 text-[11px] text-center sm:text-left"
          style={{ color: FAINT }}
        >
          <span>
            &copy; {year} {COMPANY.name}. All rights reserved.
          </span>
          <span>{COMPANY.web}</span>
        </div>
      </div>
    </footer>
  );
}
