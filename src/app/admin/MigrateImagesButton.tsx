"use client";

import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { migrateImageBatchNow } from "@/app/admin/actions";

/**
 * Copies vehicle photos out of the source sites' CDNs into our own
 * VEHICLE_IMAGES R2 bucket, one small batch per click-loop iteration (same
 * "loop client-side, small server work per call" pattern as RunScrapeButton
 * - see its comment for why). With 27,000+ vehicles this is a long-running
 * process; leaving the tab open lets it keep going, and re-clicking later
 * resumes from wherever it left off since already-migrated rows are skipped.
 */
export function MigrateImagesButton() {
  const [running, setRunning] = useState(false);
  const [migrated, setMigrated] = useState(0);
  const [errors, setErrors] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setRunning(true);
    setError(null);
    setMigrated(0);
    setErrors(0);

    try {
      let done = false;
      while (!done) {
        const result = await migrateImageBatchNow();
        setMigrated((m) => m + result.migrated);
        setErrors((e) => e + result.errors);
        setRemaining(result.remaining);
        done = result.done;
      }
    } catch {
      setError("Migration stopped - check the server log for details. Click again to resume from where it left off.");
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
        style={{ background: COLORS.navy }}
      >
        {running ? `Migrating images… (${migrated} done${remaining != null ? `, ${remaining} left` : ""})` : "Migrate images to R2"}
      </button>
      {!running && migrated > 0 && (
        <p className="text-xs mt-2" style={{ color: COLORS.slate }}>
          Migrated {migrated} vehicles{errors > 0 ? `, ${errors} had issues` : ""}
          {remaining ? ` - ${remaining} still remaining, click again to continue.` : ", all done."}
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
