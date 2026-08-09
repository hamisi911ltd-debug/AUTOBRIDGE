import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEFAULT_TIERS = [
  { min: 0, max: 5000, percent: 0.15 },
  { min: 5000, max: 10000, percent: 0.1 },
  { min: 10000, max: 20000, percent: 0.08 },
  { min: 20000, max: 40000, percent: 0.06 },
  { min: 40000, max: null, percent: 0.04 },
];

/**
 * All real inventory comes from the nightly scraper (see src/lib/scrapers) —
 * this script only sets up the two things a fresh database needs that
 * scraping can't provide: an admin login and a default pricing rule. It's
 * intentionally idempotent (create-if-missing, never delete) so re-running
 * it against a database that already has real scraped vehicles is safe.
 */
async function main() {
  const existingRule = await prisma.pricingRule.findFirst({ where: { scopeType: "GLOBAL" } });
  if (!existingRule) {
    await prisma.pricingRule.create({
      data: {
        name: "Default tiered markup",
        scopeType: "GLOBAL",
        markupType: "TIERED",
        tiers: JSON.stringify(DEFAULT_TIERS),
        priority: 0,
        active: true,
      },
    });
    console.log("Created default global pricing rule.");
  } else {
    console.log("Global pricing rule already exists — left untouched.");
  }

  const adminEmail = "admin@autobridge.co.ke";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const adminPassword = "AutoBridge2026!";
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "AutoBridge Admin",
        role: "ADMIN",
        passwordHash: await bcrypt.hash(adminPassword, 10),
      },
    });
    console.log(`Created admin user — email: ${adminEmail}  password: ${adminPassword}`);
  } else {
    console.log(`Admin user ${adminEmail} already exists — left untouched.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
