import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
// @ts-expect-error -- no @types/better-sqlite3 installed; this is a local-only script, not app code
import Database from "better-sqlite3";

const execFileAsync = promisify(execFile);
const DATABASE = "autobridge-kenya-db";

/**
 * Next.js prerenders the homepage at build time using the local dev.db
 * fallback (see src/lib/prisma.ts), not live D1 — so a build run right after
 * a scrape batch would still ship the pre-batch vehicle count until ISR
 * catches up. This pulls every Vehicle row from remote D1 and replaces the
 * local dev.db copy so `next build` prerenders against current data.
 *
 * Writes via better-sqlite3 directly rather than the generated Prisma
 * client: the schema's generator is pinned to `runtime = "workerd"` for the
 * deployed D1 adapter, and that wasm-engine client fails to load outside an
 * actual workerd process ("wasm module unexpectedly undefined") — raw SQL
 * against the same file sidesteps that entirely.
 */
async function fetchRemoteVehicles(): Promise<Record<string, unknown>[]> {
  const { stdout } = await execFileAsync(
    "npx",
    ["wrangler", "d1", "execute", DATABASE, "--remote", "--json", "--command", `"SELECT * FROM Vehicle"`],
    { shell: true, maxBuffer: 1024 * 1024 * 200 }
  );
  const parsed = JSON.parse(stdout);
  return parsed[0].results as Record<string, unknown>[];
}

const COLUMNS = [
  "id", "make", "model", "trim", "year", "mileageKm", "fuel", "transmission", "engineCc",
  "bodyType", "drive", "seats", "color", "sourceCountry", "sourcePriceUsd", "freightIncluded", "imageUrl",
  "imageUrls", "imageWidthPx", "condition", "badge", "lifestyle", "eligible", "ineligibleReason",
  "sourceSite", "externalId", "sourceUrl", "lastScrapedAt", "createdAt", "updatedAt",
];

async function main() {
  console.log("Fetching all vehicles from remote D1...");
  const rows = await fetchRemoteVehicles();
  console.log(`Fetched ${rows.length} rows. Writing to local dev.db...`);

  const dbPath = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");
  const db = new Database(dbPath);

  const insert = db.prepare(
    `INSERT INTO Vehicle (${COLUMNS.map((c) => `"${c}"`).join(", ")}) VALUES (${COLUMNS.map((c) => `@${c}`).join(", ")})`
  );

  const writeAll = db.transaction((data: Record<string, unknown>[]) => {
    db.prepare(`DELETE FROM Vehicle`).run();
    for (const row of data) insert.run(row);
  });

  writeAll(rows);

  const count = (db.prepare(`SELECT COUNT(*) as c FROM Vehicle`).get() as { c: number }).c;
  console.log(`Done. Local dev.db now has ${count} vehicles.`);
  db.close();
}

main();
