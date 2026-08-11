export const COLORS = {
  navy: "#0B1F3A",
  navyDeep: "#071527",
  paper: "#F7F7F5",
  card: "#F1F2F5",
  burgundy: "#7A1F2B",
  gold: "#C6952C",
  goldLight: "#E3C077",
  ink: "#14213D",
  slate: "#5B6472",
  line: "#E7E9EE",
} as const;

export const FONT_DISPLAY = "var(--font-fraunces), Georgia, 'Times New Roman', serif";
export const FONT_BODY = "var(--font-inter), -apple-system, 'Segoe UI', sans-serif";

export const YEARS = Array.from({ length: 2026 - 2014 + 1 }, (_, i) => 2014 + i);

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
  { q: "Why do you only list cars from 2019 onward?", a: "Kenya restricts imports based on vehicle age, and focusing on 2019-and-newer keeps every listing on this platform straightforwardly importable, so you never waste time on a car you legally can't bring in." },
  { q: "How accurate is the landed cost shown on each listing?", a: "It's a close estimate built from the same duty, excise and VAT structure KRA applies at Mombasa, plus typical freight, port and registration costs. KRA's actual assessment uses its own valuation table and can vary, so confirm the final figure with a licensed clearing agent before paying a deposit." },
  { q: "How long does the import process take?", a: "Most shipments from Japan take six to eight weeks door to Mombasa, plus roughly one to two weeks for clearing and registration. UK and US shipments typically run a little longer." },
  { q: "Is the vehicle price shown the final price?", a: "Yes — the price on every listing is AutoBridge's all-in vehicle price, already covering sourcing, vetting and exporter coordination. The landed-cost breakdown below it adds Kenya's duty, VAT and clearing costs on top, so you see the true cost of ownership before you enquire." },
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
  sourceCountries: string[];
  lifestyle: string | null;
  favoritesOnly: boolean;
  keyword: string;
  sort: "recent" | "priceAsc" | "priceDesc" | "mileageAsc";
};

export const DEFAULT_FILTERS: Filters = {
  eligibleOnly: true,
  yearMin: 2019,
  yearMax: 2026,
  priceMinKes: 0,
  priceMaxKes: 20_000_000,
  makes: [],
  models: [],
  bodyTypes: [],
  fuels: [],
  transmissions: [],
  sourceCountries: [],
  lifestyle: null,
  favoritesOnly: false,
  keyword: "",
  sort: "recent",
};
