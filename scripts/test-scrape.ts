import { scrapeBeforwardUnit } from "../src/lib/scrapers/beforward";
import { scrapeSbtJapanUnit } from "../src/lib/scrapers/sbtJapan";

async function main() {
  console.log("=== BE FORWARD (1 page, Toyota+Honda+Nissan+Mazda) ===");
  const bf = (await Promise.all([0, 1, 2, 3].map((i) => scrapeBeforwardUnit(i, 1)))).flat();
  console.log(`found ${bf.length}`);
  console.log(bf.slice(0, 3));

  console.log("\n=== SBT Japan (1 page, Toyota+Nissan+Honda+Mazda) ===");
  const sbt = (await Promise.all([0, 1, 2, 3].map((i) => scrapeSbtJapanUnit(i, 1)))).flat();
  console.log(`found ${sbt.length}`);
  console.log(sbt.slice(0, 3));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
