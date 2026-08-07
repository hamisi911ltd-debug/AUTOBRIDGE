"use client";

import { useEffect, useRef, useState } from "react";
import { Car, ChevronRight, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { COLORS } from "@/lib/constants";
import { formatKes } from "@/lib/format";
import { matchVehicles } from "@/lib/assistant";
import type { LandedCost } from "@/lib/landedCost";
import type { PublicVehicle } from "@/types/vehicle";

type Message = { role: "user" | "assistant"; text: string; vehicleIds: string[] };

export function AIAssistant({
  vehicles,
  landedMap,
  open,
  setOpen,
  goDetail,
}: {
  vehicles: PublicVehicle[];
  landedMap: Record<string, LandedCost>;
  open: boolean;
  setOpen: (updater: (o: boolean) => boolean) => void;
  goDetail: (id: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: 'Hi! Tell me your budget or what you need the car for, e.g. "I have KSh 2.5M for a family SUV", and I\'ll match you against current listings.',
      vehicleIds: [],
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: "user", text, vehicleIds: [] }]);
    setInput("");

    const { reply, vehicleIds } = matchVehicles(text, vehicles, landedMap);
    setMessages((prev) => [...prev, { role: "assistant", text: reply, vehicleIds }]);
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center"
        style={{ background: COLORS.burgundy }}
      >
        {open ? <X size={22} color="#fff" /> : <MessageCircle size={22} color="#fff" />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-96 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ background: "#fff", height: "32rem", maxHeight: "75vh", maxWidth: "90vw" }}
        >
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: COLORS.navy }}>
            <Sparkles size={16} color={COLORS.goldLight} />
            <span className="text-sm font-semibold text-white">AutoBridge Assistant</span>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div style={{ maxWidth: "85%" }}>
                  <div
                    className="px-3 py-2 rounded-2xl text-sm"
                    style={m.role === "user" ? { background: COLORS.navy, color: "#fff" } : { background: COLORS.card, color: COLORS.ink }}
                  >
                    {m.text}
                  </div>
                  {m.vehicleIds.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {m.vehicleIds.map((id) => {
                        const v = vehicles.find((x) => x.id === id);
                        if (!v) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => {
                              goDetail(id);
                              setOpen(() => false);
                            }}
                            className="w-full text-left p-2.5 rounded-xl border flex items-center gap-3"
                            style={{ borderColor: COLORS.line }}
                          >
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: COLORS.navy }}>
                              {v.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element -- external CDN, many hosts
                                <img src={v.imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Car size={16} color={COLORS.goldLight} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold truncate" style={{ color: COLORS.navy }}>
                                {v.year} {v.make} {v.model}
                              </div>
                              <div className="text-xs" style={{ color: COLORS.burgundy }}>
                                {formatKes(landedMap[v.id].total)}
                              </div>
                            </div>
                            <ChevronRight size={14} color={COLORS.slate} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: COLORS.line }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="e.g. I have KSh 2.5M for a family SUV"
              className="flex-1 border rounded-full px-4 py-2 text-sm outline-none"
              style={{ borderColor: "#D8DCE3" }}
            />
            <button onClick={send} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.burgundy }}>
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
