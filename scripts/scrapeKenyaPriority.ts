import "dotenv/config";
import { scrapeBeforwardModelPage } from "@/lib/scrapers/beforward";
import { fetchCoverImage } from "@/lib/scrapers/coverImage";
import { flushToD1, countVehicles, sleep, type PendingRow } from "./lib/d1Upsert";

/**
 * Count-targeted, Kenya-demand-ordered BE FORWARD scrape.
 *
 * Unlike scrapeToyotaModels.ts / scrapeOtherBrandsModels.ts (which grind a
 * fixed page budget across the *whole* catalog), this walks only the models
 * Kenya buyers actually import, in descending order of real demand, and
 * stops the moment the live Vehicle count on D1 reaches TARGET_COUNT. So
 * "get the catalogue to N cars" is a bounded run, not an open-ended one.
 *
 * Usage:  npx tsx scripts/scrapeKenyaPriority.ts [targetCount] [startMakeIndex]
 * Default target 6800 (a "first pass" size — bump to 10000 for the full goal).
 *
 * Model IDs are the ones already verified live against beforward.jp's own
 * make=N model-filter dropdown in scrapeToyotaModels.ts and
 * scrapeOtherBrandsModels.ts — only demand-ranked differently here.
 */

const TARGET_COUNT = process.argv[2] ? parseInt(process.argv[2], 10) : 6800;
const START_MAKE_INDEX = process.argv[3] ? parseInt(process.argv[3], 10) : 0;
// Minutes to wait before the first request — lets a resumed run sit out
// BE FORWARD's rolling throttle window instead of burning its cooldown
// budget the moment it starts.
const INITIAL_WAIT_MIN = process.argv[4] ? parseInt(process.argv[4], 10) : 0;

const REQUEST_DELAY_MS = 2500; // gentler steady-state — 1.2s tripped BE FORWARD's limiter on a resumed run
const COOLDOWN_ON_429_MS = 120_000;
const MAX_429_COOLDOWNS = 10; // ~20 min of cooldown budget before giving up
const FLUSH_EVERY = 30;
const MAX_PAGES_PER_MODEL = 12; // 30 listings/page

type Make = { makeId: number; make: string; models: { id: number; name: string }[] };

/**
 * Ordered by how much each make/model actually moves as a used import into
 * Kenya (Toyota first and deepest, then the rest of the Japanese
 * mass-market). Within each make, the highest-volume Kenya models lead so a
 * short run spends its budget where it counts.
 */
const KENYA_PRIORITY: Make[] = [
  {
    makeId: 1,
    make: "Toyota",
    models: [
      // Newer models lead — the classic Kenya staples (Vitz/Fielder/Axio/
      // Probox) are now mostly pre-2019 and get filtered out at scrape time,
      // so the 2019+ stock that actually exists is concentrated here.
      { id: 13235, name: "Aqua" },
      { id: 245, name: "Sienta" },
      { id: 15633, name: "Roomy" },
      { id: 16315, name: "Raize" },
      { id: 181, name: "Harrier" },
      { id: 182, name: "Harrier Hybrid" },
      { id: 235, name: "Rav4" },
      { id: 1244, name: "Yaris" },
      { id: 16449, name: "Yaris Cross" },
      { id: 16487, name: "Corolla Cross" },
      { id: 16975, name: "Corolla Touring" },
      { id: 13850, name: "C-hr" },
      { id: 219, name: "Noah" },
      { id: 277, name: "Voxy" },
      { id: 102, name: "Alphard" },
      { id: 271, name: "Vellfire" },
      { id: 225, name: "Prius" },
      { id: 224, name: "Premio" },
      { id: 101, name: "Allion" },
      { id: 275, name: "Vitz" },
      { id: 134, name: "Corolla Fielder" },
      { id: 132, name: "Corolla Axio" },
      { id: 226, name: "Probox" },
      { id: 227, name: "Probox Van" },
      { id: 256, name: "Succeed" },
      { id: 257, name: "Succeed Van" },
      { id: 221, name: "Passo" },
      { id: 185, name: "Hiace Van" },
      { id: 282, name: "Wish" },
      { id: 233, name: "Ractis" },
      { id: 112, name: "Belta" },
      { id: 200, name: "Land Cruiser Prado" },
      { id: 198, name: "Land Cruiser" },
      { id: 212, name: "Mark X" },
      { id: 13848, name: "Corolla" },
      { id: 270, name: "Vanguard" },
      { id: 241, name: "Rush" },
      { id: 223, name: "Porte" },
      { id: 13396, name: "Spade" },
    ],
  },
  {
    makeId: 3,
    make: "Nissan",
    models: [
      { id: 425, name: "Note" },
      { id: 473, name: "X-trail" },
      { id: 450, name: "Serena" },
      { id: 416, name: "March" },
      { id: 384, name: "Cube" },
      { id: 390, name: "Elgrand" },
      { id: 453, name: "Skyline" },
      { id: 369, name: "Caravan Van" },
      { id: 15619, name: "Dayz" },
      { id: 13366, name: "Leaf" },
    ],
  },
  {
    makeId: 2,
    make: "Honda",
    models: [
      { id: 310, name: "Fit" },
      { id: 13305, name: "Fit Hybrid" },
      { id: 13546, name: "Vezel" },
      { id: 312, name: "Freed" },
      { id: 13324, name: "Freed Hybrid" },
      { id: 15563, name: "Shuttle" },
      { id: 303, name: "Cr-v" },
      { id: 340, name: "Step Wgn" },
      { id: 331, name: "Odyssey" },
      { id: 295, name: "Civic" },
    ],
  },
  {
    makeId: 4,
    make: "Mazda",
    models: [
      { id: 493, name: "Demio" },
      { id: 13002, name: "Axela Sport" },
      { id: 13365, name: "Cx-5" },
      { id: 13379, name: "Cx-3" },
      { id: 16123, name: "Cx-8" },
      { id: 16411, name: "Cx-30" },
      { id: 1375, name: "Mazda2" },
      { id: 1376, name: "Mazda3" },
      { id: 490, name: "Carol" },
    ],
  },
  {
    makeId: 94,
    make: "Subaru",
    models: [
      { id: 1057, name: "Impreza" },
      { id: 13304, name: "Impreza G4" },
      { id: 13306, name: "Impreza Sports" },
      { id: 16055, name: "Xv" },
      { id: 13510, name: "Impreza Xv" },
      { id: 1056, name: "Forester" },
      { id: 14264, name: "Levorg" },
      { id: 1063, name: "Legacy B4" },
      { id: 1064, name: "Legacy Touring Wagon" },
      { id: 1068, name: "Outback" },
    ],
  },
  {
    makeId: 5,
    make: "Mitsubishi",
    models: [
      { id: 599, name: "Outlander" },
      { id: 13394, name: "Outlander Phev" },
      { id: 546, name: "Delica D5" },
      { id: 15727, name: "Eclipse Cross" },
      { id: 594, name: "Mirage" },
      { id: 600, name: "Pajero" },
      { id: 560, name: "Ek Wagon" },
    ],
  },
  {
    makeId: 7,
    make: "Suzuki",
    models: [
      { id: 645, name: "Swift" },
      { id: 13388, name: "Solio" },
      { id: 16065, name: "Solio Bandit" },
      { id: 629, name: "Every" },
      { id: 632, name: "Every Wagon" },
      { id: 649, name: "Wagon R" },
      { id: 616, name: "Alto" },
      { id: 634, name: "Jimny" },
      { id: 14395, name: "Hustler" },
    ],
  },
];

async function main() {
  const startCount = await countVehicles();
  console.log(
    `Kenya-priority scrape — catalogue at ${startCount}, target ${TARGET_COUNT} ` +
      `(need ~${Math.max(0, TARGET_COUNT - startCount)} more). Starting at make index ${START_MAKE_INDEX}.`,
  );
  if (startCount >= TARGET_COUNT) {
    console.log("Already at or above target — nothing to do.");
    return;
  }

  if (INITIAL_WAIT_MIN > 0) {
    console.log(`Waiting ${INITIAL_WAIT_MIN} min for BE FORWARD's throttle window to clear before the first request...`);
    await sleep(INITIAL_WAIT_MIN * 60_000);
    console.log("Initial wait done — starting.");
  }

  let pending: PendingRow[] = [];
  let totalUpserted = 0;
  let totalFound = 0;
  let cooldowns = 0;
  let liveCount = startCount;

  async function flush(reason: string) {
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    await flushToD1(batch);
    totalUpserted += batch.length;
    liveCount = await countVehicles();
    console.log(`  flushed ${batch.length} (${reason}) — ${totalUpserted} upserted this run, catalogue now ${liveCount}`);
  }

  for (let m = START_MAKE_INDEX; m < KENYA_PRIORITY.length; m++) {
    const { makeId, make, models } = KENYA_PRIORITY[m];
    console.log(`\n########## ${make} (makeIndex ${m}) ##########`);

    for (const model of models) {
      if (liveCount + pending.length >= TARGET_COUNT) break;
      console.log(`\n=== ${make} ${model.name} (model=${model.id}) ===`);
      let page = 1;

      while (page <= MAX_PAGES_PER_MODEL) {
        const listed = await scrapeBeforwardModelPage(makeId, make, model.id, page);

        if (listed === "rate-limited") {
          cooldowns++;
          if (cooldowns > MAX_429_COOLDOWNS) {
            console.log(`Hit the rate limit ${cooldowns}x — stopping. Re-run: npx tsx scripts/scrapeKenyaPriority.ts ${TARGET_COUNT} ${m}`);
            await flush("rate-limit stop");
            console.log(`\nDone (rate-limit stop). ${totalUpserted} upserted, ${totalFound} found, catalogue ${liveCount}.`);
            return;
          }
          console.log(`  page ${page}: rate limited — cooling ${COOLDOWN_ON_429_MS / 1000}s (${cooldowns}/${MAX_429_COOLDOWNS})`);
          await sleep(COOLDOWN_ON_429_MS);
          continue;
        }

        if (listed.length === 0) {
          console.log(`  page ${page}: no listings — done with ${model.name}`);
          break;
        }
        console.log(`  page ${page}: ${listed.length} eligible listings`);
        totalFound += listed.length;

        for (const v of listed) {
          const better = await fetchCoverImage("beforward", v.sourceUrl);
          if (better === "rate-limited") {
            cooldowns++;
            if (cooldowns > MAX_429_COOLDOWNS) {
              console.log(`Hit the rate limit ${cooldowns}x — stopping. Re-run: npx tsx scripts/scrapeKenyaPriority.ts ${TARGET_COUNT} ${m}`);
              await flush("rate-limit stop");
              console.log(`\nDone (rate-limit stop). ${totalUpserted} upserted, ${totalFound} found, catalogue ${liveCount}.`);
              return;
            }
            console.log(`  rate limited — cooling ${COOLDOWN_ON_429_MS / 1000}s (${cooldowns}/${MAX_429_COOLDOWNS})`);
            await sleep(COOLDOWN_ON_429_MS);
            continue;
          }

          const row: PendingRow = { ...v, imageWidthPx: better ? better.widthPx : null };
          if (better) row.imageUrl = better.url;
          pending.push(row);

          if (pending.length >= FLUSH_EVERY) await flush("batch full");
          if (liveCount + pending.length >= TARGET_COUNT) break;
          await sleep(REQUEST_DELAY_MS);
        }

        if (liveCount + pending.length >= TARGET_COUNT) {
          console.log(`\nReached target (${TARGET_COUNT}).`);
          await flush("target reached");
          console.log(`\nDone. ${totalUpserted} upserted this run, ${totalFound} found, catalogue ${liveCount}.`);
          return;
        }

        page++;
        await sleep(REQUEST_DELAY_MS);
      }
    }
  }

  await flush("end of priority list");
  console.log(
    `\nDone — exhausted the Kenya-priority model list. ${totalUpserted} upserted this run, ` +
      `${totalFound} found, catalogue ${liveCount} (target was ${TARGET_COUNT}).`,
  );
}

main();
