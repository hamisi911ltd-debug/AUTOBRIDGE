import "dotenv/config";
import { fetchBeforwardDetail } from "@/lib/scrapers/coverImage";
import { scrapeAutocomDetail } from "@/lib/scrapers/autocom";
import { flushToD1, queryRows, sleep, type PendingRow } from "./lib/d1Upsert";

/**
 * Fills in the extended spec sheet - chassis no., model code, doors,
 * steering, dimensions, etc. - for existing rows that don't have it yet.
 * Two situations created this backlog:
 *
 *  1. Every bulk scrape script (scrapeToyotaModels.ts and friends) wrote
 *     through flushToD1, which silently dropped the spec columns entirely
 *     until it was fixed - see "Persist the full spec sheet on bulk
 *     scrapes". Rows written before that fix have nothing in these columns
 *     even though the detail page was fetched at the time.
 *  2. The 20 AUTOCOM rows were written before AUTOCOM's own detail-page
 *     enrichment existed.
 *
 * Re-fetches each affected row's own detail page and updates via flushToD1,
 * which only FILLS these columns (COALESCE - never blanks a value that's
 * already there), so this is safe to re-run and safe to stop/resume anytime.
 *
 * Not every field can reach 100%: BE FORWARD itself only publishes an
 * engine number on a minority of listings, and AUTOCOM often has neither a
 * chassis nor engine number on file - those stay blank because the source
 * genuinely doesn't have the data, not because this script failed.
 *
 * Usage: npx tsx scripts/backfillSpecs.ts [batchLimit]
 *   batchLimit   how many rows to process before stopping (default 300)
 */

const LIMIT = process.argv[2] ? parseInt(process.argv[2], 10) : 300;
const REQUEST_DELAY_MS = 1200;
const COOLDOWN_MS = 90_000;
const MAX_COOLDOWNS = 6;
const FLUSH_EVERY = 25;
const BATCH_SIZE = 40; // rows fetched from D1 per query - keeps each read cheap

type Row = {
  sourceSite: string;
  externalId: string;
  sourceUrl: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  mileageKm: number;
  fuel: string;
  transmission: string;
  engineCc: number;
  bodyType: string;
  drive: string;
  seats: number;
  color: string;
  sourceCountry: string;
  sourcePriceUsd: number;
  freightIncluded: number;
  imageUrl: string | null;
  imageWidthPx: number | null;
};

const MISSING_SPEC_WHERE =
  "(chassisNo IS NULL OR modelCode IS NULL OR doors IS NULL OR steering IS NULL OR dimensions IS NULL)";

async function nextBatch(): Promise<Row[]> {
  return queryRows<Row>(
    `SELECT sourceSite, externalId, sourceUrl, make, model, trim, year, mileageKm, fuel, transmission, engineCc, ` +
      `bodyType, drive, seats, color, sourceCountry, sourcePriceUsd, freightIncluded, imageUrl, imageWidthPx ` +
      `FROM Vehicle WHERE sourceSite IN ('beforward','autocom') AND ${MISSING_SPEC_WHERE} LIMIT ${BATCH_SIZE}`,
  );
}

function toPendingRow(row: Row): PendingRow {
  return {
    sourceSite: row.sourceSite as PendingRow["sourceSite"],
    externalId: row.externalId,
    sourceUrl: row.sourceUrl,
    make: row.make,
    model: row.model,
    trim: row.trim,
    year: row.year,
    mileageKm: row.mileageKm,
    fuel: row.fuel,
    transmission: row.transmission,
    engineCc: row.engineCc,
    bodyType: row.bodyType,
    drive: row.drive,
    seats: row.seats,
    color: row.color,
    sourceCountry: row.sourceCountry,
    sourcePriceUsd: row.sourcePriceUsd,
    freightIncluded: !!row.freightIncluded,
    imageUrl: row.imageUrl,
    imageWidthPx: row.imageWidthPx,
  };
}

async function main() {
  let processed = 0;
  let filled = 0;
  let cooldowns = 0;
  let pending: PendingRow[] = [];

  async function flush() {
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    await flushToD1(batch);
    filled += batch.length;
    console.log(`  flushed ${batch.length} (${filled} filled so far)`);
  }

  while (processed < LIMIT) {
    const batch = await nextBatch();
    if (batch.length === 0) {
      console.log("No more rows missing spec fields.");
      break;
    }
    console.log(`\nBatch of ${batch.length} (processed ${processed}/${LIMIT} so far)`);

    for (const row of batch) {
      if (processed >= LIMIT) break;
      processed++;
      const refno = row.externalId.split(":")[1] ?? "";

      if (row.sourceSite === "beforward") {
        const detail = await fetchBeforwardDetail("beforward", row.sourceUrl);
        if (detail === "rate-limited") {
          cooldowns++;
          if (cooldowns > MAX_COOLDOWNS) {
            console.log(`Rate-limited ${cooldowns}x - stopping. Re-run scripts/backfillSpecs.ts to continue (same WHERE picks up where this left off).`);
            await flush();
            console.log(`\nDone (rate-limit stop). Processed ${processed}, filled ${filled}.`);
            return;
          }
          console.log(`  ${row.externalId}: rate limited - cooling ${COOLDOWN_MS / 1000}s (${cooldowns}/${MAX_COOLDOWNS})`);
          await sleep(COOLDOWN_MS);
          processed--; // this one didn't actually get processed - retry it next pass
          continue;
        }
        if (detail) {
          const merged = toPendingRow(row);
          Object.assign(merged, detail.specs);
          if (detail.image) {
            merged.imageUrl = detail.image.url;
            merged.imageWidthPx = detail.image.widthPx;
          }
          pending.push(merged);
        }
      } else if (row.sourceSite === "autocom") {
        const specs = await scrapeAutocomDetail(refno);
        if (specs === "rate-limited") {
          cooldowns++;
          if (cooldowns > MAX_COOLDOWNS) {
            console.log(`Rate-limited ${cooldowns}x - stopping. Re-run scripts/backfillSpecs.ts to continue.`);
            await flush();
            console.log(`\nDone (rate-limit stop). Processed ${processed}, filled ${filled}.`);
            return;
          }
          console.log(`  ${row.externalId}: rate limited - cooling ${COOLDOWN_MS / 1000}s (${cooldowns}/${MAX_COOLDOWNS})`);
          await sleep(COOLDOWN_MS);
          processed--;
          continue;
        }
        pending.push({ ...toPendingRow(row), ...specs });
      }

      if (pending.length >= FLUSH_EVERY) await flush();
      await sleep(REQUEST_DELAY_MS);
    }
  }

  await flush();
  console.log(`\nDone. Processed ${processed} rows, ${filled} updated.`);
}

main();
