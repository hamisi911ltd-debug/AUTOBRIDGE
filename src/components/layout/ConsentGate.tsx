"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";

const CONSENT_KEY = "ferbil:consent:v1";

/**
 * Blocks the storefront behind a full-screen overlay until the visitor
 * accepts the privacy policy — checked once on mount so there's no flash on
 * repeat visits once accepted. Scoped to AutoBridgeApp only (not rendered in
 * the root layout), so it never appears over /admin or /login.
 */
export function ConsentGate() {
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    try {
      setAccepted(localStorage.getItem(CONSENT_KEY) === "1");
    } catch {
      // localStorage unavailable — fail open rather than block the site.
      setAccepted(true);
    }
  }, []);

  function accept() {
    setAccepted(true);
    try {
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      // Nothing to persist to — the gate will just show again next visit.
    }
  }

  if (accepted) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(7,21,39,0.65)" }}>
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl">
        <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: COLORS.card }}>
          <ShieldCheck size={20} color={COLORS.burgundy} />
        </div>
        <h2 className="text-base font-semibold mb-2" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Your privacy
        </h2>
        <p className="text-sm leading-relaxed mb-4" style={{ color: COLORS.slate }}>
          We use your browser&apos;s local storage to remember saved cars and comparisons, and we only collect contact details you
          submit yourself through an enquiry. Read the full{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: COLORS.burgundy }}>
            Privacy Policy
          </a>{" "}
          for details.
        </p>
        <button onClick={accept} className="w-full py-2.5 rounded-full text-sm font-semibold text-white" style={{ background: COLORS.navy }}>
          Accept &amp; continue
        </button>
      </div>
    </div>
  );
}
