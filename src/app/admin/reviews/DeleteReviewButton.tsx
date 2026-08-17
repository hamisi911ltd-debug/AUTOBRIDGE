"use client";

import { useTransition } from "react";
import { COLORS } from "@/lib/constants";
import { deleteReview } from "@/app/admin/actions";

export function DeleteReviewButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(() => deleteReview(fd));
  }

  return (
    <button onClick={handleClick} disabled={pending} className="text-xs font-medium disabled:opacity-50" style={{ color: COLORS.slate }}>
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
