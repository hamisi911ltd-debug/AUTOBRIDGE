"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Car, MessageSquare, Star, Users, Tag, Activity, LogOut, ExternalLink } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { BRAND } from "@/lib/brand";

const GRADIENT = "linear-gradient(135deg, #F2762E 0%, #D6336C 55%, #3B1F63 100%)";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/activity", label: "Activity", icon: Activity },
  { href: "/admin/enquiries", label: "Enquiries", icon: MessageSquare, badgeKey: "enquiries" as const },
  { href: "/admin/pricing", label: "Pricing rules", icon: Tag },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/users", label: "Users", icon: Users },
];

/**
 * Desktop-only left rail. Genuinely fixed (not `position: sticky`) so it
 * stays in place regardless of any ancestor's scroll/overflow setup - a
 * global `overflow-x` rule was turning `<body>` into its own scroll
 * container, which made `sticky` stick to the wrong element. `fixed` has no
 * such dependency: it's always positioned against the viewport. The layout
 * gives `<main>` a matching `md:ml-60` since a fixed element no longer
 * takes up space in normal flow.
 *
 * Mobile navigation is AdminBottomNav instead - this component also
 * renders the small floating mobile top bar (logo only; nav lives at the
 * bottom), sharing the same gradient identity as the desktop rail and the
 * public site's own header pill.
 */
export function AdminSidebar({
  email,
  signOutAction,
  unhandledEnquiries,
}: {
  email?: string | null;
  signOutAction: () => Promise<void>;
  unhandledEnquiries: number;
}) {
  const pathname = usePathname();
  const badgeFor = (key?: "enquiries") => (key === "enquiries" && unhandledEnquiries > 0 ? unhandledEnquiries : 0);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen fixed top-0 left-0 bg-white border-r z-30" style={{ borderColor: COLORS.line }}>
        <Link href="/" className="flex items-center gap-2.5 h-16 px-5 shrink-0 border-b" style={{ borderColor: COLORS.line }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo mark */}
          <img src={BRAND.logoSrc} alt="" className="w-9 h-9 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight truncate" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
              {BRAND.shortName}
            </div>
            <div className="text-[10px] uppercase tracking-wide leading-tight" style={{ color: COLORS.slate }}>
              Admin
            </div>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5">
          {LINKS.map((l) => {
            const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
            const Icon = l.icon;
            const badge = badgeFor(l.badgeKey);
            return (
              <Link
                key={l.href}
                href={l.href}
                className="group relative flex items-center gap-3 pl-3.5 pr-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: active ? COLORS.card : "transparent", color: active ? COLORS.navy : COLORS.ink }}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
                    style={{ background: GRADIENT }}
                  />
                )}
                <Icon size={17} color={active ? COLORS.burgundy : COLORS.slate} strokeWidth={active ? 2.4 : 2} className="shrink-0 transition-transform group-hover:scale-105" />
                <span className="truncate">{l.label}</span>
                {badge > 0 && (
                  <span
                    className="ml-auto shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                    style={{ background: COLORS.burgundy }}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3.5 border-t" style={{ borderColor: COLORS.line }}>
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium mb-1"
            style={{ color: COLORS.slate }}
          >
            <ExternalLink size={13} /> View live site
          </Link>
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl" style={{ background: COLORS.card }}>
            <span className="text-xs truncate" style={{ color: COLORS.slate }} title={email ?? undefined}>
              {email}
            </span>
            <form action={signOutAction}>
              <button type="submit" aria-label="Sign out" className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: COLORS.burgundy }}>
                <LogOut size={15} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile top bar - same fixed gradient-pill treatment as the public
          site's Header, so the admin panel reads as the same product. Logo
          only; nav lives in AdminBottomNav. */}
      <header className="md:hidden fixed top-2 inset-x-0 z-40 px-3">
        <div className="rounded-2xl shadow-md overflow-hidden" style={{ padding: "2px", background: GRADIENT }}>
          <div className="h-11 rounded-[14px] bg-white/95 backdrop-blur flex items-center justify-between px-3.5">
            <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo mark */}
              <img src={BRAND.logoSrc} alt="" className="w-7 h-7" />
              <span>{BRAND.shortName}</span>
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
