import "dotenv/config";
import { scrapeJpcListPage, scrapeJpcDetail } from "@/lib/scrapers/jpctrade";
import { measureImageWidthPx } from "@/lib/scrapers/coverImage";
import { flushToD1, countVehicles, sleep, type PendingRow } from "./lib/d1Upsert";

/**
 * Pulls used cars from JPC Trade's own stock site (jpctrade.com), scoped to
 * their Kenya-flagged stock, 2019+ only, and upserts them into D1 with
 * sourceSite = "jpctrade" (keyed by externalId `jpctrade:<id>`, so re-runs
 * refresh rather than duplicate).
 *
 * Usage:  npx tsx scripts/scrapeJpctrade.ts [count] [startPage] [country]
 *   count      how many NEW cars to add before stopping   (default 50)
 *   startPage  first stock-listing page to read             (default 1)
 *   country    JPC_COUNTRIES key                            (default "kenya")
 */

const WANT_NEW = process.argv[2] ? parseInt(process.argv[2], 10) : 50;
const START_PAGE = process.argv[3] ? parseInt(process.argv[3], 10) : 1;
const COUNTRY = process.argv[4] ?? "kenya";

const REQUEST_DELAY_MS = 1500;
const COOLDOWN_MS = 90_000;
const MAX_COOLDOWNS = 6;
const MAX_PAGES = 200;
const MIN_SHARP_WIDTH_PX = 500;
const FLUSH_EVERY = 25;

async function main() {
  const startCount = await countVehicles();
  console.log(`JPC Trade scrape - catalogue at ${startCount}, want ${WANT_NEW} new jpctrade cars, from page ${START_PAGE} (${COUNTRY}).`);

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

    const candidates = await scrapeJpcListPage(COUNTRY, page);
    if (candidates === "rate-limited") {
      cooldowns++;
      if (cooldowns > MAX_COOLDOWNS) {
        console.log(`Rate-limited ${cooldowns}x - stopping. Resume: npx tsx scripts/scrapeJpctrade.ts ${WANT_NEW} ${page} ${COUNTRY}`);
        break;
      }
      console.log(`  page ${page}: rate limited - cooling ${COOLDOWN_MS / 1000}s (${cooldowns}/${MAX_COOLDOWNS})`);
      await sleep(COOLDOWN_MS);
      page--;
      continue;
    }
    if (candidates.length === 0) {
      console.log(`  page ${page}: no listings (likely past the last page) - stopping`);
      break;
    }
    console.log(`  page ${page}: ${candidates.length} candidates`);

    for (const c of candidates) {
      const v = await scrapeJpcDetail(c.id, c.url);
      if (v === "rate-limited") {
        cooldowns++;
        if (cooldowns > MAX_COOLDOWNS) {
          console.log(`Rate-limited on detail - stopping. Resume: npx tsx scripts/scrapeJpctrade.ts ${WANT_NEW} ${page} ${COUNTRY}`);
          await flush("rate-limit stop");
          console.log(`\nDone (rate-limit stop). Catalogue ${startCount} -> ${liveCount}.`);
          return;
        }
        console.log(`  detail ${c.id}: rate limited - cooling ${COOLDOWN_MS / 1000}s (${cooldowns}/${MAX_COOLDOWNS})`);
        await sleep(COOLDOWN_MS);
        continue;
      }
      if (!v) {
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const width = await measureImageWidthPx(v.imageUrl);
      if (width !== null && width !== undefined && width < MIN_SHARP_WIDTH_PX) {
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      pending.push({ ...v, imageWidthPx: width ?? null });
      if (pending.length >= FLUSH_EVERY) await flush("batch full");
      if (addedThisRun + pending.length >= WANT_NEW) break;
      await sleep(REQUEST_DELAY_MS);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  await flush("done");
  console.log(`\nDone. +${addedThisRun} new jpctrade cars this run. Catalogue ${startCount} -> ${liveCount}.`);
}

main();
