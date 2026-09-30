import { prisma } from "@/lib/prisma";
import { fetchBeforwardDetail } from "@/lib/scrapers/coverImage";
import { fetchDelightsVehicle } from "@/lib/scrapers/delights";

// Small on purpose, same reasoning as migrateImageBatch: one batch per
// admin-button click-loop iteration, kept well inside Cloudflare Workers'
// per-request CPU/subrequest budget. Each vehicle here costs one detail-
// page fetch (BE FORWARD also measures the resulting cover photo's width).
const BATCH_SIZE = 5;

// Only the sources whose own detail-page fetch has actually been checked to
// carry more than one real photo of the car (see beforward.ts, delights.ts)
// - every other source either has no per-vehicle detail fetch at all, or
// (confirmed live for JPC Trade) genuinely only ever has the one photo, so
// re-fetching wouldn't find anything a backfill run could add.
const GALLERY_CAPABLE_SOURCES = ["beforward", "delights"] as const;

export type GalleryBackfillResult = {
  processed: number;
  updated: number;
  errors: number;
  remaining: number;
  done: boolean;
};

/**
 * Re-fetches one small batch of already-scraped vehicles' own detail pages
 * and fills in a real multi-photo gallery where one wasn't captured the
 * first time (see beforward.ts/delights.ts, wired into scraping going
 * forward - this is for vehicles already in the catalogue from before that
 * existed, or scraped from a source that only sometimes returns a gallery).
 * Single-photo vehicles that stay single-photo (source genuinely only has
 * the one shot) are still marked processed so a repeat click doesn't keep
 * re-fetching them forever.
 */
export async function fetchMoreImagesBatch(): Promise<GalleryBackfillResult> {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      sourceSite: { in: [...GALLERY_CAPABLE_SOURCES] },
      sourceUrl: { not: null },
      galleryChecked: false,
    },
    orderBy: { createdAt: "desc" },
    take: BATCH_SIZE,
    select: { id: true, sourceSite: true, sourceUrl: true, imageUrl: true, imageMigrated: true },
  });

  if (vehicles.length === 0) {
    return { processed: 0, updated: 0, errors: 0, remaining: 0, done: true };
  }

  let updated = 0;
  let errors = 0;

  await Promise.all(
    vehicles.map(async (v) => {
      try {
        let gallery: string[] = [];
        let newCoverUrl: string | null = null;
        let newCoverWidthPx: number | null = null;

        if (v.sourceSite === "beforward") {
          const detail = await fetchBeforwardDetail("beforward", v.sourceUrl!);
          if (detail && detail !== "rate-limited") {
            gallery = detail.gallery;
            if (detail.image) {
              newCoverUrl = detail.image.url;
              newCoverWidthPx = detail.image.widthPx;
            }
          }
        } else if (v.sourceSite === "delights") {
          const scraped = await fetchDelightsVehicle(v.sourceUrl!);
          if (scraped?.imageUrls) gallery = scraped.imageUrls;
        }

        const data: { galleryChecked: boolean; imageUrls?: string; imageUrl?: string; imageWidthPx?: number; imageMigrated?: boolean } = {
          galleryChecked: true,
        };
        if (gallery.length > 1) {
          data.imageUrls = JSON.stringify(gallery);
          if (newCoverUrl) {
            data.imageUrl = newCoverUrl;
            if (newCoverWidthPx) data.imageWidthPx = newCoverWidthPx;
          }
          // The extra photos just found are still sitting on the source
          // site's own CDN, not yet in our R2 bucket - clear the migrated
          // flag so "Migrate images to R2" picks this vehicle back up and
          // copies all of them over, not just the original cover.
          if (v.imageMigrated) data.imageMigrated = false;
          updated++;
        }

        await prisma.vehicle.update({ where: { id: v.id }, data });
      } catch (err) {
        errors++;
        console.error(`[fetchMoreImagesBatch] failed for ${v.id}:`, err);
        // Still mark checked - a permanently-unreachable detail page would
        // otherwise block this vehicle from ever leaving the batch.
        await prisma.vehicle.update({ where: { id: v.id }, data: { galleryChecked: true } }).catch(() => {});
      }
    })
  );

  const remaining = await prisma.vehicle.count({
    where: { sourceSite: { in: [...GALLERY_CAPABLE_SOURCES] }, sourceUrl: { not: null }, galleryChecked: false },
  });

  return { processed: vehicles.length, updated, errors, remaining, done: remaining === 0 };
}
