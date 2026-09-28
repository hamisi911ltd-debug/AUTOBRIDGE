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
         than an in-flow flex sibling - see AdminSidebar for why. This element
         is deliberately left at its default width:auto (no w-full, no
         max-width, no mx-auto): auto-width is what makes a block with a
         fixed margin-left correctly compute to exactly the remaining
         viewport width with nothing left over. Combining a fixed margin-left
         with width:100% AND an auto margin-right (an earlier version of this
         file did) instead let the two pull in different directions - on
         some viewport widths the content block came out wider than the
         space actually available and its right edge extended past the
         viewport, invisibly clipped by the page's own overflow-x:clip
         with no scrollbar to reach it. The max-width/centering/padding
         that content actually wants lives on the inner div below instead,
         which centers correctly within whatever width this element ends
         up being. */}
      <main className="md:ml-60 min-w-0 overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">{children}</div>
      </main>
      <AdminBottomNav email={session?.user?.email} signOutAction={signOutAction} unhandledEnquiries={unhandledEnquiries} />
    </div>
  );
}
