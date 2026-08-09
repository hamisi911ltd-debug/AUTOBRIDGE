"use client";

import { useState, useTransition } from "react";
import { COLORS } from "@/lib/constants";
import { deleteUser } from "@/app/admin/actions";

export function DeleteUserButton({ id, email }: { id: string; email: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(`Delete ${email}? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      try {
        await deleteUser(fd);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete user");
      }
    });
  }

  return (
    <div>
      <button onClick={handleClick} disabled={pending} className="text-xs font-medium disabled:opacity-50" style={{ color: COLORS.burgundy }}>
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="text-[11px] mt-1" style={{ color: COLORS.burgundy }}>{error}</p>}
    </div>
  );
}
