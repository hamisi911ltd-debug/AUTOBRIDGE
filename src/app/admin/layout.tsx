import Link from "next/link";
import { auth, signOut } from "@/auth";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { AdminNav } from "@/app/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div style={{ fontFamily: "var(--font-inter)", background: COLORS.paper, minHeight: "100vh" }}>
      <header className="relative bg-white border-b" style={{ borderColor: COLORS.line }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-semibold shrink-0" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            Auto<span style={{ color: COLORS.burgundy }}>Bridge</span> <span className="text-xs font-normal" style={{ color: COLORS.slate }}>Admin</span>
          </Link>
          <div className="flex items-center gap-8">
            <AdminNav email={session?.user?.email} signOutAction={signOutAction} />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
