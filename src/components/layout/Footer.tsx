"use client";

import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { COMPANY } from "@/lib/company";
import { whatsAppLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import type { Page } from "@/components/AutoBridgeApp";

const GRADIENT = "linear-gradient(90deg, #F2762E 0%, #D6336C 50%, #3B1F63 100%)";
const MUTED = "#8792A8";
const FAINT = "#6B7688";

/**
 * Always anchored to the true bottom of the viewport (the page shell above
 * this is a flex column with `<main>` set to flex-1 — see AutoBridgeApp) —
 * on a short page it sits flush with the bottom edge instead of floating
 * wherever the content happens to end; on a long page it's simply the last
 * thing you scroll to, same as any normal footer.
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
    <footer className="text-white mt-12" style={{ background: COLORS.navyDeep }}>
      <div className="h-[3px]" style={{ background: GRADIENT }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
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
            className="inline-flex items-center gap-2 mt-4 text-xs font-semibold px-3.5 py-2 rounded-full"
            style={{ background: "#25D366", color: "#fff" }}
          >
            <WhatsAppIcon size={13} /> Chat with us
          </a>
        </div>

        {/* Explore */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: COLORS.goldLight }}>
            Explore
          </div>
          <ul className="space-y-2.5 text-xs">
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
          <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: COLORS.goldLight }}>
            Contact
          </div>
          <ul className="space-y-2.5 text-xs" style={{ color: MUTED }}>
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

      <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] text-center sm:text-left"
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
