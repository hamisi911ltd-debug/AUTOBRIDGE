"use client";

import { useTransition } from "react";
import { COLORS } from "@/lib/constants";
import { deleteEnquiry } from "@/app/admin/actions";

export function DeleteEnquiryButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Delete this enquiry? This cannot be undone.")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(() => deleteEnquiry(fd));
  }

  return (
    <button onClick={handleClick} disabled={pending} className="text-xs font-medium disabled:opacity-50" style={{ color: COLORS.slate }}>
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
