import { getCloudflareContext } from "@opennextjs/cloudflare";
import { prisma } from "@/lib/prisma";

// Small on purpose — Cloudflare Workers' free-tier CPU budget is 10ms per
// request (same constraint documented on the scraper), so the looping
// across the whole catalogue happens in the caller (an admin button click
// per batch, same pattern as "Run scrape now"), not in one giant request
// here. Each vehicle can carry up to 5 photos, so 3 vehicles is already up
// to 15 outbound fetches + R2 writes per call.
const BATCH_SIZE = 3;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- R2Bucket type comes from @cloudflare/workers-types, not worth pulling in just for this cast (same convention as src/lib/prisma.ts)
type CloudflareEnv = { VEHICLE_IMAGES?: any };

export type ImageMigrationResult = {
  processed: number;
  migrated: number;
  errors: number;
  remaining: number;
  done: boolean;
};

/**
 * Copies one small batch of vehicles' photos out of the source sites' own
 * CDNs (image-cdn.beforward.jp, img.sbtjapan.com, dubicars.com — third-party
 * services with no speed or uptime guarantee) into our own VEHICLE_IMAGES R2
 * bucket, then rewrites imageUrl/imageUrls to point at
 * /api/vehicle-image/... so the public site serves photos from Cloudflare's
 * own network instead of hotlinking them forever.
 */
export async function migrateImageBatch(): Promise<ImageMigrationResult> {
  const { env } = getCloudflareContext() as { env: CloudflareEnv };
  const bucket = env.VEHICLE_IMAGES;
  if (!bucket) throw new Error("VEHICLE_IMAGES R2 binding not available");

  // Newest-first — this had no ordering before, so it was working through
  // the catalogue in arbitrary DB order while the homepage/search only ever
  // show the newest slice. That made the migration's real progress mostly
  // invisible: it could be well underway while every vehicle an actual
  // visitor saw was still unmigrated. Matching the same recency order the
  // public site itself uses means visible speed-up shows up almost
  // immediately instead of only once the whole run finishes.
  const vehicles = await prisma.vehicle.findMany({
    where: { imageMigrated: false, imageUrl: { not: null } },
    orderBy: { createdAt: "desc" },
    take: BATCH_SIZE,
    select: { id: true, imageUrl: true, imageUrls: true },
  });

  if (vehicles.length === 0) {
    return { processed: 0, migrated: 0, errors: 0, remaining: 0, done: true };
  }

  let migrated = 0;
  let errors = 0;

  for (const v of vehicles) {
    try {
      const sourceUrls: string[] = v.imageUrls ? (JSON.parse(v.imageUrls) as string[]) : v.imageUrl ? [v.imageUrl] : [];
      const newUrls: string[] = [];

      for (let i = 0; i < sourceUrls.length; i++) {
        const src = sourceUrls[i];
        // Already pointing at our own storage from an earlier partial run.
        if (src.startsWith("/api/vehicle-image/")) {
          newUrls.push(src);
          continue;
        }
        const res = await fetch(src);
        if (!res.ok) continue;
        const contentType = res.headers.get("content-type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : "jpg";
        const key = `vehicles/${v.id}/${i}.${ext}`;
        await bucket.put(key, res.body, { httpMetadata: { contentType } });
        newUrls.push(`/api/vehicle-image/${key}`);
      }

      await prisma.vehicle.update({
        where: { id: v.id },
        data: {
          imageMigrated: true,
          ...(newUrls.length > 0 ? { imageUrl: newUrls[0], imageUrls: JSON.stringify(newUrls) } : {}),
        },
      });
      if (newUrls.length > 0) migrated++;
    } catch {
      errors++;
      // Still mark migrated — a permanently-dead source URL would otherwise
      // block this vehicle from ever leaving the batch, stalling the whole run.
      await prisma.vehicle.update({ where: { id: v.id }, data: { imageMigrated: true } }).catch(() => {});
    }
  }

  const remaining = await prisma.vehicle.count({ where: { imageMigrated: false, imageUrl: { not: null } } });
  return { processed: vehicles.length, migrated, errors, remaining, done: remaining === 0 };
}
