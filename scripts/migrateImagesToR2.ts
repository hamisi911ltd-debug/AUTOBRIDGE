import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const execFileAsync = promisify(execFile);
const BUCKET = "autobridge-kenya-images";
const PUBLIC_BASE = "https://pub-3f28564543a14c3baf9726adee6196e6.r2.dev";
const CONCURRENCY = 8;

function extFromUrl(url: string): string {
  const match = url.match(/\.(jpe?g|png|webp)(\?|$)/i);
  return match ? match[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

async function migrateOne(vehicleId: string, imageUrl: string, tmpDir: string): Promise<string | null> {
  const res = await fetch(imageUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error("suspiciously small response, likely not a real image");

  const ext = extFromUrl(imageUrl);
  const key = `vehicles/${vehicleId}.${ext}`;
  const tmpFile = path.join(tmpDir, `${vehicleId}.${ext}`);
  await writeFile(tmpFile, buf);

  try {
    await execFileAsync("npx", ["wrangler", "r2", "object", "put", `${BUCKET}/${key}`, `--file=${tmpFile}`, "--remote"], {
      timeout: 60_000,
      shell: true,
    });
  } finally {
    await unlink(tmpFile).catch(() => {});
  }

  return `${PUBLIC_BASE}/${key}`;
}

async function main() {
  const vehicles = await prisma.vehicle.findMany({
    where: { imageUrl: { not: null, notIn: [] } },
    select: { id: true, imageUrl: true },
  });
  let toMigrate = vehicles.filter((v) => v.imageUrl && !v.imageUrl.startsWith(PUBLIC_BASE));
  const limitArg = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  if (limitArg) toMigrate = toMigrate.slice(0, limitArg);
  console.log(`Migrating ${toMigrate.length} of ${vehicles.length} images to R2...`);

  const tmpDir = await mkdtemp(path.join(tmpdir(), "r2-migrate-"));

  let done = 0;
  let failed = 0;
  let idx = 0;

  async function worker() {
    while (idx < toMigrate.length) {
      const v = toMigrate[idx++];
      try {
        const newUrl = await migrateOne(v.id, v.imageUrl!, tmpDir);
        if (newUrl) {
          await prisma.vehicle.update({ where: { id: v.id }, data: { imageUrl: newUrl } });
          done++;
        }
      } catch (err) {
        failed++;
        console.error(`[${v.id}] failed:`, err instanceof Error ? err.message : err);
      }
      if ((done + failed) % 50 === 0) {
        console.log(`Progress: ${done + failed}/${toMigrate.length} (${done} ok, ${failed} failed)`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(`Done. ${done} migrated, ${failed} failed.`);
  await prisma.$disconnect();
}

main();
