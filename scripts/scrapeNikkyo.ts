import "dotenv/config";
import { scrapeNikkyoPage } from "@/lib/scrapers/nikkyo";
import { measureImageWidthPx } from "@/lib/scrapers/coverImage";
import { flushToD1, countVehicles, sleep, type PendingRow } from "./lib/d1Upsert";

/**
 * Pulls used cars straight from Nikkyo Cars' own stock site
 * (nikkyocars.com), 7-years-or-newer only, and upserts them into D1 with
 * sourceSite = "nikkyo" (keyed by externalId `nikkyo:<stockCode>`, so
 * re-runs refresh rather than duplicate).
 *
 * Unlike beforward/sbtjapan/dubicars, this walks one plain page=N sequence
 * across the whole catalogue - no per-make loop needed, since Nikkyo's own
 * list page already carries every field this catalogue uses (mileage,
 * engine, trans, shape, color, drive, doors, model code, steering, fuel,
 * seats, both the discounted and pre-discount C&F price) with no separate
 * detail-page fetch required.
 *
 * Usage:  npx tsx scripts/scrapeNikkyo.ts [count] [startPage]
 *   count      how many NEW cars to add before stopping   (default 50)
 *   startPage  first search-results page to read           (default 1)
 */

const WANT_NEW = process.argv[2] ? parseInt(process.argv[2], 10) : 50;
const START_PAGE = process.argv[3] ? parseInt(process.argv[3], 10) : 1;

const REQUEST_DELAY_MS = 1200;
const MAX_PAGES = 300; // hard safety cap (~7,500 listings scanned)
const MIN_SHARP_WIDTH_PX = 500; // same bar every other scraper uses
const FLUSH_EVERY = 25;
// Two consecutive genuinely-empty pages (not "every row filtered out by
// eligibility", an actual empty page) means the catalogue's real end was
// reached - one empty page alone isn't trusted, in case of a transient
// blip on that one request.
const EMPTY_PAGE_STOP = 2;
// Confirmed live: past roughly page 5 without a make filter, Nikkyo starts
// serving the exact same handful of listings on every subsequent page
// (a session-state quirk on their end, not a pagination-formula bug -
// shallow pages return genuinely distinct results). Tracking every
// externalId seen this run and stopping once a full page is 100% repeats
// (not just "no new stock today") avoids grinding through MAX_PAGES for
// nothing once that kicks in.
const DUPLICATE_PAGE_STOP = 2;

async function main() {
  const startCount = await countVehicles();
  console.log(`Nikkyo scrape - catalogue at ${startCount}, want ${WANT_NEW} new nikkyo cars, from page ${START_PAGE}.`);

  let pending: PendingRow[] = [];
  let addedThisRun = 0;
  let liveCount = startCount;
  let consecutiveEmpty = 0;
  let consecutiveDuplicatePages = 0;
  const seenIds = new Set<string>();

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

    let listed;
    try {
      listed = await scrapeNikkyoPage(page);
    } catch (err) {
      console.error(`[nikkyo] page ${page} failed:`, err instanceof Error ? err.message : err);
      await sleep(REQUEST_DELAY_MS * 3);
      continue;
    }

    if (listed.length === 0) {
      consecutiveEmpty++;
      console.log(`  page ${page}: empty (${consecutiveEmpty}/${EMPTY_PAGE_STOP})`);
      if (consecutiveEmpty >= EMPTY_PAGE_STOP) {
        console.log(`Reached the end of Nikkyo's stock at page ${page}.`);
        break;
      }
      await sleep(REQUEST_DELAY_MS);
      continue;
    }
    consecutiveEmpty = 0;

    const freshOnPage = listed.filter((v) => !seenIds.has(v.externalId));
    if (freshOnPage.length === 0) {
      consecutiveDuplicatePages++;
      console.log(`  page ${page}: ${listed.length} listings, all already seen this run (${consecutiveDuplicatePages}/${DUPLICATE_PAGE_STOP})`);
      if (consecutiveDuplicatePages >= DUPLICATE_PAGE_STOP) {
        console.log(`Stopping at page ${page} - Nikkyo is repeating the same listings past this point (a known session-state quirk, not the end of real stock). Try a later run to pick up further in.`);
        break;
      }
      await sleep(REQUEST_DELAY_MS);
      continue;
    }
    consecutiveDuplicatePages = 0;
    for (const v of listed) seenIds.add(v.externalId);
    console.log(`  page ${page}: ${listed.length} eligible (${freshOnPage.length} new)`);

    for (const v of freshOnPage) {
      const width = await measureImageWidthPx(v.imageUrl);
      if (width !== null && width < MIN_SHARP_WIDTH_PX) continue; // too small to look sharp on a card

      pending.push({ ...v, imageWidthPx: width });
      if (pending.length >= FLUSH_EVERY) await flush("batch full");
      if (addedThisRun + pending.length >= WANT_NEW) break;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  await flush("done");
  console.log(`\nDone. +${addedThisRun} new nikkyo cars this run. Catalogue ${startCount} -> ${liveCount}.`);
}

main();
