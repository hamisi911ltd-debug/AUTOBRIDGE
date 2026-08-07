"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { COLORS, FAQS, FONT_DISPLAY } from "@/lib/constants";

export function FAQSection() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <h2 className="text-xl font-semibold mb-6" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
        Frequently asked questions
      </h2>
      <div className="space-y-3">
        {FAQS.map((f, i) => (
          <div key={f.q} className="border rounded-xl overflow-hidden" style={{ borderColor: COLORS.line }}>
            <button
              onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <span className="text-sm font-medium" style={{ color: COLORS.navy }}>
                {f.q}
              </span>
              <ChevronDown
                size={16}
                style={{ transform: openIdx === i ? "rotate(180deg)" : "none", transition: "transform .2s", color: COLORS.slate }}
              />
            </button>
            {openIdx === i && (
              <div className="px-5 pb-4 text-sm" style={{ color: COLORS.slate }}>
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
