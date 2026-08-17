import "dotenv/config";
import { scrapeBeforwardModelPage } from "@/lib/scrapers/beforward";
import { fetchCoverImage } from "@/lib/scrapers/coverImage";
import { flushToD1, sleep, type PendingRow } from "./lib/d1Upsert";

const REQUEST_DELAY_MS = 1200;
const COOLDOWN_ON_429_MS = 45_000;
const MAX_429_COOLDOWNS = 4;
const FLUSH_EVERY = 30;
const MAX_PAGES_PER_MODEL = 12; // 30 listings/page — bumped from 8: several brands (Honda/Mazda/Subaru/Mitsubishi/Suzuki) stayed under 300 total after a full pass at depth 8, so real per-model stock needs more pages, not more models

/**
 * Same deep-dive approach as scrapeToyotaModels.ts, generalized across the
 * rest of Kenya's popular import brands. Model IDs and stock volumes pulled
 * live from each brand's own beforward.jp/stocklist/make=<id> model filter
 * dropdown, same as the Toyota list — top ~18 models per brand by listed
 * stock, which is what actually drives BE FORWARD's own count, not a
 * hand-picked guess at what's "typically Kenyan".
 *
 * Deliberately run as its own process rather than merged into the Toyota
 * script or launched alongside it — same BE FORWARD site, same rate-limit
 * budget, so this should only run once the Toyota deep-dive isn't also
 * hitting BE FORWARD concurrently.
 */
const BRANDS: { makeId: number; makeName: string; models: { id: number; name: string }[] }[] = [
  {
    makeId: 3,
    makeName: "Nissan",
    models: [
      { id: 450, name: "Serena" },
      { id: 425, name: "Note" },
      { id: 15619, name: "Dayz" },
      { id: 13855, name: "Roox" },
      { id: 473, name: "X-trail" },
      { id: 15620, name: "Dayz Roox" },
      { id: 369, name: "Caravan Van" },
      { id: 381, name: "Clipper Van" },
      { id: 421, name: "Moco" },
      { id: 390, name: "Elgrand" },
      { id: 453, name: "Skyline" },
      { id: 13366, name: "Leaf" },
      { id: 16522, name: "Aura" },
      { id: 394, name: "Fairlady Z" },
      { id: 416, name: "March" },
      { id: 380, name: "Clipper Truck" },
      { id: 384, name: "Cube" },
      { id: 356, name: "Atlas" },
    ],
  },
  {
    makeId: 2,
    makeName: "Honda",
    models: [
      { id: 13250, name: "N Box" },
      { id: 13546, name: "Vezel" },
      { id: 13861, name: "N-wgn" },
      { id: 340, name: "Step Wgn" },
      { id: 15782, name: "N-one" },
      { id: 312, name: "Freed" },
      { id: 310, name: "Fit" },
      { id: 16472, name: "N Box Custom" },
      { id: 331, name: "Odyssey" },
      { id: 13324, name: "Freed Hybrid" },
      { id: 295, name: "Civic" },
      { id: 13305, name: "Fit Hybrid" },
      { id: 16516, name: "N-van" },
      { id: 15563, name: "Shuttle" },
      { id: 324, name: "Life" },
      { id: 303, name: "Cr-v" },
      { id: 284, name: "Accord" },
      { id: 288, name: "Acty Truck" },
    ],
  },
  {
    makeId: 4,
    makeName: "Mazda",
    models: [
      { id: 13365, name: "Cx-5" },
      { id: 493, name: "Demio" },
      { id: 519, name: "Roadster" },
      { id: 16123, name: "Cx-8" },
      { id: 13379, name: "Cx-3" },
      { id: 15570, name: "Flair Wagon" },
      { id: 1376, name: "Mazda3" },
      { id: 15638, name: "Flair" },
      { id: 528, name: "Titan" },
      { id: 15948, name: "Flair Crossover" },
      { id: 16865, name: "Cx-60" },
      { id: 16411, name: "Cx-30" },
      { id: 1375, name: "Mazda2" },
      { id: 490, name: "Carol" },
      { id: 13002, name: "Axela Sport" },
      { id: 521, name: "Rx-8" },
      { id: 484, name: "Bongo Truck" },
      { id: 485, name: "Bongo Van" },
    ],
  },
  {
    makeId: 94,
    makeName: "Subaru",
    models: [
      { id: 1056, name: "Forester" },
      { id: 14264, name: "Levorg" },
      { id: 13306, name: "Impreza Sports" },
      { id: 16055, name: "Xv" },
      { id: 1073, name: "Stella" },
      { id: 13236, name: "Sambar Truck" },
      { id: 1064, name: "Legacy Touring Wagon" },
      { id: 1075, name: "Sambar" },
      { id: 1057, name: "Impreza" },
      { id: 13368, name: "Brz" },
      { id: 1063, name: "Legacy B4" },
      { id: 1068, name: "Outback" },
      { id: 16122, name: "Wrx S4" },
      { id: 13304, name: "Impreza G4" },
      { id: 15614, name: "Pleo Plus" },
      { id: 1055, name: "Exiga" },
      { id: 13510, name: "Impreza Xv" },
      { id: 1060, name: "Impreza Wrx" },
    ],
  },
  {
    makeId: 5,
    makeName: "Mitsubishi",
    models: [
      { id: 536, name: "Canter" },
      { id: 546, name: "Delica D5" },
      { id: 562, name: "Fighter" },
      { id: 560, name: "Ek Wagon" },
      { id: 16995, name: "Delica Mini" },
      { id: 1350, name: "Super Great" },
      { id: 15665, name: "Ek Space" },
      { id: 13394, name: "Outlander Phev" },
      { id: 13300, name: "Delica D2" },
      { id: 593, name: "Minicab Truck" },
      { id: 600, name: "Pajero" },
      { id: 603, name: "Pajero Mini" },
      { id: 613, name: "Triton" },
      { id: 1330, name: "Minicab Van" },
      { id: 15566, name: "Ek Custom" },
      { id: 15727, name: "Eclipse Cross" },
      { id: 599, name: "Outlander" },
      { id: 594, name: "Mirage" },
    ],
  },
  {
    makeId: 7,
    makeName: "Suzuki",
    models: [
      { id: 13831, name: "Spacia" },
      { id: 14395, name: "Hustler" },
      { id: 649, name: "Wagon R" },
      { id: 634, name: "Jimny" },
      { id: 616, name: "Alto" },
      { id: 629, name: "Every" },
      { id: 640, name: "Lapin" },
      { id: 620, name: "Carry Truck" },
      { id: 645, name: "Swift" },
      { id: 632, name: "Every Wagon" },
      { id: 13388, name: "Solio" },
      { id: 17241, name: "Jimny Nomade" },
      { id: 16065, name: "Solio Bandit" },
      { id: 636, name: "Jimny Sierra" },
      { id: 15938, name: "X Bee" },
      { id: 643, name: "Palette" },
      { id: 642, name: "Mr Wagon" },
      { id: 617, name: "Alto Works" },
    ],
  },
  {
    makeId: 8,
    makeName: "Isuzu",
    models: [
      { id: 663, name: "Elf Truck" },
      { id: 1427, name: "Forward" },
      { id: 1425, name: "D-max" },
      { id: 1430, name: "Giga" },
      { id: 17233, name: "Mu-x" },
      { id: 1439, name: "Juston" },
      { id: 658, name: "Bighorn" },
      { id: 15693, name: "Gala" },
      { id: 13503, name: "Galamio" },
      { id: 673, name: "Gemini" },
      { id: 676, name: "Mu" },
      { id: 655, name: "117 Coupe" },
      { id: 660, name: "Como" },
      { id: 665, name: "Elf Van" },
      { id: 678, name: "Rodeo" },
      { id: 679, name: "Vehicross" },
      { id: 680, name: "Wizard" },
      { id: 15687, name: "Forward Juston" },
    ],
  },
  {
    makeId: 83,
    makeName: "BMW",
    models: [
      { id: 1035, name: "5 Series" },
      { id: 1041, name: "Mini" },
      { id: 1033, name: "3 Series" },
      { id: 1044, name: "X3" },
      { id: 1037, name: "7 Series" },
      { id: 1045, name: "X5" },
      { id: 1032, name: "1 Series" },
      { id: 13288, name: "X1" },
      { id: 13553, name: "2 Series" },
      { id: 13551, name: "4 Series" },
      { id: 1622, name: "X6" },
      { id: 1036, name: "6 Series" },
      { id: 15699, name: "X4" },
      { id: 16397, name: "X7" },
      { id: 1042, name: "Mini Clubman" },
    ],
  },
  {
    makeId: 106,
    makeName: "Mercedes-Benz",
    models: [
      { id: 1107, name: "E-class" },
      { id: 1114, name: "S-class" },
      { id: 1103, name: "C-class" },
      { id: 16058, name: "Glc-class" },
      { id: 15668, name: "Gle-class" },
      { id: 1101, name: "A-class" },
      { id: 1108, name: "G-class" },
      { id: 1106, name: "Cls-class" },
      { id: 13587, name: "Cla-class" },
      { id: 15621, name: "Gla-class" },
      { id: 16414, name: "Glb- Class" },
      { id: 16199, name: "Actros" },
      { id: 1102, name: "B-class" },
      { id: 16412, name: "Gls Class" },
      { id: 1120, name: "V-class" },
    ],
  },
  {
    makeId: 48,
    makeName: "Volkswagen",
    models: [
      { id: 1688, name: "Tiguan" },
      { id: 773, name: "Golf" },
      { id: 13605, name: "The Beetle" },
      { id: 783, name: "Polo" },
      { id: 787, name: "Touareg" },
      { id: 778, name: "Jetta" },
      { id: 16674, name: "Arteon" },
      { id: 16434, name: "T-roc" },
      { id: 781, name: "Passat" },
      { id: 16433, name: "T-cross" },
      { id: 776, name: "Golf Variant" },
      { id: 13841, name: "Up!" },
      { id: 14429, name: "Cc" },
      { id: 780, name: "New Beetle" },
      { id: 775, name: "Golf Touran" },
    ],
  },
  {
    makeId: 68,
    makeName: "Lexus",
    models: [
      { id: 13545, name: "Nx" },
      { id: 2601, name: "Rx" },
      { id: 2599, name: "Ls" },
      { id: 2116, name: "Is" },
      { id: 2598, name: "Es" },
      { id: 2114, name: "Gs" },
      { id: 16500, name: "Ux" },
      { id: 13417, name: "Ct" },
      { id: 2600, name: "Lx" },
      { id: 16120, name: "Rc" },
      { id: 13263, name: "Hs" },
      { id: 17313, name: "Lbx" },
      { id: 16121, name: "Rc F" },
      { id: 2118, name: "Sc" },
      { id: 17301, name: "Gx" },
    ],
  },
  {
    makeId: 10,
    makeName: "Daihatsu",
    models: [
      { id: 719, name: "Tanto" },
      { id: 708, name: "Move" },
      { id: 15784, name: "Move Canbus" },
      { id: 13826, name: "Mira Es" },
      { id: 699, name: "Hijet Truck" },
      { id: 697, name: "Hijet Cargo" },
      { id: 16494, name: "Taft" },
      { id: 15627, name: "Cast" },
      { id: 15603, name: "Mira Cocoa" },
      { id: 690, name: "Copen" },
      { id: 16124, name: "Wake" },
      { id: 720, name: "Tanto Custom" },
      { id: 703, name: "Mira" },
      { id: 707, name: "Miragino" },
      { id: 709, name: "Move Conte" },
    ],
  },
  {
    makeId: 47,
    makeName: "Audi",
    models: [
      { id: 750, name: "A6" },
      { id: 749, name: "A4" },
      { id: 13314, name: "Q5" },
      { id: 1639, name: "A5" },
      { id: 15700, name: "A7" },
      { id: 757, name: "Q7" },
      { id: 748, name: "A3" },
      { id: 752, name: "A8" },
      { id: 13400, name: "Q3" },
      { id: 765, name: "Tt" },
      { id: 16390, name: "Q8" },
      { id: 13389, name: "A1" },
      { id: 15702, name: "Q2" },
      { id: 16389, name: "E- Tron" },
      { id: 13550, name: "Sq5" },
    ],
  },
  {
    makeId: 205,
    makeName: "Jeep",
    models: [
      { id: 1173, name: "Wrangler" },
      { id: 16317, name: "Renegade" },
      { id: 1165, name: "Grand Cherokee" },
      { id: 1164, name: "Compass" },
      { id: 1159, name: "Cherokee" },
      { id: 1163, name: "Commander" },
      { id: 17099, name: "Gladiator" },
      { id: 1170, name: "Patriot" },
      { id: 17384, name: "Avenger" },
      { id: 1172, name: "Wagoneer" },
    ],
  },
  {
    makeId: 109,
    makeName: "Citroen",
    models: [
      { id: 1708, name: "C3" },
      { id: 15611, name: "Ds3" },
      { id: 2540, name: "Berlingo" },
      { id: 1710, name: "C4" },
      { id: 1712, name: "C5" },
      { id: 1711, name: "C4 Picasso" },
      { id: 17054, name: "Grand C4 Picasso" },
      { id: 17106, name: "C3 Aircross" },
      { id: 16028, name: "Ds4" },
      { id: 17090, name: "C4 Cactus" },
      { id: 1713, name: "C6" },
      { id: 16364, name: "Ds5" },
      { id: 17203, name: "Ds7" },
      { id: 1722, name: "Xm" },
      { id: 1704, name: "2cv" },
      { id: 1706, name: "Bx" },
      { id: 1721, name: "Xantia" },
      { id: 1705, name: "Ax" },
      { id: 1707, name: "C2" },
      { id: 17234, name: "Ds3 Crossback" },
    ],
  },
];

async function main() {
  const startBrandIndex = process.argv[2] ? parseInt(process.argv[2], 10) : 0;
  // Optional end index (exclusive) so a targeted re-pass can skip brands
  // already deep-scraped in an earlier run instead of wastefully redoing them.
  const endBrandIndex = process.argv[3] ? parseInt(process.argv[3], 10) : BRANDS.length;
  const brands = BRANDS.slice(startBrandIndex, endBrandIndex);
  console.log(`Starting at brand index ${startBrandIndex} (${brands[0]?.makeName ?? "end of list"}), ${brands.length} of ${BRANDS.length} brands queued.`);

  let pending: PendingRow[] = [];
  let totalUpserted = 0;
  let totalFound = 0;
  let cooldowns = 0;

  for (const brand of brands) {
    console.log(`\n########## ${brand.makeName} ##########`);

    for (const model of brand.models) {
      console.log(`\n=== ${brand.makeName} ${model.name} (model=${model.id}) ===`);
      let page = 1;

      while (page <= MAX_PAGES_PER_MODEL) {
        const listed = await scrapeBeforwardModelPage(brand.makeId, brand.makeName, model.id, page);

        if (listed === "rate-limited") {
          cooldowns++;
          if (cooldowns > MAX_429_COOLDOWNS) {
            console.log(`Hit the rate limit ${cooldowns} times — stopping this run. Re-run later to continue from ${brand.makeName} ${model.name}.`);
            await flushToD1(pending);
            totalUpserted += pending.length;
            console.log(`\nDone (rate-limit stop). ${totalUpserted} vehicles upserted, ${totalFound} total found.`);
            return;
          }
          console.log(`  page ${page}: rate limited — cooling down ${COOLDOWN_ON_429_MS / 1000}s (${cooldowns}/${MAX_429_COOLDOWNS})...`);
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
              console.log(`Hit the rate limit ${cooldowns} times — stopping this run. Re-run later to continue from ${brand.makeName} ${model.name}.`);
              await flushToD1(pending);
              totalUpserted += pending.length;
              console.log(`\nDone (rate-limit stop). ${totalUpserted} vehicles upserted, ${totalFound} total found.`);
              return;
            }
            console.log(`  rate limited — cooling down ${COOLDOWN_ON_429_MS / 1000}s (${cooldowns}/${MAX_429_COOLDOWNS})...`);
            await sleep(COOLDOWN_ON_429_MS);
            continue;
          }

          const row: PendingRow = { ...v, imageWidthPx: better ? better.widthPx : null };
          if (better) row.imageUrl = better.url;
          pending.push(row);

          if (pending.length >= FLUSH_EVERY) {
            const batch = pending;
            pending = [];
            await flushToD1(batch);
            totalUpserted += batch.length;
            console.log(`  flushed ${batch.length} (${totalUpserted} total upserted so far)`);
          }
          await sleep(REQUEST_DELAY_MS);
        }

        page++;
        await sleep(REQUEST_DELAY_MS);
      }
    }
  }

  await flushToD1(pending);
  totalUpserted += pending.length;
  console.log(`\nDone. ${totalUpserted} vehicles upserted across ${BRANDS.length} brands, ${totalFound} total found.`);
}

main();
