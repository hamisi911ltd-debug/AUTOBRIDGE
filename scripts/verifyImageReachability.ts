import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);
const DATABASE = "autobridge-kenya-db";
// BeForward rate-limits aggressively under concurrent load (confirmed by
// scripts/backfillSpecs.ts's own cooldown handling) - a burst of HEAD
// requests here previously got misread as mass "photo gone" and wrongly
// cleared ~1,100 live vehicles' imageUrl before a D1 Time Travel restore
// undid it. Low concurrency + real request spacing avoids that entirely;
// DRY_RUN defaults on so a run always reports before it ever writes.
const CONCURRENCY = 4;
const REQUEST_DELAY_MS = 400;
const FLUSH_EVERY = 100;
const FETCH_TIMEOUT_MS = 10_000;
const DRY_RUN = process.argv[2] !== "--write";

type Row = { id: string; imageUrl: string; imageUrls: string | null };

/**
 * Every listing's `imageUrl` was live at scrape time, but source sites
 * (BE FORWARD especially) do delist units - their photo goes with them, and
 * the browsing pages currently show every eligible vehicle "regardless of
 * photo presence" (see getPublicVehicles.ts), so a dead link there falls
 * through to VehicleImage's branded placeholder rather than a real photo.
 *
 * This checks every eligible vehicle's own image (and its gallery, if the
 * cover is dead) against the live source, and clears `imageUrl`/`imageUrls`
 * for any vehicle where nothing resolves - getPublicVehicles then excludes
 * those from what customers actually browse (see the imageUrl: { not: null }
 * filter added alongside this script).
 */
async function fetchVehicleRows(): Promise<Row[]> {
  const sql = "SELECT id, imageUrl, imageUrls FROM Vehicle WHERE eligible = 1 AND imageUrl IS NOT NULL";
  const { stdout } = await execFileAsync(
    "npx",
    ["wrangler", "d1", "execute", DATABASE, "--remote", "--json", "--command", `"${sql}"`],
    { shell: true, maxBuffer: 1024 * 1024 * 100 }
  );
  const parsed = JSON.parse(stdout);
  return parsed[0].results as Row[];
}

type CheckResult = "live" | "dead" | "rate-limited" | "error";

async function checkUrl(url: string): Promise<CheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let res = await fetch(url, { method: "HEAD", signal: controller.signal });
    // Some CDNs don't implement HEAD properly (405/501) - fall back to a
    // ranged GET, which still avoids downloading the whole image.
    if (!res.ok && (res.status === 405 || res.status === 501)) {
      res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-1024" }, signal: controller.signal });
    }
    if (res.ok || res.status === 206) return "live";
    // 429/403/503 mean the source is throttling us, not that the photo is
    // gone - never treat those as "dead". Only a genuine 404/410 counts.
    if (res.status === 429 || res.status === 403 || res.status === 503) return "rate-limited";
    if (res.status === 404 || res.status === 410) return "dead";
    return "error";
  } catch {
    return "error";
  } finally {
    clearTimeout(timeout);
  }
}

/** First image (cover, then gallery) that actually resolves. `null` only
 * when every candidate came back a genuine 404/410 - anything ambiguous
 * (timeout, rate-limit, other error) is treated as "can't tell", never as
 * dead, so a network blip can never get mistaken for a delisted photo. */
async function findDeadOrNull(row: Row): Promise<"live" | "dead" | "unknown"> {
  const gallery = row.imageUrls ? (JSON.parse(row.imageUrls) as string[]) : [];
  const candidates = [row.imageUrl, ...gallery.filter((u) => u !== row.imageUrl)];
  let sawAmbiguous = false;
  for (const url of candidates) {
    const result = await checkUrl(url);
    if (result === "live") return "live";
    if (result !== "dead") sawAmbiguous = true;
    await sleep(REQUEST_DELAY_MS);
  }
  return sawAmbiguous ? "unknown" : "dead";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function sqlEscape(s: string): string {
  return s.replace(/'/g, "''");
}

async function flushDead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const scratchDir = await mkdtemp(path.join(tmpdir(), "verify-reach-sql-"));
  const statements = ids.map((id) => `UPDATE Vehicle SET imageUrl = NULL, imageUrls = '[]' WHERE id = '${sqlEscape(id)}';`);
  const file = path.join(scratchDir, "chunk.sql");
  await writeFile(file, statements.join("\n"));

  await execFileAsync("npx", ["wrangler", "d1", "execute", DATABASE, "--remote", `--file=${file}`], {
    shell: true,
    timeout: 120_000,
    maxBuffer: 1024 * 1024 * 20,
  });
  await unlink(file).catch(() => {});
}

async function main() {
  console.log(DRY_RUN ? "DRY RUN - nothing will be written. Pass --write to actually clear dead rows.\n" : "WRITE MODE - dead rows will be cleared in D1.\n");
  console.log("Fetching vehicle list from D1...");
  const rows = await fetchVehicleRows();
  console.log(`Checking ${rows.length} vehicles' images for reachability (concurrency ${CONCURRENCY})...`);

  const deadIds: string[] = [];
  let unknownCount = 0;
  let pendingDead: string[] = [];
  let totalCleared = 0;
  let done = 0;
  let idx = 0;
  let flushing: Promise<void> = Promise.resolve();

  async function worker() {
    while (idx < rows.length) {
      const row = rows[idx++];
      try {
        const result = await findDeadOrNull(row);
        if (result === "dead") {
          deadIds.push(row.id);
          if (!DRY_RUN) {
            pendingDead.push(row.id);
            if (pendingDead.length >= FLUSH_EVERY) {
              const batch = pendingDead;
              pendingDead = [];
              flushing = flushing.then(() => flushDead(batch)).then(() => {
                totalCleared += batch.length;
                console.log(`Cleared ${batch.length} confirmed-dead (${totalCleared} total so far).`);
              });
            }
          }
        } else if (result === "unknown") {
          unknownCount++;
        }
      } catch (err) {
        console.error(`[${row.id}] check failed:`, err instanceof Error ? err.message : err);
      }
      done++;
      if (done % 200 === 0) console.log(`Progress: ${done}/${rows.length} (${deadIds.length} confirmed dead, ${unknownCount} unknown so far)`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  if (!DRY_RUN) {
    await flushing;
    await flushDead(pendingDead);
    totalCleared += pendingDead.length;
  }

  console.log(`\nDone. ${done} checked.`);
  console.log(`  Confirmed dead (genuine 404/410 on every candidate photo): ${deadIds.length}`);
  console.log(`  Unknown (timeout/rate-limit/other - left untouched): ${unknownCount}`);
  console.log(DRY_RUN ? `  Dry run - nothing written. Re-run with --write to clear the ${deadIds.length} confirmed-dead rows.` : `  Cleared in D1: ${totalCleared}`);
}

main();
