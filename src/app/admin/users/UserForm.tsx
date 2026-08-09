"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { saveUser } from "@/app/admin/actions";

export type UserFormValues = {
  id?: string;
  email: string;
  name: string;
  role: "BUYER" | "DEALER" | "ADMIN";
  isYou?: boolean;
};

const FIELD = "w-full border rounded-lg px-3 py-2 text-sm";
const LABEL = "block text-xs font-semibold uppercase tracking-wide mb-1";

export function UserForm({ initial }: { initial?: UserFormValues }) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function action(formData: FormData) {
    try {
      await saveUser(formData);
      router.push("/admin/users");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    }
  }

  return (
    <div className="max-w-md">
      <form action={action} className="bg-white rounded-2xl border p-6" style={{ borderColor: COLORS.line }}>
        {initial?.id && <input type="hidden" name="id" value={initial.id} />}
        <h1 className="text-xl font-semibold mb-6" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          {initial?.id ? "Edit user" : "New user"}
        </h1>

        {error && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", color: "#B91C1C" }}>
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Name
          </label>
          <input name="name" defaultValue={initial?.name} required className={FIELD} style={{ borderColor: "#D8DCE3" }} />
        </div>

        <div className="mb-4">
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Email
          </label>
          <input name="email" type="email" defaultValue={initial?.email} required className={FIELD} style={{ borderColor: "#D8DCE3" }} />
        </div>

        <div className="mb-4">
          <label className={LABEL} style={{ color: COLORS.slate }}>
            Role
          </label>
          <select
            name="role"
            defaultValue={initial?.role ?? "BUYER"}
            disabled={initial?.isYou}
            className={FIELD}
            style={{ borderColor: "#D8DCE3" }}
          >
            <option value="BUYER">Buyer</option>
            <option value="DEALER">Dealer</option>
            <option value="ADMIN">Admin</option>
          </select>
          {initial?.isYou && (
            <p className="text-[11px] mt-1" style={{ color: COLORS.slate }}>
              You can&apos;t change your own role.
            </p>
          )}
        </div>

        <div className="mb-6">
          <label className={LABEL} style={{ color: COLORS.slate }}>
            {initial?.id ? "New password (leave blank to keep current)" : "Password"}
          </label>
          <input
            name="password"
            type="password"
            required={!initial?.id}
            minLength={8}
            className={FIELD}
            style={{ borderColor: "#D8DCE3" }}
            placeholder={initial?.id ? "••••••••" : "At least 8 characters"}
          />
        </div>

        <button type="submit" className="px-5 py-2.5 rounded-full text-sm font-semibold text-white" style={{ background: COLORS.burgundy }}>
          {initial?.id ? "Save changes" : "Create user"}
        </button>
      </form>
    </div>
  );
}
