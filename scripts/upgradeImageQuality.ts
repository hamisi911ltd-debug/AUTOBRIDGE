import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);
const BUCKET = "autobridge-kenya-images";
const DATABASE = "autobridge-kenya-db";
const PUBLIC_BASE = "https://pub-3f28564543a14c3baf9726adee6196e6.r2.dev";
const CONCURRENCY = 6;
const USER_AGENT = "Mozilla/5.0 (compatible; AutoBridgeKenyaBot/1.0; image quality backfill)";

type Row = { id: string; sourceSite: string; sourceUrl: string; imageUrl: string };

/**
 * The bulk R2 migration earlier this session copied whatever imageUrl each
 * vehicle had at scrape time — which for most of the catalog was a small
 * listing-page thumbnail (roughly 300x225, sometimes as low as 200px wide),
 * not the full-size photo the source site actually displays. This re-fetches
 * each vehicle's detail page, pulls the real large/original photo URL, and
 * overwrites the existing R2 object *in place* (same key the DB already
 * points at) — so no D1 write is needed, just a better file at the same URL.
 */
async function fetchVehicleRows(): Promise<Row[]> {
  // shell:true (needed on Windows to resolve npx.cmd) joins the args array
  // into a single command line without proper per-arg quoting, so a
  // multi-word --command value gets split apart by cmd.exe unless it's
  // pre-quoted here.
  const sql =
    "SELECT id, sourceSite, sourceUrl, imageUrl FROM Vehicle WHERE sourceSite IS NOT NULL AND sourceUrl IS NOT NULL AND imageUrl IS NOT NULL";
  const { stdout } = await execFileAsync(
    "npx",
    ["wrangler", "d1", "execute", DATABASE, "--remote", "--json", "--command", `"${sql}"`],
    { shell: true, maxBuffer: 1024 * 1024 * 100 }
  );
  const parsed = JSON.parse(stdout);
  return parsed[0].results as Row[];
}

async function extractBestImageUrl(site: string, detailUrl: string): Promise<string | null> {
  const res = await fetch(detailUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;
  const html = await res.text();

  if (site === "beforward") {
    // Listing pages only expose a capped ~medium thumbnail; the detail
    // page's gallery has real large/ and original/ variants under a
    // different filename hash than the thumbnail — large/ (640x480) is the
    // sweet spot for a web card, original/ (2500px+) is overkill.
    const match = html.match(/https?:\/\/image-cdn\.beforward\.jp\/large\/[^\s"'<>]+\.jpe?g/i);
    return match ? match[0] : null;
  }

  if (site === "sbtjapan") {
    // SBT's img.sbtjapan.com serves a real resize service via ?imwidth= on
    // the same URL — the listing thumbnail just requests a small width.
    const match = html.match(/https?:\/\/img\.sbtjapan\.com\/img\/carphoto\/[^\s"'<>]+\.jpe?g/i);
    if (!match) return null;
    const url = new URL(match[0]);
    url.searchParams.set("imwidth", "1200");
    return url.toString();
  }

  return null;
}

async function upgradeOne(row: Row, tmpDir: string): Promise<boolean> {
  const bestUrl = await extractBestImageUrl(row.sourceSite, row.sourceUrl);
  if (!bestUrl) return false;

  const res = await fetch(bestUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error("suspiciously small response, likely not a real image");

  // Reuse the exact key already stored in imageUrl (not a key re-derived
  // from bestUrl's extension) so the existing DB row keeps pointing at the
  // right object without needing a D1 write.
  const key = row.imageUrl.replace(`${PUBLIC_BASE}/`, "");
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

  return true;
}

async function main() {
  console.log("Fetching vehicle list from D1...");
  const rows = await fetchVehicleRows();
  const limitArg = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  const toProcess = limitArg ? rows.slice(0, limitArg) : rows;
  console.log(`Upgrading images for ${toProcess.length} of ${rows.length} vehicles...`);

  const tmpDir = await mkdtemp(path.join(tmpdir(), "img-upgrade-"));
  let done = 0;
  let upgraded = 0;
  let skipped = 0;
  let failed = 0;
  let idx = 0;

  async function worker() {
    while (idx < toProcess.length) {
      const row = toProcess[idx++];
      try {
        const ok = await upgradeOne(row, tmpDir);
        if (ok) upgraded++;
        else skipped++;
      } catch (err) {
        failed++;
        console.error(`[${row.id}] failed:`, err instanceof Error ? err.message : err);
      }
      done++;
      if (done % 25 === 0) {
        console.log(`Progress: ${done}/${toProcess.length} (${upgraded} upgraded, ${skipped} skipped, ${failed} failed)`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(`Done. ${upgraded} upgraded, ${skipped} skipped (no better image found), ${failed} failed.`);
}

main();
