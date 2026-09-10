"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Car, Tag, MessageSquare, Star, Users, LogOut } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";

const HEADER_GRADIENT = "linear-gradient(90deg, #F2762E 0%, #D6336C 50%, #3B1F63 100%)";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/pricing", label: "Pricing rules", icon: Tag },
  { href: "/admin/enquiries", label: "Enquiries", icon: MessageSquare },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/users", label: "Users", icon: Users },
];

/**
 * Desktop-only left sidebar. Mobile navigation is AdminBottomNav instead —
 * this component only renders the persistent desktop rail plus the small
 * floating mobile top bar (logo only, no menu — nav lives at the bottom).
 */
export function AdminSidebar({ email, signOutAction }: { email?: string | null; signOutAction: () => Promise<void> }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 bg-white border-r" style={{ borderColor: COLORS.line }}>
        <Link href="/" className="flex items-center gap-2 h-16 px-5 shrink-0 border-b" style={{ borderColor: COLORS.line }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- small static logo asset */}
          <img src="/logo.png" alt="" className="w-7 h-7 rounded-lg object-contain" />
          <span className="text-base font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Ferbil<span style={{ color: COLORS.burgundy }}>Autos</span>
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="flex flex-col gap-1">
            {LINKS.map((l) => {
              const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: active ? COLORS.navy : "transparent", color: active ? "#fff" : COLORS.ink }}
                >
                  <Icon size={17} color={active ? COLORS.goldLight : COLORS.slate} />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="px-3 py-4 border-t" style={{ borderColor: COLORS.line }}>
          <div className="text-xs px-3 mb-2 truncate" style={{ color: COLORS.slate }}>
            {email}
          </div>
          <form action={signOutAction}>
            <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium" style={{ color: COLORS.burgundy }}>
              <LogOut size={16} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar — same fixed gradient-pill treatment as the public
          site's Header, so the admin panel reads as the same product. Logo
          only; nav lives in AdminBottomNav. */}
      <header className="md:hidden fixed top-2 inset-x-0 z-40 px-3">
        <div className="rounded-2xl shadow-md overflow-hidden" style={{ padding: "2px", background: HEADER_GRADIENT }}>
          <div className="h-11 rounded-[14px] bg-white/95 backdrop-blur flex items-center justify-between px-3.5">
            <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- small static logo asset */}
              <img src="/logo.png" alt="" className="w-7 h-7 rounded-lg object-contain" />
              <span>
                Ferbil<span style={{ color: COLORS.burgundy }}>Autos</span>
              </span>
            </Link>
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.slate }}>
              Admin
            </span>
          </div>
        </div>
      </header>
    </>
  );
}
