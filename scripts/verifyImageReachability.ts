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
// Real dead rate has consistently been under 1% of the catalogue across
// every run so far. A rate anywhere near this high is far more likely to
// mean a source CDN has started throttling/blocking this run's own
// requests (exactly what happened once before, wrongly clearing ~1,100
// live vehicles) than that 1-in-6+ listings genuinely delisted since the
// last check - so this aborts the whole run rather than trusting the
// result, checked only after a minimum sample so early noise can't trip
// it by chance.
const DEAD_RATE_CIRCUIT_BREAKER = 0.15;
const MIN_CHECKED_BEFORE_BREAKER = 60;
// What a real visitor's browser sends as Referer when this image loads as
// an embedded <img> on the live site (browsers default to sending the
// origin, not the full URL, cross-origin) - the first check below mimics
// that exactly, since a source CDN's hotlink protection can allow a bare
// direct fetch (no referer, which is all the previous version of this
// script ever sent) while still blocking the exact request our own pages
// make. That mismatch is why an earlier dry run reported 0 dead vehicles
// here while broken images were still visible live.
const SITE_URL = "https://autobridge-kenya-web.glotech.workers.dev/";

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

async function checkUrl(url: string, extraHeaders: Record<string, string> = {}): Promise<CheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // HEAD first, GET only as a fallback - tried switching this to an
    // always-GET check (closer to what a real <img> tag does) and it
    // backfired badly: BeForward's CDN treats a burst of GETs far more
    // aggressively than HEADs, and started returning 404-shaped responses
    // for live photos purely from request volume - the exact false-
    // positive failure mode the concurrency/delay settings above exist to
    // avoid (confirmed by hand: images this reported "dead" loaded fine
    // seconds later from a single, unburst direct request). HEAD is the
    // safer default here; GET only kicks in when a CDN doesn't support HEAD.
    let res = await fetch(url, { method: "HEAD", headers: extraHeaders, signal: controller.signal });
    if (!res.ok && (res.status === 405 || res.status === 501)) {
      res = await fetch(url, { method: "GET", headers: { ...extraHeaders, Range: "bytes=0-1024" }, signal: controller.signal });
    }
    if (res.ok || res.status === 206) {
      // A 200/206 isn't proof of an actual photo - a delisted unit can
      // redirect to a category/landing page that itself answers 200 with
      // an HTML body, which a plain status check would wrongly call
      // "live" while a real <img> tag fails to decode it and shows the
      // broken-image icon. Only flag it when the header is both present
      // AND clearly non-image - many CDNs omit Content-Type on HEAD
      // entirely, and absence is not evidence of a problem.
      const contentType = res.headers.get("content-type");
      if (contentType && !contentType.startsWith("image/")) return "dead";
      return "live";
    }
    // 429/503 mean the source is throttling us, not that the photo is
    // gone - never treat those as "dead" on their own. A 403 is ambiguous
    // the same way *unless* it's specifically tied to our own Referer -
    // see checkUrlForEmbed, which is what actually decides that.
    if (res.status === 429 || res.status === 403 || res.status === 503) return "rate-limited";
    if (res.status === 404 || res.status === 410) return "dead";
    return "error";
  } catch {
    return "error";
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Checks a URL the way it actually gets used on the live site (Referer =
 * our own origin, since that's what a real visitor's browser sends
 * loading it as an embedded <img>) - and only if THAT fails does it retry
 * with no Referer at all, purely to tell apart two very different causes
 * behind a 403/429/503: genuine transient throttling (fails both ways,
 * left untouched, same as before) versus a source CDN's hotlink
 * protection blocking cross-origin embedding specifically (succeeds with
 * no Referer, fails only with ours) - the latter can never work on this
 * site no matter how many times it's retried, so it's treated as dead.
 */
async function checkUrlForEmbed(url: string): Promise<CheckResult> {
  const asEmbedded = await checkUrl(url, { Referer: SITE_URL });
  if (asEmbedded !== "rate-limited") return asEmbedded;

  await sleep(REQUEST_DELAY_MS);
  const direct = await checkUrl(url);
  if (direct === "live") return "dead"; // works direct, blocked only for us - permanent, not transient
  return asEmbedded;
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
    const result = await checkUrlForEmbed(url);
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
  let tripped = false;

  async function worker() {
    while (idx < rows.length && !tripped) {
      const row = rows[idx++];
      try {
        const result = await findDeadOrNull(row);
        // Checked before this result is trusted enough to act on - a
        // storm of false "dead" results (source CDN throttling this run)
        // must never reach the flush below, not even the batch already
        // in flight when it's detected.
        if (!tripped && done >= MIN_CHECKED_BEFORE_BREAKER && deadIds.length / done > DEAD_RATE_CIRCUIT_BREAKER) {
          tripped = true;
          console.error(
            `\nABORTING: ${deadIds.length}/${done} checked came back dead (>${Math.round(DEAD_RATE_CIRCUIT_BREAKER * 100)}%) - ` +
              `this is far above the normal <1% rate and much more likely to mean a source CDN is throttling/blocking this ` +
              `run's own requests than that this many listings genuinely delisted since the last check. Nothing was written. ` +
              `Verify a few of the reported-dead URLs by hand (a single direct fetch, not from this script) before re-running.`
          );
          break;
        }
        if (result === "dead") {
          deadIds.push(row.id);
          if (!DRY_RUN && !tripped) {
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

  if (tripped) {
    console.log(`\nStopped early at ${done}/${rows.length} checked. ${!DRY_RUN ? `${totalCleared} rows were cleared before the abort (from batches already flushed) - review those specifically.` : "Nothing was written (dry run)."}`);
    return;
  }

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
