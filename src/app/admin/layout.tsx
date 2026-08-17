import { auth, signOut } from "@/auth";
import { COLORS } from "@/lib/constants";
import { AdminSidebar } from "@/app/admin/AdminSidebar";
import { AdminBottomNav } from "@/app/admin/AdminBottomNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div style={{ fontFamily: "var(--font-inter)", background: COLORS.paper, minHeight: "100vh" }} className="md:flex pb-16 md:pb-0 pt-[3.25rem] md:pt-0">
      <AdminSidebar email={session?.user?.email} signOutAction={signOutAction} />
      <main className="flex-1 min-w-0 max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 w-full">{children}</main>
      <AdminBottomNav email={session?.user?.email} signOutAction={signOutAction} />
    </div>
  );
}
