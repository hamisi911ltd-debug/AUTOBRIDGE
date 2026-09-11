import { NextResponse } from "next/server";
import { migrateImageBatch } from "@/lib/imageMigration";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function checkAuth(req: Request): boolean {
  const secret = req.headers.get("x-cron-secret");
  // Deliberately its own secret, not CRON_SECRET - that one belongs to the
  // separately-deployed scrape cron-worker, and rotating it to test this
  // route would silently break its nightly schedule.
  return !!process.env.IMAGE_MIGRATION_SECRET && secret === process.env.IMAGE_MIGRATION_SECRET;
}

/**
 * Same shared-secret pattern as /api/cron/scrape-vehicles, its own secret.
 * Runs one small batch of the R2 image migration (see
 * src/lib/imageMigration.ts) per call - an external scheduler hitting this
 * repeatedly (or the admin "Migrate images to R2" button looping
 * client-side) is what actually gets through the whole catalogue over time.
 */
export async function POST(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await migrateImageBatch();
  return NextResponse.json(result);
}
