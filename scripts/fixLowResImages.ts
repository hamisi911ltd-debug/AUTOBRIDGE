import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fetchCoverImage } from "@/lib/scrapers/coverImage";

const execFileAsync = promisify(execFile);
const DATABASE = "autobridge-kenya-db";
const REQUEST_DELAY_MS = 1200;
const COOLDOWN_ON_429_MS = 45_000;
const MAX_429_COOLDOWNS = 4;
const FLUSH_EVERY = 40;

type Row = { id: string; sourceUrl: string };
type Result = { id: string; url: string; widthPx: number };

/**
 * Vehicles whose cover photo is still under the quality bar despite the
 * live scraper's detail-page fix (see coverImage.ts) — mostly rows that
 * scrolled off page 1 of the source site's listing before the fix was
 * deployed, so the normal per-page scrape never revisits them again.
 *
 * Runs strictly sequential with a fixed delay between requests (not
 * concurrent workers) — a first pass at concurrency 6, then even at 2, both
 * tripped BE FORWARD's rate limiter. One request at a time, paced, is what
 * actually gets through without hammering the site.
 */
async function fetchLowResRows(): Promise<Row[]> {
  const sql =
    "SELECT id, sourceUrl FROM Vehicle WHERE sourceSite = 'beforward' AND sourceUrl IS NOT NULL AND (imageWidthPx IS NULL OR imageWidthPx < 500)";
  const { stdout } = await execFileAsync(
    "npx",
    ["wrangler", "d1", "execute", DATABASE, "--remote", "--json", "--command", `"${sql}"`],
    { shell: true, maxBuffer: 1024 * 1024 * 100 }
  );
  const parsed = JSON.parse(stdout);
  return parsed[0].results as Row[];
}

function sqlEscape(s: string): string {
  return s.replace(/'/g, "''");
}

async function flushResults(pending: Result[]): Promise<void> {
  if (pending.length === 0) return;
  const scratchDir = await mkdtemp(path.join(tmpdir(), "fixres-sql-"));
  const statements = pending.map(
    (r) => `UPDATE Vehicle SET imageUrl = '${sqlEscape(r.url)}', imageWidthPx = ${r.widthPx} WHERE id = '${r.id}';`
  );
  const file = path.join(scratchDir, "chunk.sql");
  await writeFile(file, statements.join("\n"));

  await execFileAsync("npx", ["wrangler", "d1", "execute", DATABASE, "--remote", `--file=${file}`], {
    shell: true,
    timeout: 120_000,
    maxBuffer: 1024 * 1024 * 20,
  });
  await unlink(file).catch(() => {});
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("Fetching low-res beforward vehicles from D1...");
  const rows = await fetchLowResRows();
  const limitArg = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  const toProcess = limitArg ? rows.slice(0, limitArg) : rows;
  console.log(`Attempting to upgrade ${toProcess.length} of ${rows.length} remaining low-res vehicles...`);

  let pending: Result[] = [];
  let totalUpdated = 0;
  let upgraded = 0;
  let skipped = 0;
  let rateLimited = 0;
  let cooldowns = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const row = toProcess[i];
    const better = await fetchCoverImage("beforward", row.sourceUrl);

    if (better === "rate-limited") {
      rateLimited++;
      cooldowns++;
      if (cooldowns > MAX_429_COOLDOWNS) {
        console.log(`Hit the rate limit ${cooldowns} times — stopping this run rather than pushing through. Re-run the script later to pick up where this left off.`);
        break;
      }
      console.log(`Rate limited at ${i}/${toProcess.length} — cooling down ${COOLDOWN_ON_429_MS / 1000}s (${cooldowns}/${MAX_429_COOLDOWNS})...`);
      await sleep(COOLDOWN_ON_429_MS);
      i--; // retry this same row after cooling down
      continue;
    }

    if (better && better.widthPx >= 500) {
      pending.push({ id: row.id, url: better.url, widthPx: better.widthPx });
      upgraded++;
      if (pending.length >= FLUSH_EVERY) {
        const batch = pending;
        pending = [];
        await flushResults(batch);
        totalUpdated += batch.length;
        console.log(`Flushed ${batch.length} (${totalUpdated} total so far).`);
      }
    } else {
      skipped++;
    }

    if ((i + 1) % 25 === 0) console.log(`Progress: ${i + 1}/${toProcess.length} (${upgraded} upgraded, ${skipped} skipped, ${rateLimited} rate-limited retries)`);
    await sleep(REQUEST_DELAY_MS);
  }

  await flushResults(pending);
  totalUpdated += pending.length;

  console.log(`Done. ${totalUpdated} vehicles upgraded to a sharp photo, ${skipped} genuinely skipped (listing gone), ${rows.length - toProcess.length} left untouched for the next batch.`);
}

main();
