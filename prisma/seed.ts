import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const VEHICLES = [
  { make: "Toyota", model: "Harrier", trim: "Hybrid Premium", year: 2020, mileageKm: 41000, fuel: "Hybrid", transmission: "Automatic", engineCc: 2500, bodyType: "SUV", drive: "AWD", seats: 5, color: "Pearl White", sourceCountry: "Japan", sourcePriceUsd: 17800, condition: "Foreign Used", badge: "Popular", lifestyle: ["family", "business", "luxury"], eligible: true },
  { make: "Toyota", model: "Land Cruiser Prado", trim: "TX-L", year: 2021, mileageKm: 35000, fuel: "Diesel", transmission: "Automatic", engineCc: 2800, bodyType: "SUV", drive: "4WD", seats: 7, color: "Black", sourceCountry: "Japan", sourcePriceUsd: 34500, condition: "Foreign Used", badge: "Premium", lifestyle: ["family", "off-road", "luxury"], eligible: true },
  { make: "Toyota", model: "Land Cruiser", trim: "V8 ZX", year: 2022, mileageKm: 22000, fuel: "Diesel", transmission: "Automatic", engineCc: 4500, bodyType: "SUV", drive: "4WD", seats: 7, color: "White", sourceCountry: "UAE", sourcePriceUsd: 68000, condition: "Foreign Used", badge: "Flagship", lifestyle: ["luxury", "off-road", "business"], eligible: true },
  { make: "Toyota", model: "Vitz", trim: "Hybrid F", year: 2019, mileageKm: 55000, fuel: "Hybrid", transmission: "Automatic", engineCc: 1500, bodyType: "Hatchback", drive: "FWD", seats: 5, color: "Silver", sourceCountry: "Japan", sourcePriceUsd: 6200, condition: "Foreign Used", badge: "Best Value", lifestyle: ["student", "ride-hailing"], eligible: true },
  { make: "Toyota", model: "Axio", trim: "Hybrid", year: 2020, mileageKm: 48000, fuel: "Hybrid", transmission: "Automatic", engineCc: 1500, bodyType: "Sedan", drive: "FWD", seats: 5, color: "White", sourceCountry: "Japan", sourcePriceUsd: 8600, condition: "Foreign Used", badge: null, lifestyle: ["ride-hailing", "family"], eligible: true },
  { make: "Toyota", model: "Fielder", trim: "Hybrid", year: 2019, mileageKm: 60000, fuel: "Hybrid", transmission: "Automatic", engineCc: 1500, bodyType: "Wagon", drive: "FWD", seats: 5, color: "Grey", sourceCountry: "Japan", sourcePriceUsd: 8300, condition: "Foreign Used", badge: null, lifestyle: ["family", "ride-hailing"], eligible: true },
  { make: "Toyota", model: "Hilux", trim: "Double Cab", year: 2021, mileageKm: 40000, fuel: "Diesel", transmission: "Manual", engineCc: 2800, bodyType: "Pickup", drive: "4WD", seats: 5, color: "White", sourceCountry: "Japan", sourcePriceUsd: 27500, condition: "Foreign Used", badge: "Commercial", lifestyle: ["business", "off-road"], eligible: true },
  { make: "Mazda", model: "CX-5", trim: "Skyactiv", year: 2021, mileageKm: 30000, fuel: "Petrol", transmission: "Automatic", engineCc: 2000, bodyType: "SUV", drive: "AWD", seats: 5, color: "Soul Red", sourceCountry: "Japan", sourcePriceUsd: 19500, condition: "Foreign Used", badge: "New Arrival", lifestyle: ["family", "business"], eligible: true },
  { make: "Mazda", model: "Demio", trim: "13S", year: 2019, mileageKm: 42000, fuel: "Petrol", transmission: "Automatic", engineCc: 1300, bodyType: "Hatchback", drive: "FWD", seats: 5, color: "Blue", sourceCountry: "Japan", sourcePriceUsd: 6800, condition: "Foreign Used", badge: null, lifestyle: ["student", "ride-hailing"], eligible: true },
  { make: "Subaru", model: "Forester", trim: "Premium", year: 2020, mileageKm: 38000, fuel: "Petrol", transmission: "Automatic", engineCc: 2000, bodyType: "SUV", drive: "AWD", seats: 5, color: "Green", sourceCountry: "Japan", sourcePriceUsd: 16200, condition: "Foreign Used", badge: null, lifestyle: ["family", "off-road"], eligible: true },
  { make: "Subaru", model: "Outback", trim: "Limited", year: 2021, mileageKm: 33000, fuel: "Petrol", transmission: "Automatic", engineCc: 2500, bodyType: "Wagon", drive: "AWD", seats: 5, color: "White", sourceCountry: "Japan", sourcePriceUsd: 21500, condition: "Foreign Used", badge: null, lifestyle: ["family", "off-road", "business"], eligible: true },
  { make: "Honda", model: "CR-V", trim: "Turbo EX", year: 2020, mileageKm: 36000, fuel: "Petrol", transmission: "Automatic", engineCc: 1500, bodyType: "SUV", drive: "AWD", seats: 5, color: "Black", sourceCountry: "Japan", sourcePriceUsd: 18300, condition: "Foreign Used", badge: null, lifestyle: ["family", "business"], eligible: true },
  { make: "Honda", model: "Fit", trim: "Hybrid", year: 2019, mileageKm: 50000, fuel: "Hybrid", transmission: "Automatic", engineCc: 1500, bodyType: "Hatchback", drive: "FWD", seats: 5, color: "Red", sourceCountry: "Japan", sourcePriceUsd: 7100, condition: "Foreign Used", badge: null, lifestyle: ["student", "ride-hailing"], eligible: true },
  { make: "Honda", model: "Vezel", trim: "Hybrid Z", year: 2021, mileageKm: 29000, fuel: "Hybrid", transmission: "Automatic", engineCc: 1500, bodyType: "SUV", drive: "AWD", seats: 5, color: "Grey", sourceCountry: "Japan", sourcePriceUsd: 15800, condition: "Foreign Used", badge: "Popular", lifestyle: ["family", "business"], eligible: true },
  { make: "Nissan", model: "X-Trail", trim: "20X", year: 2020, mileageKm: 40000, fuel: "Petrol", transmission: "Automatic", engineCc: 2000, bodyType: "SUV", drive: "AWD", seats: 7, color: "White", sourceCountry: "Japan", sourcePriceUsd: 15900, condition: "Foreign Used", badge: null, lifestyle: ["family"], eligible: true },
  { make: "Nissan", model: "Note", trim: "e-Power", year: 2021, mileageKm: 25000, fuel: "Hybrid", transmission: "Automatic", engineCc: 1200, bodyType: "Hatchback", drive: "FWD", seats: 5, color: "Silver", sourceCountry: "Japan", sourcePriceUsd: 9800, condition: "Foreign Used", badge: "Fuel Saver", lifestyle: ["student", "ride-hailing"], eligible: true },
  { make: "Suzuki", model: "Swift", trim: "Sport", year: 2019, mileageKm: 47000, fuel: "Petrol", transmission: "Manual", engineCc: 1400, bodyType: "Hatchback", drive: "FWD", seats: 5, color: "Yellow", sourceCountry: "Japan", sourcePriceUsd: 8900, condition: "Foreign Used", badge: null, lifestyle: ["student"], eligible: true },
  { make: "BMW", model: "X3", trim: "xDrive20d", year: 2021, mileageKm: 28000, fuel: "Petrol", transmission: "Automatic", engineCc: 2000, bodyType: "SUV", drive: "AWD", seats: 5, color: "Grey", sourceCountry: "UK", sourcePriceUsd: 29500, condition: "Foreign Used", badge: "Premium", lifestyle: ["luxury", "business"], eligible: true },
  { make: "Mercedes-Benz", model: "GLC", trim: "300", year: 2021, mileageKm: 24000, fuel: "Petrol", transmission: "Automatic", engineCc: 2000, bodyType: "SUV", drive: "AWD", seats: 5, color: "Black", sourceCountry: "USA", sourcePriceUsd: 33500, condition: "Foreign Used", badge: "Premium", lifestyle: ["luxury", "business"], eligible: true },
  { make: "Kia", model: "Sportage", trim: "GT-Line", year: 2020, mileageKm: 34000, fuel: "Petrol", transmission: "Automatic", engineCc: 2000, bodyType: "SUV", drive: "AWD", seats: 5, color: "White", sourceCountry: "South Korea", sourcePriceUsd: 15200, condition: "Foreign Used", badge: null, lifestyle: ["family", "business"], eligible: true },
  { make: "Toyota", model: "Premio", trim: "F Package", year: 2016, mileageKm: 90000, fuel: "Petrol", transmission: "Automatic", engineCc: 1800, bodyType: "Sedan", drive: "FWD", seats: 5, color: "Silver", sourceCountry: "Japan", sourcePriceUsd: 6200, condition: "Foreign Used", badge: null, lifestyle: ["family"], eligible: false, ineligibleReason: "registered in 2016, which is older than our 2019 import threshold." },
  { make: "Nissan", model: "Tiida", trim: "15M", year: 2015, mileageKm: 95000, fuel: "Petrol", transmission: "Automatic", engineCc: 1500, bodyType: "Hatchback", drive: "FWD", seats: 5, color: "Blue", sourceCountry: "Japan", sourcePriceUsd: 4800, condition: "Foreign Used", badge: null, lifestyle: ["student"], eligible: false, ineligibleReason: "registered in 2015, which is older than our 2019 import threshold." },
  { make: "Mercedes-Benz", model: "C200", trim: "Avantgarde", year: 2014, mileageKm: 110000, fuel: "Petrol", transmission: "Automatic", engineCc: 2000, bodyType: "Sedan", drive: "RWD", seats: 5, color: "Black", sourceCountry: "UK", sourcePriceUsd: 9200, condition: "Foreign Used", badge: null, lifestyle: ["luxury"], eligible: false, ineligibleReason: "registered in 2014, which is older than our 2019 import threshold." },
];

const DEFAULT_TIERS = [
  { min: 0, max: 5000, percent: 0.15 },
  { min: 5000, max: 10000, percent: 0.10 },
  { min: 10000, max: 20000, percent: 0.08 },
  { min: 20000, max: 40000, percent: 0.06 },
  { min: 40000, max: null, percent: 0.04 },
];

async function main() {
  await prisma.enquiry.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.user.deleteMany();

  await prisma.vehicle.createMany({
    data: VEHICLES.map((v) => ({
      ...v,
      lifestyle: JSON.stringify(v.lifestyle),
    })),
  });

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

  const adminEmail = "admin@autobridge.co.ke";
  const adminPassword = "AutoBridge2026!";
  await prisma.user.create({
    data: {
      email: adminEmail,
      name: "AutoBridge Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });

  console.log(`Seeded ${VEHICLES.length} vehicles, 1 default pricing rule, and admin user:`);
  console.log(`  email:    ${adminEmail}`);
  console.log(`  password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
