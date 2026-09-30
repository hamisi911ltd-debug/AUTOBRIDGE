"use client";

import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { fetchMoreImagesBatchNow } from "@/app/admin/actions";

/**
 * Re-fetches each vehicle's own detail page looking for real extra photos
 * beyond the single cover shot most listings were stuck with (see
 * src/lib/galleryBackfill.ts) - one small batch per click-loop iteration,
 * same pattern as "Migrate images to R2" below it. New scrapes already do
 * this automatically as they come in; this is only for backfilling
 * vehicles already in the catalogue from before that existed.
 */
export function FetchMoreImagesButton() {
  const [running, setRunning] = useState(false);
  const [checked, setChecked] = useState(0);
  const [updated, setUpdated] = useState(0);
  const [errors, setErrors] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setRunning(true);
    setError(null);
    setChecked(0);
    setUpdated(0);
    setErrors(0);

    try {
      let done = false;
      while (!done) {
        const result = await fetchMoreImagesBatchNow();
        setChecked((c) => c + result.processed);
        setUpdated((u) => u + result.updated);
        setErrors((e) => e + result.errors);
        setRemaining(result.remaining);
        done = result.done;
      }
    } catch {
      setError("Stopped - check the server log for details. Click again to resume from where it left off.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={running}
        className="text-sm font-semibold px-4 py-2 rounded-full text-white disabled:opacity-60"
        style={{ background: COLORS.burgundy }}
      >
        {running ? `Fetching more photos… (${checked} checked${remaining != null ? `, ${remaining} left` : ""})` : "Fetch more photos"}
      </button>
      {!running && checked > 0 && (
        <p className="text-xs mt-2" style={{ color: COLORS.slate }}>
          Checked {checked} vehicles: <strong style={{ color: COLORS.navy }}>{updated} got a real gallery</strong>
          {errors > 0 ? `, ${errors} had issues` : ""}
          {remaining ? ` - ${remaining} still to check, click again to continue.` : ", all done."}
        </p>
      )}
      {error && (
        <p className="text-xs mt-2" style={{ color: COLORS.burgundy }}>
          {error}
        </p>
      )}
    </div>
  );
}
