"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { COLORS } from "@/lib/constants";

// Same number DetailPage's enquiry flow sends to — kept in sync manually
// since there's no shared config module for it yet.
const WHATSAPP_NUMBER = "254759159881";
const DEFAULT_MESSAGE = "Hi, I'd like help finding a car on Ferbil Autos.";

const GREET_AFTER_MS = 4000;
const GREET_BUBBLE_MS = 7000;
const GREET_KEY = "ferbil_whatsapp_greeted";

/**
 * Floating "talk to a live agent" button — replaces the old in-page AI chat
 * widget, which turned out unreliable in practice. A WhatsApp deep link
 * can't really "not work" the way a custom chat UI can, and it reaches an
 * actual person.
 */
export function WhatsAppButton() {
  const [greetBubble, setGreetBubble] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(GREET_KEY)) return;
    const id = setTimeout(() => {
      sessionStorage.setItem(GREET_KEY, "1");
      setGreetBubble(true);
      setTimeout(() => setGreetBubble(false), GREET_BUBBLE_MS);
    }, GREET_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  function openWhatsApp() {
    setGreetBubble(false);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      {greetBubble && (
        <button
          onClick={openWhatsApp}
          className="fixed bottom-24 md:bottom-6 right-24 z-50 flex items-center gap-2 bg-white rounded-full shadow-lg pl-1 pr-3 py-1"
          style={{ border: `1px solid ${COLORS.line}` }}
        >
          <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "#25D366" }}>
            <MessageCircle size={13} color="#fff" />
          </span>
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: COLORS.navy }}>
            Chat with an agent 👋
          </span>
        </button>
      )}
      <button
        onClick={openWhatsApp}
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-24 md:bottom-6 right-6 z-50 w-11 h-11 rounded-full shadow-xl flex items-center justify-center"
        style={{ background: "#25D366" }}
      >
        <MessageCircle size={20} color="#fff" />
      </button>
    </>
  );
}
