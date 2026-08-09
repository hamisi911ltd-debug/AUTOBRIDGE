import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { DeleteUserButton } from "@/app/admin/users/DeleteUserButton";

export default async function AdminUsersPage() {
  const [session, users] = await Promise.all([auth(), prisma.user.findMany({ orderBy: { createdAt: "asc" } })]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Users <span className="text-base font-normal" style={{ color: COLORS.slate }}>({users.length})</span>
        </h1>
        <Link href="/admin/users/new" className="text-sm font-semibold px-4 py-2 rounded-full text-white" style={{ background: COLORS.navy }}>
          + New user
        </Link>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: COLORS.line }}>
        <table className="w-full text-sm">
          <thead style={{ background: COLORS.card }}>
            <tr className="text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Joined</th>
              <th className="p-3"></th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isYou = u.id === session?.user?.id;
              return (
                <tr key={u.id} className="border-t" style={{ borderColor: COLORS.line }}>
                  <td className="p-3 font-medium">
                    {u.name} {isYou && <span style={{ color: COLORS.slate }}>(you)</span>}
                  </td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={
                        u.role === "ADMIN"
                          ? { background: "#FEF3C7", color: "#92400E" }
                          : { background: "#E8ECF3", color: COLORS.navy }
                      }
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3" style={{ color: COLORS.slate }}>
                    {u.createdAt.toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <Link href={`/admin/users/${u.id}/edit`} className="text-xs font-medium" style={{ color: COLORS.navy }}>
                      Edit
                    </Link>
                  </td>
                  <td className="p-3">{!isYou && <DeleteUserButton id={u.id} email={u.email} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
