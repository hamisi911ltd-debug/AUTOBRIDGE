import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { COLORS } from "@/lib/constants";
import { AdminSidebar } from "@/app/admin/AdminSidebar";
import { AdminBottomNav } from "@/app/admin/AdminBottomNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, unhandledEnquiries] = await Promise.all([auth(), prisma.enquiry.count({ where: { handled: false } })]);

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div style={{ fontFamily: "var(--font-inter)", background: COLORS.paper, minHeight: "100vh" }} className="pb-16 md:pb-0 pt-[3.25rem] md:pt-0">
      <AdminSidebar email={session?.user?.email} signOutAction={signOutAction} unhandledEnquiries={unhandledEnquiries} />
      {/* md:ml-60 offsets the sidebar, which is fixed (removed from flow) rather
         than an in-flow flex sibling - see AdminSidebar for why. */}
      <main className="md:ml-60 min-w-0 max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 w-full">{children}</main>
      <AdminBottomNav email={session?.user?.email} signOutAction={signOutAction} unhandledEnquiries={unhandledEnquiries} />
    </div>
  );
}
