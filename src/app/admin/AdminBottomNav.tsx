"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Car, MessageSquare, Plus, X, Tag, Star, Users, LogOut } from "lucide-react";
import { COLORS } from "@/lib/constants";

const PRIMARY = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/enquiries", label: "Enquiries", icon: MessageSquare },
];

const MORE = [
  { href: "/admin/pricing", label: "Pricing rules", icon: Tag },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/users", label: "Users", icon: Users },
];

/**
 * Admin's mobile nav — same bottom-bar pattern as the public site. Only the
 * 3 most-used sections get a direct slot; everything else sits behind a
 * "+" that pops up a sheet rather than cramming 6 icons into one bar.
 */
export function AdminBottomNav({ email, signOutAction }: { email?: string | null; signOutAction: () => Promise<void> }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const moreActive = MORE.some((l) => isActive(l.href));

  return (
    <>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute bottom-16 left-3 right-3 bg-white rounded-2xl border shadow-xl p-2"
            style={{ borderColor: COLORS.line }}
            onClick={(e) => e.stopPropagation()}
          >
            {MORE.map((l) => {
              const Icon = l.icon;
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: active ? COLORS.navy : "transparent", color: active ? "#fff" : COLORS.ink }}
                >
                  <Icon size={17} color={active ? COLORS.goldLight : COLORS.slate} />
                  {l.label}
                </Link>
              );
            })}
            <div className="mt-1 pt-2 border-t flex items-center justify-between px-3" style={{ borderColor: COLORS.line }}>
              <span className="text-xs truncate" style={{ color: COLORS.slate }}>
                {email}
              </span>
              <form action={signOutAction}>
                <button type="submit" className="text-sm font-medium flex items-center gap-1.5 shrink-0" style={{ color: COLORS.burgundy }}>
                  <LogOut size={14} /> Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white border-t flex items-stretch"
        style={{ borderColor: COLORS.line, paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {PRIMARY.map((l) => {
          const Icon = l.icon;
          const active = isActive(l.href);
          return (
            <Link key={l.href} href={l.href} className="flex-1 flex flex-col items-center justify-center gap-0.5">
              <Icon size={20} color={active ? COLORS.burgundy : COLORS.slate} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium" style={{ color: active ? COLORS.burgundy : COLORS.slate }}>
                {l.label}
              </span>
            </Link>
          );
        })}
        <button onClick={() => setMoreOpen((o) => !o)} className="flex-1 flex flex-col items-center justify-center gap-0.5">
          {moreOpen ? <X size={20} color={COLORS.burgundy} /> : <Plus size={20} color={moreActive ? COLORS.burgundy : COLORS.slate} strokeWidth={moreActive ? 2.5 : 2} />}
          <span className="text-[10px] font-medium" style={{ color: moreOpen || moreActive ? COLORS.burgundy : COLORS.slate }}>
            More
          </span>
        </button>
      </nav>
    </>
  );
}
