"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { COLORS } from "@/lib/constants";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/vehicles", label: "Vehicles" },
  { href: "/admin/pricing", label: "Pricing rules" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/users", label: "Users" },
];

export function AdminNav({ email, signOutAction }: { email?: string | null; signOutAction: () => Promise<void> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} style={{ color: COLORS.ink }}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="hidden lg:flex items-center gap-4 text-sm">
        <span style={{ color: COLORS.slate }}>{email}</span>
        <form action={signOutAction}>
          <button type="submit" className="font-medium" style={{ color: COLORS.burgundy }}>
            Sign out
          </button>
        </form>
      </div>

      <button className="lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
        {open ? <X size={22} color={COLORS.navy} /> : <Menu size={22} color={COLORS.navy} />}
      </button>

      {open && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-white border-b shadow-sm px-6 py-4 flex flex-col gap-4 text-sm font-medium z-40" style={{ borderColor: COLORS.line }}>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} style={{ color: COLORS.ink }} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: COLORS.line }}>
            <span className="text-xs" style={{ color: COLORS.slate }}>
              {email}
            </span>
            <form action={signOutAction}>
              <button type="submit" className="font-medium" style={{ color: COLORS.burgundy }}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
