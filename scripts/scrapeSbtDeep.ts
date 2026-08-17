import "dotenv/config";
import { SBT_MAKES, scrapeSbtJapanUnit } from "@/lib/scrapers/sbtJapan";
import { measureImageWidthPx } from "@/lib/scrapers/coverImage";
import { flushToD1, sleep, type PendingRow } from "./lib/d1Upsert";

const PAGE_DELAY_MS = 800;
const IMAGE_MEASURE_DELAY_MS = 250;
const FLUSH_EVERY = 30;
const MAX_PAGES_PER_MAKE = 40; // dug much deeper per make — SBT's own thumbnails are already good quality, so depth here is cheap volume
const COOLDOWN_ON_429_MS = 45_000;
const MAX_429_COOLDOWNS = 4;

/**
 * Runs alongside scrapeToyotaModels.ts (BE FORWARD), not instead of it — a
 * different domain means a separate rate-limit bucket, so the two make
 * genuinely parallel progress rather than competing for the same budget.
 * SBT's listing photo is already a real ?imwidth=1200 URL (no detail-page
 * fetch needed, see sbtJapan.ts), so this only needs a cheap ranged fetch
 * per vehicle to measure width for the public site's quality gate.
 */
async function main() {
  const startIndex = process.argv[2] ? parseInt(process.argv[2], 10) : 0;
  console.log(`Starting at make index ${startIndex} (${SBT_MAKES[startIndex]?.make ?? "end of list"}), ${SBT_MAKES.length - startIndex} of ${SBT_MAKES.length} makes queued.`);

  let pending: PendingRow[] = [];
  let totalUpserted = 0;
  let totalFound = 0;
  let cooldowns = 0;

  for (let makeIndex = startIndex; makeIndex < SBT_MAKES.length; makeIndex++) {
    const make = SBT_MAKES[makeIndex].make;
    console.log(`\n=== ${make} ===`);

    let page = 1;
    while (page <= MAX_PAGES_PER_MAKE) {
      const listed = await scrapeSbtJapanUnit(makeIndex, page);

      if (listed === "rate-limited") {
        cooldowns++;
        if (cooldowns > MAX_429_COOLDOWNS) {
          console.log(`Hit the rate limit ${cooldowns} times — stopping this run. Re-run later to continue from ${make}.`);
          await flushToD1(pending);
          totalUpserted += pending.length;
          console.log(`\nDone (rate-limit stop). ${totalUpserted} vehicles upserted, ${totalFound} total found.`);
          return;
        }
        console.log(`  page ${page}: rate limited — cooling down ${COOLDOWN_ON_429_MS / 1000}s (${cooldowns}/${MAX_429_COOLDOWNS})...`);
        await sleep(COOLDOWN_ON_429_MS);
        continue; // retry this same page
      }

      if (listed.length === 0) {
        console.log(`  page ${page}: no listings — done with ${make}`);
        break;
      }
      console.log(`  page ${page}: ${listed.length} eligible listings`);
      totalFound += listed.length;

      for (const v of listed) {
        const widthPx = await measureImageWidthPx(v.imageUrl);
        pending.push({ ...v, imageWidthPx: widthPx });

        if (pending.length >= FLUSH_EVERY) {
          const batch = pending;
          pending = [];
          await flushToD1(batch);
          totalUpserted += batch.length;
          console.log(`  flushed ${batch.length} (${totalUpserted} total upserted so far)`);
        }
        await sleep(IMAGE_MEASURE_DELAY_MS);
      }

      page++;
      await sleep(PAGE_DELAY_MS);
    }
  }

  await flushToD1(pending);
  totalUpserted += pending.length;
  console.log(`\nDone. ${totalUpserted} vehicles upserted across ${SBT_MAKES.length} makes, ${totalFound} total found.`);
}

main();
