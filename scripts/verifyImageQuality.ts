import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);
const DATABASE = "autobridge-kenya-db";
const CONCURRENCY = 16;
const FLUSH_EVERY = 100;

type Row = { id: string; imageUrl: string };
type Result = { id: string; width: number };

/**
 * Which vehicles actually have a sharp cover photo vs. a low-res thumbnail
 * has been ambiguous from process history alone — some were upgraded by an
 * earlier one-off script, some by the gallery fetch, some never touched —
 * and those groups aren't reliably distinguishable from the DB. This
 * settles it directly: fetch every vehicle's *own* R2-hosted image (fast,
 * no external rate limits — it's our own CDN) and parse its real pixel
 * width from the JPEG SOF marker, then store that so getPublicVehicles can
 * filter on ground truth instead of a guess.
 */
async function fetchVehicleRows(): Promise<Row[]> {
  const sql = "SELECT id, imageUrl FROM Vehicle WHERE imageUrl IS NOT NULL";
  const { stdout } = await execFileAsync(
    "npx",
    ["wrangler", "d1", "execute", DATABASE, "--remote", "--json", "--command", `"${sql}"`],
    { shell: true, maxBuffer: 1024 * 1024 * 100 }
  );
  const parsed = JSON.parse(stdout);
  return parsed[0].results as Row[];
}

function jpegWidth(buf: Buffer): number | null {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) {
      return buf.readUInt16BE(i + 7);
    }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
}

async function measureOne(row: Row): Promise<Result | null> {
  const res = await fetch(row.imageUrl);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const width = jpegWidth(buf);
  return width ? { id: row.id, width } : null;
}

function sqlEscape(s: string): string {
  return s.replace(/'/g, "''");
}

async function flushResults(pending: Result[]): Promise<void> {
  if (pending.length === 0) return;
  const scratchDir = await mkdtemp(path.join(tmpdir(), "verify-sql-"));
  const statements = pending.map((r) => `UPDATE Vehicle SET imageWidthPx = ${r.width} WHERE id = '${sqlEscape(r.id)}';`);
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
  console.log("Fetching vehicle list from D1...");
  const rows = await fetchVehicleRows();
  console.log(`Measuring ${rows.length} images...`);

  let pending: Result[] = [];
  let totalUpdated = 0;
  let done = 0;
  let failed = 0;
  let idx = 0;
  let flushing: Promise<void> = Promise.resolve();

  async function worker() {
    while (idx < rows.length) {
      const row = rows[idx++];
      try {
        const result = await measureOne(row);
        if (result) {
          pending.push(result);
          if (pending.length >= FLUSH_EVERY) {
            const batch = pending;
            pending = [];
            flushing = flushing.then(() => flushResults(batch)).then(() => {
              totalUpdated += batch.length;
              console.log(`Flushed ${batch.length} (${totalUpdated} total so far).`);
            });
          }
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
        console.error(`[${row.id}] failed:`, err instanceof Error ? err.message : err);
      }
      done++;
      if (done % 100 === 0) console.log(`Progress: ${done}/${rows.length}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await flushing;
  await flushResults(pending);
  totalUpdated += pending.length;

  console.log(`Done. ${totalUpdated} vehicles measured, ${failed} failed.`);
}

main();
