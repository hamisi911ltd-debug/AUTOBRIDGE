import "dotenv/config";
import { scrapeBeforwardUnit, BEFORWARD_MAKES } from "@/lib/scrapers/beforward";
import { flushToD1, countVehicles, sleep, type PendingRow } from "./lib/d1Upsert";

/**
 * Broad, unfiltered BE FORWARD scrape - every make's own general stocklist,
 * page by page, in whatever order that stocklist actually serves cars in
 * (newest-first per BE FORWARD's own sort). Unlike scrapeKenyaPriority.ts /
 * scrapeOtherBrandsModels.ts (which target hand-picked popular models),
 * this doesn't filter to specific models at all - explicitly requested as
 * a faster, less curated pass.
 *
 * scrapeBeforwardUnit fetches all ~30 of a page's detail pages
 * *concurrently* (Promise.all) - confirmed fine for one page at a time,
 * but tripped BE FORWARD's rate limiter when hammered across many pages
 * back to back (see beforward.ts's own comment on this). REQUEST_DELAY_MS
 * is deliberately longer than the curated scripts' 2500ms specifically to
 * offset that extra per-page concurrency.
 *
 * Usage:  npx tsx scripts/scrapeBeforwardBroad.ts [count] [startMakeIndex] [startPage]
 */

const WANT_NEW = process.argv[2] ? parseInt(process.argv[2], 10) : 300;
const START_MAKE_INDEX = process.argv[3] ? parseInt(process.argv[3], 10) : 0;
const START_PAGE = process.argv[4] ? parseInt(process.argv[4], 10) : 1;

const REQUEST_DELAY_MS = 3500;
const MAX_PAGES_PER_MAKE = 20;
const FLUSH_EVERY = 30;

async function main() {
  const startCount = await countVehicles();
  console.log(`BE FORWARD broad scrape - catalogue at ${startCount}, want ${WANT_NEW} new, from make ${START_MAKE_INDEX} page ${START_PAGE}.`);

  let pending: PendingRow[] = [];
  let addedThisRun = 0;
  let liveCount = startCount;

  async function flush(reason: string) {
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    await flushToD1(batch);
    const before = liveCount;
    liveCount = await countVehicles();
    addedThisRun += Math.max(0, liveCount - before);
    console.log(`  flushed ${batch.length} (${reason}) - catalogue ${before} -> ${liveCount} (+${addedThisRun} new this run)`);
  }

  outer: for (let makeIdx = START_MAKE_INDEX; makeIdx < BEFORWARD_MAKES.length; makeIdx++) {
    const make = BEFORWARD_MAKES[makeIdx];
    console.log(`\n########## ${make.make} (index ${makeIdx}) ##########`);

    for (let page = makeIdx === START_MAKE_INDEX ? START_PAGE : 1; page <= MAX_PAGES_PER_MAKE; page++) {
      if (addedThisRun + pending.length >= WANT_NEW) break outer;

      const listed = await scrapeBeforwardUnit(makeIdx, page);
      if (listed.length === 0) {
        console.log(`  page ${page}: no listings - done with ${make.make}`);
        break;
      }
      console.log(`  page ${page}: ${listed.length} eligible`);

      for (const v of listed) {
        pending.push({ ...v, imageWidthPx: v.imageWidthPx ?? null });
        if (pending.length >= FLUSH_EVERY) await flush("batch full");
        if (addedThisRun + pending.length >= WANT_NEW) break;
      }

      await sleep(REQUEST_DELAY_MS);
    }
  }

  await flush("done");
  console.log(`\nDone. +${addedThisRun} new BE FORWARD cars this run. Catalogue ${startCount} -> ${liveCount}.`);
  console.log(`Resume with: npx tsx scripts/scrapeBeforwardBroad.ts ${WANT_NEW} <makeIndex> <page>`);
}

main();
