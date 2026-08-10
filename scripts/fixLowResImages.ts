import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fetchCoverImage } from "@/lib/scrapers/coverImage";

const execFileAsync = promisify(execFile);
const DATABASE = "autobridge-kenya-db";
const CONCURRENCY = 6;
const FLUSH_EVERY = 40;

type Row = { id: string; sourceUrl: string };
type Result = { id: string; url: string; widthPx: number };

/**
 * Vehicles whose cover photo is still under the quality bar despite the
 * live scraper's detail-page fix (see coverImage.ts) — mostly rows that
 * scrolled off page 1 of the source site's listing before the fix was
 * deployed, so the normal per-page scrape never revisits them again. Their
 * detail page is still live (just not linked from page 1 anymore), so the
 * same fetchCoverImage logic the live scraper now uses works fine here too,
 * run locally as a one-off sweep instead of waiting for them to naturally
 * resurface.
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

async function main() {
  console.log("Fetching low-res beforward vehicles from D1...");
  const rows = await fetchLowResRows();
  console.log(`Attempting to upgrade ${rows.length} vehicles...`);

  let pending: Result[] = [];
  let totalUpdated = 0;
  let done = 0;
  let upgraded = 0;
  let skipped = 0;
  let idx = 0;
  let flushing: Promise<void> = Promise.resolve();

  async function worker() {
    while (idx < rows.length) {
      const row = rows[idx++];
      const better = await fetchCoverImage("beforward", row.sourceUrl);
      if (better && better.widthPx >= 500) {
        pending.push({ id: row.id, url: better.url, widthPx: better.widthPx });
        upgraded++;
        if (pending.length >= FLUSH_EVERY) {
          const batch = pending;
          pending = [];
          flushing = flushing.then(() => flushResults(batch)).then(() => {
            totalUpdated += batch.length;
            console.log(`Flushed ${batch.length} (${totalUpdated} total so far).`);
          });
        }
      } else {
        skipped++;
      }
      done++;
      if (done % 25 === 0) console.log(`Progress: ${done}/${rows.length} (${upgraded} upgraded, ${skipped} skipped)`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await flushing;
  await flushResults(pending);
  totalUpdated += pending.length;

  console.log(`Done. ${totalUpdated} vehicles upgraded to a sharp photo, ${skipped} skipped (listing gone or still no better photo available).`);
}

main();
