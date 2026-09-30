-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "galleryChecked" BOOLEAN NOT NULL DEFAULT true;

-- Existing BE FORWARD / DELIGHTS rows without a gallery predate gallery
-- extraction and genuinely haven't been checked yet - reset just those so
-- the admin "Fetch more photos" backfill has real work queued.
UPDATE "Vehicle" SET "galleryChecked" = false WHERE "sourceSite" IN ('beforward', 'delights') AND "sourceUrl" IS NOT NULL AND ("imageUrls" IS NULL OR "imageUrls" = '[]');
