import Link from "next/link";
import { auth, signOut } from "@/auth";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div style={{ fontFamily: "var(--font-inter)", background: COLORS.paper, minHeight: "100vh" }}>
      <header className="bg-white border-b" style={{ borderColor: COLORS.line }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
              Auto<span style={{ color: COLORS.burgundy }}>Bridge</span> <span className="text-xs font-normal" style={{ color: COLORS.slate }}>Admin</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link href="/admin" style={{ color: COLORS.ink }}>
                Dashboard
              </Link>
              <Link href="/admin/vehicles" style={{ color: COLORS.ink }}>
                Vehicles
              </Link>
              <Link href="/admin/pricing" style={{ color: COLORS.ink }}>
                Pricing rules
              </Link>
              <Link href="/admin/enquiries" style={{ color: COLORS.ink }}>
                Enquiries
              </Link>
              <Link href="/admin/users" style={{ color: COLORS.ink }}>
                Users
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span style={{ color: COLORS.slate }}>{session?.user?.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="font-medium" style={{ color: COLORS.burgundy }}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
