import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

const execFileAsync = promisify(execFile);
const BUCKET = "autobridge-kenya-images";
const DATABASE = "autobridge-kenya-db";
const PUBLIC_BASE = "https://pub-3f28564543a14c3baf9726adee6196e6.r2.dev";
const VEHICLE_CONCURRENCY = 4;
const IMAGES_PER_VEHICLE = 5;
const FLUSH_EVERY = 40;
const USER_AGENT = "Mozilla/5.0 (compatible; AutoBridgeKenyaBot/1.0; image gallery backfill)";

type Row = { id: string; sourceSite: string; sourceUrl: string };
type Result = { id: string; urls: string[] };

/**
 * Each vehicle so far has only ever had a single cover photo. This fetches
 * every vehicle's detail page and pulls up to 5 real gallery photos (the
 * source sites' own listing pages only expose one thumbnail; the full
 * gallery lives on the detail page), uploads each to its own R2 key, and
 * writes the resulting URLs back to imageUrl + imageUrls in small batches as
 * it goes (not just at the end) so a kill/crash partway through doesn't lose
 * already-uploaded work. Supersedes the earlier single-cover-image
 * backfill — this gets a better cover photo too, since it's just
 * imageUrls[0]. The 5 photos for a given vehicle upload in parallel, not
 * sequentially — sequential was the bottleneck in the first version of this
 * script (each wrangler r2 put spawns its own process, ~1-3s overhead each).
 */
async function fetchVehicleRows(): Promise<Row[]> {
  // REDO_EXISTING=1 re-processes only vehicles that already have a gallery
  // (used after a script fix, to correct previously-written results without
  // re-running the full catalog).
  const onlyExisting = process.env.REDO_EXISTING === "1";
  const sql = `SELECT id, sourceSite, sourceUrl FROM Vehicle WHERE sourceSite IS NOT NULL AND sourceUrl IS NOT NULL AND imageUrl IS NOT NULL${onlyExisting ? " AND imageUrls IS NOT NULL" : ""}`;
  const { stdout } = await execFileAsync(
    "npx",
    ["wrangler", "d1", "execute", DATABASE, "--remote", "--json", "--command", `"${sql}"`],
    { shell: true, maxBuffer: 1024 * 1024 * 100 }
  );
  const parsed = JSON.parse(stdout);
  return parsed[0].results as Row[];
}

async function extractGalleryUrls(site: string, detailUrl: string): Promise<string[]> {
  const res = await fetch(detailUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return [];
  const html = await res.text();

  if (site === "beforward") {
    const matches = html.match(/https?:\/\/image-cdn\.beforward\.jp\/large\/[^\s"'<>]+\.jpe?g/gi) ?? [];
    return [...new Set(matches)].slice(0, IMAGES_PER_VEHICLE);
  }

  if (site === "sbtjapan") {
    const matches = html.match(/https?:\/\/img\.sbtjapan\.com\/img\/carphoto\/[^\s"'<>]+\.jpe?g/gi) ?? [];
    const unique = [...new Set(matches)].slice(0, IMAGES_PER_VEHICLE);
    return unique.map((m) => {
      const url = new URL(m);
      url.searchParams.set("imwidth", "1200");
      return url.toString();
    });
  }

  return [];
}

async function downloadImage(imageUrl: string): Promise<Buffer> {
  const res = await fetch(imageUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error("suspiciously small response, likely not a real image");
  return buf;
}

async function uploadImage(buf: Buffer, key: string, tmpDir: string): Promise<void> {
  const tmpFile = path.join(tmpDir, key.replace(/\//g, "_"));
  await writeFile(tmpFile, buf);
  try {
    await execFileAsync("npx", ["wrangler", "r2", "object", "put", `${BUCKET}/${key}`, `--file=${tmpFile}`, "--remote"], {
      timeout: 60_000,
      shell: true,
    });
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}

async function processOne(row: Row, tmpDir: string): Promise<Result | null> {
  const galleryUrls = await extractGalleryUrls(row.sourceSite, row.sourceUrl);
  if (galleryUrls.length === 0) return null;

  const downloads = await Promise.all(
    galleryUrls.map(async (imageUrl) => {
      try {
        return await downloadImage(imageUrl);
      } catch (err) {
        console.error(`  [${row.id}] download failed:`, err instanceof Error ? err.message : err);
        return null;
      }
    })
  );

  // Some listings (mostly SBT) alias the same single real photo across
  // every numbered gallery slot when they don't actually have more than
  // one photo — dedupe by content hash so the "gallery" doesn't just
  // slide between 5 copies of the same picture.
  const seenHashes = new Set<string>();
  const uniqueBuffers: Buffer[] = [];
  for (const buf of downloads) {
    if (!buf) continue;
    const hash = createHash("md5").update(buf).digest("hex");
    if (seenHashes.has(hash)) continue;
    seenHashes.add(hash);
    uniqueBuffers.push(buf);
  }

  const uploads = await Promise.all(
    uniqueBuffers.map(async (buf, i) => {
      const key = `vehicles/${row.id}/${i}.jpg`;
      try {
        await uploadImage(buf, key, tmpDir);
        return `${PUBLIC_BASE}/${key}`;
      } catch (err) {
        console.error(`  [${row.id}] upload ${i} failed:`, err instanceof Error ? err.message : err);
        return null;
      }
    })
  );

  const publicUrls = uploads.filter((u): u is string => u !== null);
  return publicUrls.length > 0 ? { id: row.id, urls: publicUrls } : null;
}

function sqlEscape(s: string): string {
  return s.replace(/'/g, "''");
}

async function flushResults(pending: Result[]): Promise<void> {
  if (pending.length === 0) return;
  const scratchDir = await mkdtemp(path.join(tmpdir(), "gallery-sql-"));
  const statements = pending.map((r) => {
    const imageUrl = sqlEscape(r.urls[0]);
    const imageUrls = sqlEscape(JSON.stringify(r.urls));
    return `UPDATE Vehicle SET imageUrl = '${imageUrl}', imageUrls = '${imageUrls}' WHERE id = '${r.id}';`;
  });
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
  const limitArg = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  const toProcess = limitArg ? rows.slice(0, limitArg) : rows;
  console.log(`Fetching galleries for ${toProcess.length} of ${rows.length} vehicles...`);

  const tmpDir = await mkdtemp(path.join(tmpdir(), "gallery-img-"));
  let pending: Result[] = [];
  let totalUpdated = 0;
  let totalPhotos = 0;
  let done = 0;
  let found = 0;
  let skipped = 0;
  let idx = 0;
  let flushing: Promise<void> = Promise.resolve();

  async function worker() {
    while (idx < toProcess.length) {
      const row = toProcess[idx++];
      try {
        const result = await processOne(row, tmpDir);
        if (result) {
          pending.push(result);
          found++;
          if (pending.length >= FLUSH_EVERY) {
            const batch = pending;
            pending = [];
            // Chain flushes so overlapping workers never race two `d1 execute --file` calls at once.
            flushing = flushing.then(() => flushResults(batch)).then(() => {
              totalUpdated += batch.length;
              totalPhotos += batch.reduce((sum, r) => sum + r.urls.length, 0);
              console.log(`Flushed ${batch.length} vehicles to D1 (${totalUpdated} total so far).`);
            });
          }
        } else {
          skipped++;
        }
      } catch (err) {
        skipped++;
        console.error(`[${row.id}] failed:`, err instanceof Error ? err.message : err);
      }
      done++;
      if (done % 25 === 0) {
        console.log(`Progress: ${done}/${toProcess.length} (${found} found, ${skipped} skipped)`);
      }
    }
  }

  await Promise.all(Array.from({ length: VEHICLE_CONCURRENCY }, () => worker()));
  await flushing;
  await flushResults(pending);
  totalUpdated += pending.length;
  totalPhotos += pending.reduce((sum, r) => sum + r.urls.length, 0);

  console.log(`Done. ${totalUpdated} vehicles updated, ${totalPhotos} total photos uploaded, ${skipped} skipped (no live listing found).`);
}

main();
