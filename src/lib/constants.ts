import { IMPORT_ELIGIBLE_FROM_YEAR } from "@/lib/scrapers/normalize";

// Ferbil Autos brand palette — matched to the logo's orange-to-magenta-to-
// violet gradient. Key names (navy/gold/burgundy/...) are kept as-is even
// though the actual hues moved, since hundreds of components reference
// COLORS.navy etc. — renaming every key would mean touching every one of
// those call sites for no functional benefit; only the values needed to
// change to retheme the whole site around the new logo.
export const COLORS = {
  navy: "#3B1F63", // deep violet — was navy blue; primary text/ink and dark UI surfaces
  navyDeep: "#241142", // near-black violet — deepest gradient/shadow tone
  paper: "#FBF7F9", // warm near-white page background
  card: "#F4EEF6", // soft lavender card/pill background
  burgundy: "#D6336C", // magenta from the logo's midtone — CTAs, prices, badges
  gold: "#F2762E", // orange from the logo's top — accents, highlights
  goldLight: "#FFA35C", // light orange — icon tint on dark surfaces
  ink: "#3B1F63", // body text, same as navy
  slate: "#6B5B7E", // muted violet-gray — secondary text
  line: "#E9E1EF", // pale violet — borders/dividers
} as const;

export const FONT_DISPLAY = "var(--font-fraunces), Georgia, 'Times New Roman', serif";
export const FONT_BODY = "var(--font-inter), -apple-system, 'Segoe UI', sans-serif";

const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: CURRENT_YEAR - 2014 + 1 }, (_, i) => 2014 + i);

// The brands Kenyan buyers actually shop for, in volume — used to curate
// the homepage's promotional surfaces (hero posters, best-sellers header)
// so they spotlight this lineup instead of whatever happens to have the
// deepest scraped stock that week. The full catalogue with every brand
// still lives in the sidebar+grid search below those sections.
export const POPULAR_MAKES = [
  "Toyota",
  "Nissan",
  "Honda",
  "Mazda",
  "Subaru",
  "Mitsubishi",
  "Suzuki",
  "Isuzu",
  "Lexus",
  "Daihatsu",
  "Mercedes-Benz",
  "BMW",
  "Volkswagen",
  "Audi",
];

export const BUDGET_TILES = [
  { label: "Under KSh 2M", min: 0, max: 2_000_000 },
  { label: "KSh 2M – 3M", min: 2_000_000, max: 3_000_000 },
  { label: "KSh 3M – 5M", min: 3_000_000, max: 5_000_000 },
  { label: "Above KSh 5M", min: 5_000_000, max: 100_000_000 },
];

export const HOW_IT_WORKS = [
  { title: "Search & estimate", text: "Filter by budget, body type or lifestyle and see the full landed cost — not just the sticker price." },
  { title: "Reserve", text: "Lock in your vehicle with a reservation. We confirm availability with the exporter within 24 hours." },
  { title: "We purchase & ship", text: "We handle payment to the exporter, export inspection and ocean freight to Mombasa." },
  { title: "Clear at Mombasa", text: "Our clearing agents handle KRA duty, port charges and NTSA paperwork on your behalf." },
  { title: "Delivered to you", text: "Your car is delivered registered and ready to drive, anywhere in Kenya." },
];

export const FAQS = [
  {
    q: `Why do you only list cars from ${IMPORT_ELIGIBLE_FROM_YEAR} onward?`,
    a: `KRA caps used-vehicle imports at 8 years old from year of manufacture (KS 1515:2000), so ${IMPORT_ELIGIBLE_FROM_YEAR} is the oldest model year still importable this year — the threshold moves forward each year, and every listing here stays inside it so you never waste time on a car you legally can't bring in.`,
  },
  { q: "Does the price shown include KRA duty, excise and VAT?", a: "No — the price shown is the vehicle price plus freight and insurance to Mombasa. KRA duty, excise and VAT depend on its CRSP valuation and your car's age, which we don't estimate on the site. Tick \"Include a full quote with duty, excise & VAT\" on the enquiry form and our team will send you the exact figure." },
  { q: "How long does the import process take?", a: "Most shipments from Japan take six to eight weeks door to Mombasa, plus roughly one to two weeks for clearing and registration. UAE shipments typically run a little shorter." },
  { q: "Is the vehicle price shown the final price?", a: "The price on every listing is Ferbil Autos' all-in vehicle price, already covering sourcing, vetting and exporter coordination, plus freight and insurance to Mombasa. It does not include KRA duty, excise, VAT or registration — request a full quote on the enquiry form for those." },
];

export type Filters = {
  eligibleOnly: boolean;
  yearMin: number;
  yearMax: number;
  priceMinKes: number;
  priceMaxKes: number;
  makes: string[];
  models: string[];
  bodyTypes: string[];
  fuels: string[];
  transmissions: string[];
  drives: string[];
  sourceCountries: string[];
  lifestyle: string | null;
  favoritesOnly: boolean;
  keyword: string;
  sort: "recent" | "priceAsc" | "priceDesc" | "mileageAsc";
};

export const DEFAULT_FILTERS: Filters = {
  eligibleOnly: true,
  yearMin: IMPORT_ELIGIBLE_FROM_YEAR,
  yearMax: CURRENT_YEAR,
  priceMinKes: 0,
  priceMaxKes: 20_000_000,
  makes: [],
  models: [],
  bodyTypes: [],
  fuels: [],
  transmissions: [],
  drives: [],
  sourceCountries: [],
  lifestyle: null,
  favoritesOnly: false,
  keyword: "",
  sort: "recent",
};
