import "dotenv/config";
import { scrapeBeforwardModelPage } from "@/lib/scrapers/beforward";
import { fetchCoverImage } from "@/lib/scrapers/coverImage";
import { flushToD1, sleep, type PendingRow } from "./lib/d1Upsert";

const REQUEST_DELAY_MS = 1200;
const COOLDOWN_ON_429_MS = 45_000;
const MAX_429_COOLDOWNS = 4;
const FLUSH_EVERY = 30;
const MAX_PAGES_PER_MODEL = 15; // bumped from 10 — Jaguar/Hino still short of 500 after a full pass at depth 10

/**
 * Brands that were sitting well under 500 vehicles with no active scrape
 * queue — Ford, Volvo, Hyundai, Peugeot, Land Rover, Jaguar, Hino. Small
 * catalogs (Land Rover, Jaguar, Peugeot, Hino) get their FULL model list
 * since there aren't many to begin with; bigger ones (Hyundai, Volvo, Ford)
 * get a generous top slice by real BE FORWARD stock volume.
 */
const BRANDS: { makeId: number; makeName: string; models: { id: number; name: string }[] }[] = [
  // Volvo, Jaguar, Hino ordered first — confirmed via SQL that SBT Japan
  // sources these almost entirely through the dealer network that
  // cleanSbtImage() correctly filters (100% null imageUrl for Volvo/Jaguar
  // on SBT), so BE FORWARD is the only real path to more visible stock for
  // these three; they get priority over Ford/Hyundai/Peugeot/Land Rover,
  // which weren't below the 500 target.
  {
    makeId: 57,
    makeName: "Volvo",
    models: [
      { id: 13311, name: "Xc60" },
      { id: 15564, name: "V60" },
      { id: 16436, name: "Xc40" },
      { id: 885, name: "Xc90" },
      { id: 880, name: "V40" },
      { id: 879, name: "S90" },
      { id: 876, name: "S60" },
      { id: 883, name: "V90" },
      { id: 16242, name: "Fm" },
      { id: 16227, name: "Fh" },
      { id: 882, name: "V70" },
      { id: 868, name: "240" },
      { id: 16226, name: "Fe" },
      { id: 878, name: "S80" },
      { id: 884, name: "Xc70" },
      { id: 881, name: "V50" },
      { id: 13398, name: "940 Estate" },
      { id: 17390, name: "Ex30" },
      { id: 13356, name: "850 Estate" },
      { id: 873, name: "C70" },
      { id: 874, name: "Cross Country" },
      { id: 872, name: "C30" },
      { id: 16231, name: "Fl" },
      { id: 870, name: "850" },
      { id: 871, name: "940" },
    ],
  },
  {
    makeId: 79,
    makeName: "Jaguar",
    models: [
      { id: 1005, name: "Xf" },
      { id: 1591, name: "Xj Series" },
      { id: 16407, name: "F-pace" },
      { id: 16455, name: "Xe" },
      { id: 16406, name: "E-pace" },
      { id: 17072, name: "F Type" },
      { id: 1004, name: "X-type" },
      { id: 1001, name: "S-type" },
      { id: 1593, name: "Xk Series" },
      { id: 1592, name: "Xj-s" },
      { id: 1590, name: "Sovereign" },
      { id: 17383, name: "I-pace" },
      { id: 1589, name: "E-type" },
    ],
  },
  {
    makeId: 103,
    makeName: "Hino",
    models: [
      { id: 1981, name: "Dutro" },
      { id: 2588, name: "Ranger" },
      { id: 1985, name: "Profia" },
      { id: 1983, name: "Liesse Ii" },
      { id: 1982, name: "Liesse" },
      { id: 1984, name: "Melpha" },
      { id: 13886, name: "S'elega" },
      { id: 15678, name: "Ranger Pro" },
      { id: 1986, name: "Rainbow" },
      { id: 16175, name: "300 Series" },
      { id: 16119, name: "Super Dolphin" },
      { id: 13876, name: "Blue Ribbon" },
      { id: 15684, name: "Poncho" },
      { id: 15681, name: "Blue Ribbon Ii" },
      { id: 16178, name: "Fy" },
      { id: 16176, name: "500 Series" },
      { id: 1980, name: "Dolphin" },
      { id: 13315, name: "Ranger2" },
      { id: 13508, name: "Super Dolphin Profia" },
    ],
  },
  {
    makeId: 50,
    makeName: "Ford",
    models: [
      { id: 1559, name: "Ranger" },
      { id: 806, name: "Explorer" },
      { id: 16493, name: "Everest" },
      { id: 819, name: "Mustang" },
      { id: 17122, name: "Raptor" },
      { id: 807, name: "F150" },
      { id: 821, name: "Taurus" },
      { id: 803, name: "Bronco" },
      { id: 804, name: "Escape" },
      { id: 818, name: "Mondeo" },
      { id: 13485, name: "Kuga" },
      { id: 811, name: "Focus" },
      { id: 1536, name: "Ecosports" },
      { id: 810, name: "Fiesta" },
      { id: 805, name: "Expedition" },
      { id: 1541, name: "Explorer Sport Trac" },
      { id: 1553, name: "Fusion" },
      { id: 1566, name: "Transit" },
      { id: 1546, name: "F350" },
      { id: 816, name: "Ka" },
      { id: 1535, name: "Econoline" },
      { id: 1537, name: "Edge" },
      { id: 1558, name: "Puma" },
      { id: 1561, name: "S-max" },
      { id: 824, name: "Thunderbird" },
      { id: 1565, name: "Tourrneo" },
    ],
  },
  {
    makeId: 44,
    makeName: "Hyundai",
    models: [
      { id: 736, name: "Santa Fe" },
      { id: 737, name: "Sonata" },
      { id: 16067, name: "Palisade" },
      { id: 738, name: "Tucson" },
      { id: 1937, name: "Grandeur" },
      { id: 13267, name: "Grand Starex" },
      { id: 16565, name: "Grandeur Ig" },
      { id: 1948, name: "Porter" },
      { id: 735, name: "Genesis" },
      { id: 16503, name: "Staria" },
      { id: 16576, name: "Casper" },
      { id: 15626, name: "Kona" },
      { id: 16566, name: "The New Grandeur Ig" },
      { id: 16567, name: "Grandeur Gn7" },
      { id: 16564, name: "Sonata Dn8" },
      { id: 16562, name: "All New Avante" },
      { id: 16552, name: "The New Santa Fe" },
      { id: 1932, name: "Equus" },
      { id: 16550, name: "Santa Fe Tm" },
      { id: 13884, name: "Maxcruz" },
      { id: 16547, name: "Santa Fe Dm" },
      { id: 16543, name: "All New Tucson" },
      { id: 732, name: "Accent" },
      { id: 16551, name: "The All New Tucson" },
      { id: 16329, name: "Venue" },
    ],
  },
  {
    makeId: 73,
    makeName: "Peugeot",
    models: [
      { id: 14329, name: "3008" },
      { id: 1727, name: "308" },
      { id: 14095, name: "2008" },
      { id: 13842, name: "208" },
      { id: 13860, name: "5008" },
      { id: 13879, name: "508" },
      { id: 15572, name: "Rcz" },
      { id: 975, name: "207" },
      { id: 17042, name: "408" },
      { id: 979, name: "406" },
      { id: 977, name: "307" },
      { id: 17623, name: "E-2008" },
      { id: 974, name: "206" },
      { id: 17622, name: "E-208" },
      { id: 2544, name: "Expert" },
      { id: 973, name: "205" },
      { id: 980, name: "407" },
      { id: 971, name: "1007" },
      { id: 972, name: "106" },
      { id: 976, name: "306" },
      { id: 978, name: "405" },
      { id: 17536, name: "Rifter" },
    ],
  },
  {
    makeId: 52,
    makeName: "Land Rover",
    models: [
      { id: 848, name: "Range Rover Sport" },
      { id: 847, name: "Range Rover" },
      { id: 16085, name: "Range Rover Velar" },
      { id: 16084, name: "Discovery Sport" },
      { id: 13996, name: "Range Rover Evoque" },
      { id: 843, name: "Discovery" },
      { id: 13705, name: "Discovery 4" },
      { id: 842, name: "Defender" },
      { id: 17093, name: "Discovery 5" },
      { id: 16410, name: "Defender 110" },
      { id: 844, name: "Discovery 3" },
      { id: 846, name: "Freelander 2" },
      { id: 1990, name: "Range Rover Vogue" },
      { id: 845, name: "Freelander" },
    ],
  },
];

async function main() {
  const startBrandIndex = process.argv[2] ? parseInt(process.argv[2], 10) : 0;
  const brands = BRANDS.slice(startBrandIndex);
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
