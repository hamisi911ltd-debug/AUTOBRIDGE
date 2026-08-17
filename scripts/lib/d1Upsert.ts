import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { computeEligibility, deriveLifestyle } from "@/lib/scrapers/normalize";
import type { ScrapedVehicle } from "@/lib/scrapers/types";

const execFileAsync = promisify(execFile);
const DATABASE = "autobridge-kenya-db";

export type PendingRow = Omit<ScrapedVehicle, "imageWidthPx"> & { imageWidthPx: number | null };

function sqlEscape(s: string): string {
  return s.replace(/'/g, "''");
}

function sqlNow(): string {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

function sqlVal(v: string | number | boolean | null): string {
  if (v === null) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  return `'${sqlEscape(v)}'`;
}

/** Batches PendingRows into one INSERT..ON CONFLICT DO UPDATE per row and runs them via `wrangler d1 execute --file`, same upsert-by-externalId semantics as runScrape.ts's Prisma path. */
export async function flushToD1(pending: PendingRow[]): Promise<void> {
  if (pending.length === 0) return;
  const scratchDir = await mkdtemp(path.join(tmpdir(), "d1-upsert-sql-"));
  const now = sqlNow();

  const statements = pending.map((v) => {
    const { eligible, ineligibleReason } = computeEligibility(v.year);
    const lifestyle = JSON.stringify(deriveLifestyle(v.bodyType, v.fuel, v.sourcePriceUsd));
    const id = randomUUID();
    const cols = [
      "id", "make", "model", "trim", "year", "mileageKm", "fuel", "transmission", "engineCc",
      "bodyType", "drive", "seats", "color", "sourceCountry", "sourcePriceUsd", "freightIncluded", "imageUrl",
      "imageWidthPx", "condition", "lifestyle", "eligible", "ineligibleReason", "sourceSite",
      "externalId", "sourceUrl", "lastScrapedAt", "createdAt", "updatedAt",
    ];
    const vals = [
      sqlVal(id), sqlVal(v.make), sqlVal(v.model), sqlVal(v.trim), sqlVal(v.year), sqlVal(v.mileageKm),
      sqlVal(v.fuel), sqlVal(v.transmission), sqlVal(v.engineCc), sqlVal(v.bodyType), sqlVal(v.drive),
      sqlVal(v.seats), sqlVal(v.color), sqlVal(v.sourceCountry), sqlVal(v.sourcePriceUsd), sqlVal(v.freightIncluded ?? false), sqlVal(v.imageUrl),
      sqlVal(v.imageWidthPx), sqlVal("Foreign Used"), sqlVal(lifestyle), sqlVal(eligible), sqlVal(ineligibleReason),
      sqlVal(v.sourceSite), sqlVal(v.externalId), sqlVal(v.sourceUrl), sqlVal(now), sqlVal(now), sqlVal(now),
    ];
    const updateCols = cols.filter((c) => c !== "id" && c !== "externalId" && c !== "createdAt");
    const updateSet = updateCols.map((c) => `${c}=excluded.${c}`).join(", ");
    return `INSERT INTO Vehicle (${cols.join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT(externalId) DO UPDATE SET ${updateSet};`;
  });

  const file = path.join(scratchDir, "chunk.sql");
  await writeFile(file, statements.join("\n"));

  // wrangler occasionally can't resolve Cloudflare's API host (transient DNS
  // blip, not an auth/data problem — "your DB will return to its original
  // state" per wrangler's own message on failure) — a bare crash here throws
  // away an entire multi-hour scrape run over one flaky request, so retry a
  // few times with backoff before actually giving up.
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await execFileAsync("npx", ["wrangler", "d1", "execute", DATABASE, "--remote", `--file=${file}`], {
        shell: true,
        timeout: 120_000,
        maxBuffer: 1024 * 1024 * 20,
      });
      await unlink(file).catch(() => {});
      return;
    } catch (err) {
      lastErr = err;
      console.error(`[flushToD1] attempt ${attempt}/4 failed, retrying in ${5 * attempt}s...`, err instanceof Error ? err.message : err);
      await sleep(5000 * attempt);
    }
  }
  await unlink(file).catch(() => {});
  throw lastErr;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
