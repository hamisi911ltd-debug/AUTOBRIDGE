import { scrapeBeforward } from "../src/lib/scrapers/beforward";
import { scrapeSbtJapan } from "../src/lib/scrapers/sbtJapan";

async function main() {
  console.log("=== BE FORWARD (1 page, Toyota+Honda+Nissan+Mazda) ===");
  const bf = await scrapeBeforward(1);
  console.log(`found ${bf.length}`);
  console.log(bf.slice(0, 3));

  console.log("\n=== SBT Japan (1 page, Toyota+Honda+Nissan+Mazda) ===");
  const sbt = await scrapeSbtJapan(1);
  console.log(`found ${sbt.length}`);
  console.log(sbt.slice(0, 3));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
