import "dotenv/config";
import { scrapeAutocomPage, scrapeAutocomDetail, AUTOCOM_PAGE_SIZE } from "@/lib/scrapers/autocom";
import { measureImageWidthPx } from "@/lib/scrapers/coverImage";
import { flushToD1, countVehicles, sleep, type PendingRow } from "./lib/d1Upsert";

/**
 * Pulls used cars straight from AUTOCOM JAPAN's own stock site
 * (autocj.co.jp), 2019+ only, and upserts them into D1 with
 * sourceSite = "autocom" (keyed by externalId `autocom:<refno>`, so
 * re-runs refresh rather than duplicate).
 *
 * Usage:  npx tsx scripts/scrapeAutocom.ts [count] [startPage]
 *   count      how many NEW cars to add before stopping   (default 50)
 *   startPage  first search-results page to read           (default 1)
 */

const WANT_NEW = process.argv[2] ? parseInt(process.argv[2], 10) : 50;
const START_PAGE = process.argv[3] ? parseInt(process.argv[3], 10) : 1;

const REQUEST_DELAY_MS = 1500;
const COOLDOWN_MS = 90_000;
const MAX_COOLDOWNS = 6;
const MAX_PAGES = 400; // hard safety cap (~10k listings scanned)
const MIN_SHARP_WIDTH_PX = 500; // same bar runScrape.ts uses for the nightly path
const FLUSH_EVERY = 25;

async function main() {
  const startCount = await countVehicles();
  console.log(`AUTOCOM scrape - catalogue at ${startCount}, want ${WANT_NEW} new autocom cars, from page ${START_PAGE}.`);

  let pending: PendingRow[] = [];
  let addedThisRun = 0;
  let liveCount = startCount;
  let cooldowns = 0;

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

  for (let page = START_PAGE; page < START_PAGE + MAX_PAGES; page++) {
    if (addedThisRun + pending.length >= WANT_NEW) break;

    const listed = await scrapeAutocomPage(page);
    if (listed === "rate-limited") {
      cooldowns++;
      if (cooldowns > MAX_COOLDOWNS) {
        console.log(`Rate-limited ${cooldowns}x - stopping. Resume: npx tsx scripts/scrapeAutocom.ts ${WANT_NEW} ${page}`);
        break;
      }
      console.log(`  page ${page}: rate limited - cooling ${COOLDOWN_MS / 1000}s (${cooldowns}/${MAX_COOLDOWNS})`);
      await sleep(COOLDOWN_MS);
      page--; // retry same page
      continue;
    }
    if (listed.length === 0) {
      console.log(`  page ${page}: no eligible listings`);
      await sleep(REQUEST_DELAY_MS);
      continue;
    }
    console.log(`  page ${page}: ${listed.length} eligible (of ${AUTOCOM_PAGE_SIZE})`);

    for (const v of listed) {
      // autocom.ts already knows the `-01.jpg` cover is 640px wide, so only
      // reach for a network measure when it didn't set one.
      const width = v.imageWidthPx ?? (await measureImageWidthPx(v.imageUrl));
      // null = measurement failed (keep it, unknown); a real number below the
      // bar = genuinely too small to look sharp on a card, so drop it.
      if (width !== null && width !== undefined && width < MIN_SHARP_WIDTH_PX) {
        continue;
      }
      // Detail page adds the full chassis/engine numbers (when the car has
      // them), doors, seats, dimensions and model code - the search feed has
      // none of that.
      const refno = v.externalId.replace(/^autocom:/, "");
      const specs = await scrapeAutocomDetail(refno);
      if (specs === "rate-limited") {
        cooldowns++;
        if (cooldowns > MAX_COOLDOWNS) {
          console.log(`Rate-limited on detail - stopping. Resume: npx tsx scripts/scrapeAutocom.ts ${WANT_NEW} ${page}`);
          await flush("rate-limit stop");
          console.log(`\nDone (rate-limit stop). Catalogue ${startCount} -> ${liveCount}.`);
          return;
        }
        console.log(`  detail ${refno}: rate limited - cooling ${COOLDOWN_MS / 1000}s (${cooldowns}/${MAX_COOLDOWNS})`);
        await sleep(COOLDOWN_MS);
      }
      const merged = specs === "rate-limited" ? v : { ...v, ...specs };
      pending.push({ ...merged, imageWidthPx: width ?? null });
      if (pending.length >= FLUSH_EVERY) await flush("batch full");
      if (addedThisRun + pending.length >= WANT_NEW) break;
      await sleep(REQUEST_DELAY_MS);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  await flush("done");
  console.log(`\nDone. +${addedThisRun} new autocom cars this run. Catalogue ${startCount} -> ${liveCount}.`);
}

main();
