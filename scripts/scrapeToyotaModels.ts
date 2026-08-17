import "dotenv/config";
import { scrapeBeforwardModelPage } from "@/lib/scrapers/beforward";
import { fetchCoverImage } from "@/lib/scrapers/coverImage";
import { flushToD1, sleep, type PendingRow } from "./lib/d1Upsert";

const TOYOTA_MAKE_ID = 1;
const REQUEST_DELAY_MS = 1200;
const COOLDOWN_ON_429_MS = 45_000;
const MAX_429_COOLDOWNS = 4;
const FLUSH_EVERY = 30;
// Deep coverage (15 pages) only for the models Kenya buyers actually search
// for — Harrier/Crown (explicitly requested) plus the next tier by stock
// volume. Uniform 15-page depth across all 245 models would spend hours on
// just the first few before ever reaching RAV4 or Land Cruiser; this trades
// some depth on the long tail for breadth across the whole catalog sooner.
const DEEP_COVERAGE_MODEL_COUNT = 30;
const MAX_PAGES_DEEP = 15;
const MAX_PAGES_SHALLOW = 6;

/**
 * Full deep-dive model list — every model BE FORWARD lists under Toyota,
 * ordered per the user's explicit request: Harrier first, then Crown (and
 * every Crown sub-line), then the rest of the catalog by listed stock
 * volume, so the batch spends its early time on models that actually move
 * in Kenya before working down to rare/obscure ones. IDs and volumes pulled
 * live from beforward.jp's own make=1 model filter dropdown
 * (stocklist/make=1), which reports each model's current stock count.
 */
const TOYOTA_MODELS: { id: number; name: string }[] = [
  { id: 181, name: "Harrier" },
  { id: 182, name: "Harrier Hybrid" },
  { id: 151, name: "Crown" },
  { id: 156, name: "Crown Hybrid" },
  { id: 16676, name: "Crown Crossover" },
  { id: 157, name: "Crown Majesta" },
  { id: 17155, name: "Crown Sport" },
  { id: 152, name: "Crown Athlete Series" },
  { id: 154, name: "Crown Estate" },
  { id: 159, name: "Crown Sedan" },
  { id: 158, name: "Crown Royal Series" },
  { id: 160, name: "Crown Station Wagon" },
  { id: 161, name: "Crown Van" },
  { id: 155, name: "Crown Hardtop" },
  { id: 17364, name: "Harrier Phev" },
  { id: 225, name: "Prius" },
  { id: 185, name: "Hiace Van" },
  { id: 102, name: "Alphard" },
  { id: 13235, name: "Aqua" },
  { id: 277, name: "Voxy" },
  { id: 187, name: "Hilux" },
  { id: 245, name: "Sienta" },
  { id: 271, name: "Vellfire" },
  { id: 198, name: "Land Cruiser" },
  { id: 15633, name: "Roomy" },
  { id: 219, name: "Noah" },
  { id: 235, name: "Rav4" },
  { id: 200, name: "Land Cruiser Prado" },
  { id: 1222, name: "Fortuner" },
  { id: 16315, name: "Raize" },
  { id: 1244, name: "Yaris" },
  { id: 16449, name: "Yaris Cross" },
  { id: 103, name: "Alphard Hybrid" },
  { id: 221, name: "Passo" },
  { id: 186, name: "Hiace Wagon" },
  { id: 15662, name: "Tank" },
  { id: 167, name: "Dyna Truck" },
  { id: 13283, name: "Prius Alpha" },
  { id: 15616, name: "Esquire" },
  { id: 13367, name: "86" },
  { id: 240, name: "Regiusace Van" },
  { id: 13850, name: "C-hr" },
  { id: 16487, name: "Corolla Cross" },
  { id: 170, name: "Estima" },
  { id: 14337, name: "Vellfire Hybrid" },
  { id: 275, name: "Vitz" },
  { id: 212, name: "Mark X" },
  { id: 227, name: "Probox Van" },
  { id: 118, name: "Camry" },
  { id: 264, name: "Townace Van" },
  { id: 134, name: "Corolla Fielder" },
  { id: 16053, name: "Prius Phv" },
  { id: 223, name: "Porte" },
  { id: 13396, name: "Spade" },
  { id: 16831, name: "Voxy Hybrid" },
  { id: 266, name: "Toyoace" },
  { id: 16975, name: "Corolla Touring" },
  { id: 226, name: "Probox" },
  { id: 1221, name: "Fj Cruiser" },
  { id: 14404, name: "Pixis Van" },
  { id: 13848, name: "Corolla" },
  { id: 189, name: "Hilux Surf" },
  { id: 13519, name: "Noah Hybrid" },
  { id: 13885, name: "Pixis Epoch" },
  { id: 125, name: "Celsior" },
  { id: 129, name: "Coaster" },
  { id: 282, name: "Wish" },
  { id: 183, name: "Hiace Commuter" },
  { id: 132, name: "Corolla Axio" },
  { id: 233, name: "Ractis" },
  { id: 111, name: "Bb" },
  { id: 142, name: "Corolla Touring Wagon" },
  { id: 172, name: "Estima Hybrid" },
  { id: 207, name: "Mark Ii" },
  { id: 257, name: "Succeed Van" },
  { id: 15630, name: "Pixis Space" },
  { id: 13299, name: "Sai" },
  { id: 1225, name: "Iq" },
  { id: 16466, name: "Corolla Sport" },
  { id: 13390, name: "Camry Hybrid" },
  { id: 205, name: "Liteace Van" },
  { id: 259, name: "Supra" },
  { id: 193, name: "Isis" },
  { id: 15602, name: "Pixis Joy" },
  { id: 270, name: "Vanguard" },
  { id: 108, name: "Auris" },
  { id: 263, name: "Townace Truck" },
  { id: 256, name: "Succeed" },
  { id: 217, name: "Mr-s" },
  { id: 246, name: "Soarer" },
  { id: 1238, name: "Sienna" },
  { id: 224, name: "Premio" },
  { id: 123, name: "Celica" },
  { id: 127, name: "Chaser" },
  { id: 107, name: "Aristo" },
  { id: 204, name: "Liteace Truck" },
  { id: 17064, name: "Pixis Mega" },
  { id: 101, name: "Allion" },
  { id: 105, name: "Altezza" },
  { id: 138, name: "Corolla Rumion" },
  { id: 126, name: "Century" },
  { id: 1215, name: "Corolla Altis" },
  { id: 255, name: "Starlet" },
  { id: 241, name: "Rush" },
  { id: 16125, name: "Camroad" },
  { id: 14284, name: "Pixis Truck" },
  { id: 137, name: "Corolla Levin" },
  { id: 213, name: "Mark X Zio" },
  { id: 150, name: "Cresta" },
  { id: 216, name: "Mr2" },
  { id: 17121, name: "Gr86" },
  { id: 188, name: "Hilux Sports Pickup" },
  { id: 17026, name: "Rav4 Phv" },
  { id: 1242, name: "Tundra" },
  { id: 15672, name: "Vitz Hybrid" },
  { id: 194, name: "Ist" },
  { id: 16528, name: "Gran Ace" },
  { id: 234, name: "Raum" },
  { id: 17117, name: "Hilux Champ" },
  { id: 252, name: "Sprinter Trueno" },
  { id: 113, name: "Blade" },
  { id: 179, name: "Grand Hiace" },
  { id: 196, name: "Kluger" },
  { id: 2518, name: "Prado" },
  { id: 112, name: "Belta" },
  { id: 120, name: "Carina" },
  { id: 229, name: "Progres" },
  { id: 17148, name: "Gr Yaris" },
  { id: 140, name: "Corolla Sedan" },
  { id: 208, name: "Mark Ii Blit" },
  { id: 16654, name: "Bz4x" },
  { id: 115, name: "Caldina" },
  { id: 109, name: "Avalon" },
  { id: 139, name: "Corolla Runx" },
  { id: 228, name: "Probox Wagon" },
  { id: 232, name: "Quick Delivery" },
  { id: 131, name: "Comfort" },
  { id: 272, name: "Verossa" },
  { id: 258, name: "Succeed Wagon" },
  { id: 211, name: "Mark Ii Wagon" },
  { id: 1228, name: "Origin" },
  { id: 1243, name: "Vios" },
  { id: 279, name: "Will Vi" },
  { id: 13227, name: "Avensis Wagon" },
  { id: 141, name: "Corolla Spacio" },
  { id: 164, name: "Deliboy" },
  { id: 1223, name: "Highlander" },
  { id: 281, name: "Windom" },
  { id: 110, name: "Avensis" },
  { id: 1210, name: "Aygo" },
  { id: 265, name: "Townace Wagon" },
  { id: 114, name: "Brevis" },
  { id: 17195, name: "Copen" },
  { id: 238, name: "Regius Van" },
  { id: 145, name: "Corona" },
  { id: 166, name: "Dyna Route Van" },
  { id: 248, name: "Sprinter Carib" },
  { id: 17274, name: "Tamaraw" },
  { id: 100, name: "Allex" },
  { id: 173, name: "Estima L" },
  { id: 244, name: "Sera" },
  { id: 17273, name: "Wigo" },
  { id: 13285, name: "4runner" },
  { id: 124, name: "Celica Xx" },
  { id: 176, name: "Fun Cargo" },
  { id: 17057, name: "Gr Corolla" },
  { id: 184, name: "Hiace Truck" },
  { id: 195, name: "Kluger Hybrid" },
  { id: 1241, name: "Tacoma" },
  { id: 17300, name: "Veloz" },
  { id: 278, name: "Will Cypha" },
  { id: 121, name: "Carina Ed" },
  { id: 175, name: "Estima T" },
  { id: 180, name: "Granvia" },
  { id: 17235, name: "Innova" },
  { id: 16086, name: "Land Cruiser Amazon" },
  { id: 210, name: "Mark Ii Van" },
  { id: 13534, name: "Sprinter" },
  { id: 130, name: "Coaster Big Van" },
  { id: 162, name: "Curren" },
  { id: 168, name: "Dyna Urban Supporter" },
  { id: 16138, name: "Jpn Taxi" },
  { id: 15944, name: "Prius C" },
  { id: 106, name: "Altezza Gita" },
  { id: 222, name: "Platz" },
  { id: 239, name: "Regius Wagon" },
  { id: 280, name: "Will Vs" },
  { id: 16445, name: "Avanza" },
  { id: 163, name: "Cynos" },
  { id: 16359, name: "Proace" },
  { id: 136, name: "Corolla Ii" },
  { id: 171, name: "Estima Emina" },
  { id: 209, name: "Mark Ii Qualis" },
  { id: 13237, name: "Passo Sette" },
  { id: 231, name: "Publica" },
  { id: 262, name: "Townace Noah" },
  { id: 17625, name: "Vellfire Phev" },
  { id: 274, name: "Vista Sedan" },
  { id: 117, name: "Cami" },
  { id: 128, name: "Classic" },
  { id: 149, name: "Corsa" },
  { id: 169, name: "Dyna Van" },
  { id: 192, name: "Ipsum" },
  { id: 203, name: "Liteace Noah" },
  { id: 215, name: "Megacruiser" },
  { id: 220, name: "Opa" },
  { id: 230, name: "Pronard" },
  { id: 13234, name: "Regiusace Commuter" },
  { id: 251, name: "Sprinter Sedan" },
  { id: 267, name: "Toyoace Route Van" },
  { id: 1214, name: "Coaster R" },
  { id: 135, name: "Corolla Fx" },
  { id: 144, name: "Corolla Wagon" },
  { id: 147, name: "Corona Premio" },
  { id: 165, name: "Duet" },
  { id: 177, name: "Gaia" },
  { id: 199, name: "Land Cruiser Cygnus" },
  { id: 214, name: "Masterace Surf" },
  { id: 1229, name: "Picnic" },
  { id: 247, name: "Sparky" },
  { id: 250, name: "Sprinter Marino" },
  { id: 261, name: "Touring Hiace" },
  { id: 14328, name: "Urban Cruiser" },
  { id: 273, name: "Vista Ardeo" },
  { id: 276, name: "Voltz" },
  { id: 1211, name: "Blizzard" },
  { id: 119, name: "Camry Gracia" },
  { id: 1213, name: "Carina Van" },
  { id: 122, name: "Cavalier" },
  { id: 133, name: "Corolla Ceres" },
  { id: 143, name: "Corolla Van" },
  { id: 146, name: "Corona Exiv" },
  { id: 174, name: "Estima Lucida" },
  { id: 16446, name: "Land Cruiser 90" },
  { id: 206, name: "Liteace Wagon" },
  { id: 218, name: "Nadia" },
  { id: 1231, name: "Previa" },
  { id: 242, name: "Scepter" },
  { id: 1234, name: "Scion Xa" },
  { id: 14355, name: "Sportrider" },
  { id: 254, name: "Sprinter Wagon" },
  { id: 260, name: "Tercel" },
  { id: 268, name: "Toyoace Urban Supporter" },
  { id: 17153, name: "Transformer" },
  { id: 16044, name: "Venza" },
];

async function main() {
  const startIndex = process.argv[2] ? parseInt(process.argv[2], 10) : 0;
  const models = TOYOTA_MODELS.slice(startIndex);
  console.log(`Starting at model index ${startIndex} (${models[0]?.name ?? "end of list"}), ${models.length} of ${TOYOTA_MODELS.length} models queued.`);

  let pending: PendingRow[] = [];
  let totalUpserted = 0;
  let totalFound = 0;
  let cooldowns = 0;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const originalIndex = startIndex + i;
    const maxPages = originalIndex < DEEP_COVERAGE_MODEL_COUNT ? MAX_PAGES_DEEP : MAX_PAGES_SHALLOW;
    console.log(`\n=== ${model.name} (model=${model.id}, max ${maxPages} pages) ===`);
    let page = 1;
    let modelFound = 0;

    while (page <= maxPages) {
      const listed = await scrapeBeforwardModelPage(TOYOTA_MAKE_ID, "Toyota", model.id, page);

      if (listed === "rate-limited") {
        cooldowns++;
        if (cooldowns > MAX_429_COOLDOWNS) {
          console.log(`Hit the rate limit ${cooldowns} times — stopping this run. Re-run later to continue from ${model.name}.`);
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
        console.log(`  page ${page}: no listings — done with ${model.name}`);
        break;
      }
      console.log(`  page ${page}: ${listed.length} eligible listings`);
      modelFound += listed.length;
      totalFound += listed.length;

      for (const v of listed) {
        const better = await fetchCoverImage("beforward", v.sourceUrl);

        if (better === "rate-limited") {
          cooldowns++;
          if (cooldowns > MAX_429_COOLDOWNS) {
            console.log(`Hit the rate limit ${cooldowns} times — stopping this run. Re-run later to continue from ${model.name}.`);
            await flushToD1(pending);
            totalUpserted += pending.length;
            console.log(`\nDone (rate-limit stop). ${totalUpserted} vehicles upserted, ${totalFound} total found.`);
            return;
          }
          console.log(`  rate limited — cooling down ${COOLDOWN_ON_429_MS / 1000}s (${cooldowns}/${MAX_429_COOLDOWNS})...`);
          await sleep(COOLDOWN_ON_429_MS);
          continue; // this vehicle keeps its listing-thumbnail image, not lost — just not upgraded
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

    console.log(`  ${model.name}: ${modelFound} eligible listings found`);
  }

  await flushToD1(pending);
  totalUpserted += pending.length;
  console.log(`\nDone. ${totalUpserted} vehicles upserted across ${TOYOTA_MODELS.length} Toyota models, ${totalFound} total found.`);
}

main();
