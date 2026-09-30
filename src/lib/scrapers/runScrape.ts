import { prisma } from "@/lib/prisma";
import { BEFORWARD_MAKES, enrichBeforwardVehicles, listBeforwardPage } from "@/lib/scrapers/beforward";
import { SBT_MAKES, scrapeSbtJapanUnit } from "@/lib/scrapers/sbtJapan";
import { fetchDubicarsVehicle, listDubicarsPage } from "@/lib/scrapers/dubicars";
import { GOONET_MAKES, scrapeGoonetPage } from "@/lib/scrapers/goonet";
import { AUTOCRAFT_YEARS, scrapeAutocraftPage } from "@/lib/scrapers/autocraft";
import { fetchDelightsVehicle, listDelightsPage } from "@/lib/scrapers/delights";
import { scrapeAutocomPage } from "@/lib/scrapers/autocom";
import { scrapeNikkyoPage } from "@/lib/scrapers/nikkyo";
import { scrapeJpcDetail, scrapeJpcListPage } from "@/lib/scrapers/jpctrade";
import { computeEligibility, deriveLifestyle, IMPORT_ELIGIBLE_FROM_YEAR } from "@/lib/scrapers/normalize";
import { measureImageWidthPx } from "@/lib/scrapers/coverImage";
import type { ScrapedVehicle } from "@/lib/scrapers/types";

/**
 * Every source site the admin panel, cron route and nightly cron-worker can
 * scrape. Each one is split into "groups" (makes, model years, or a single
 * "All stock" list, depending on how the site itself pages its stock), and
 * each group into numbered result pages. A page is listed once, then its
 * listings are enriched and saved in small slices (see runScrapeUnit).
 *
 * `list` returns either finished vehicles or detail-page URLs; `enrich`
 * turns a slice of those into vehicles (fetching detail pages where the
 * site needs it). Adding a source means adding one entry here.
 */
type SiteAdapter = {
  label: string;
  groupKind: "make" | "year" | "all";
  groups: string[];
  list: (group: number, page: number) => Promise<unknown[] | "rate-limited">;
  enrich: (items: unknown[]) => Promise<ScrapedVehicle[]>;
  /** The externalId a listed item will get, known before enrichment (null if it can't be told yet). */
  externalIdOf: (item: unknown) => string | null;
};

function adapter<T>(a: {
  label: string;
  groupKind: SiteAdapter["groupKind"];
  groups: string[];
  list: (group: number, page: number) => Promise<T[] | "rate-limited">;
  enrich?: (items: T[]) => Promise<ScrapedVehicle[]>;
  externalIdOf?: (item: T) => string | null;
}): SiteAdapter {
  return {
    label: a.label,
    groupKind: a.groupKind,
    groups: a.groups,
    list: a.list,
    enrich: (a.enrich ?? (async (items: T[]) => items as unknown as ScrapedVehicle[])) as (items: unknown[]) => Promise<ScrapedVehicle[]>,
    externalIdOf: (a.externalIdOf ?? ((item: T) => (item as unknown as ScrapedVehicle).externalId ?? null)) as (item: unknown) => string | null,
  };
}

/** Fetches detail pages one at a time; a failed or unusable one is simply dropped. */
function sequentially<T>(fetchOne: (item: T) => Promise<ScrapedVehicle | null | "rate-limited">) {
  return async (items: T[]) => {
    const out: ScrapedVehicle[] = [];
    for (const item of items) {
      try {
        const v = await fetchOne(item);
        if (v && v !== "rate-limited") out.push(v);
      } catch (err) {
        console.error("[runScrapeUnit] detail fetch failed:", err);
      }
    }
    return out;
  };
}

const ALL_STOCK = ["All stock"];

export const SCRAPE_SITES = {
  goonet: adapter({
    label: "Goo-net Exchange",
    groupKind: "make",
    groups: GOONET_MAKES.map((m) => m.make),
    list: scrapeGoonetPage,
  }),
  autocraft: adapter({
    label: "Autocraft Japan",
    groupKind: "year",
    groups: AUTOCRAFT_YEARS.map(String),
    list: scrapeAutocraftPage,
  }),
  beforward: adapter({
    label: "BE FORWARD",
    groupKind: "make",
    groups: BEFORWARD_MAKES.map((m) => m.make),
    list: listBeforwardPage,
    enrich: async (items) => {
      await enrichBeforwardVehicles(items);
      return items;
    },
  }),
  // Re-enabled: SBT was switched off earlier at the owner's request, and has
  // since been asked for again. Its scraper was also fixed for SBT's new URLs.
  sbtjapan: adapter({
    label: "SBT Japan",
    groupKind: "make",
    groups: SBT_MAKES.map((m) => m.make),
    list: scrapeSbtJapanUnit,
  }),
  autocom: adapter({
    label: "Autocom Japan",
    groupKind: "all",
    groups: ALL_STOCK,
    list: (_group, page) => scrapeAutocomPage(page),
  }),
  jpctrade: adapter({
    label: "JPC Trade",
    groupKind: "all",
    groups: ALL_STOCK,
    list: (_group, page) => scrapeJpcListPage("kenya", page),
    enrich: sequentially((item: { id: string; url: string }) => scrapeJpcDetail(item.id, item.url)),
    externalIdOf: (item) => `jpctrade:${item.id}`,
  }),
  nikkyo: adapter({
    label: "Nikkyo Cars",
    groupKind: "all",
    groups: ALL_STOCK,
    list: (_group, page) => scrapeNikkyoPage(page),
  }),
  delights: adapter({
    label: "Delights",
    groupKind: "all",
    groups: ALL_STOCK,
    list: (_group, page) => listDelightsPage(page),
    enrich: sequentially(fetchDelightsVehicle),
    externalIdOf: (url) => {
      const id = url.match(/\/(\d+)\/?$/)?.[1];
      return id ? `delights:${id}` : null;
    },
  }),
  dubicars: adapter({
    label: "Dubicars (UAE)",
    groupKind: "all",
    groups: ALL_STOCK,
    list: (_group, page) => listDubicarsPage(page),
    enrich: sequentially(fetchDubicarsVehicle),
    externalIdOf: (url) => {
      const id = url.match(/-(\d+)\.html$/)?.[1];
      return id ? `dubicars:${id}` : null;
    },
  }),
} satisfies Record<string, SiteAdapter>;

export type ScrapeSite = keyof typeof SCRAPE_SITES;

export function isScrapeSite(value: unknown): value is ScrapeSite {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SCRAPE_SITES, value);
}

/**
 * Groups per site - lets orchestrators (the cron-worker, the admin panel)
 * enumerate every (site, group) unit without duplicating the lists.
 */
export const SCRAPE_MAKE_COUNTS = Object.fromEntries(
  Object.entries(SCRAPE_SITES).map(([site, a]) => [site, a.groups.length])
) as Record<ScrapeSite, number>;

export type UnitScrapeSummary = {
  site: ScrapeSite;
  make: string | null;
  found: number;
  created: number;
  /** Listings skipped because the car is already on the site (same listing, or the same car from another source). */
  existing: number;
  skipped: number;
  errors: number;
  /** Listings on the whole page (before slicing) - 0 means this make/page has run out of stock. */
  candidates: number;
  /** Listings this call looked at (its slice of the page). */
  checked: number;
  /** True when listings past this slice remain on the page; call again with offset = nextOffset. */
  hasMore: boolean;
  nextOffset: number;
  /** The source site throttled or blocked this request - worth a pause before continuing. */
  rateLimited: boolean;
};

/**
 * Listings enriched and saved per call. Each BE FORWARD listing costs two
 * subrequests (detail page + photo measurement) and each Dubicars listing
 * one slow detail fetch, so a small slice keeps every call well inside
 * Cloudflare Workers' per-request subrequest and CPU budgets (10 BE FORWARD
 * listings is roughly 21-31 subrequests against the free plan's 50).
 */
export const UNIT_BATCH_SIZE = 10;

// Same bar getPublicVehicles.ts used to require before swapping in a
// same-model stand-in photo - now that stand-ins are gone entirely, a photo
// this small (or missing) is never worth showing at all, so it's rejected
// right at scrape time instead of having to be pruned from the catalogue
// afterward.
const MIN_SHARP_WIDTH_PX = 500;

/**
 * Adds a newly found car. Create-only on purpose: a car already on the site
 * is never updated or re-scraped (the owner's rule), so prices and details
 * shown to customers only change when an admin changes them.
 */
async function createVehicle(v: ScrapedVehicle): Promise<"created" | "existing" | "skipped"> {
  // The same physical car is often listed by more than one exporter (e.g.
  // Autocraft resells Goo-net and auction stock). Same make, model, year and
  // exact odometer reading is treated as the same car.
  if (v.mileageKm > 0) {
    const sameCar = await prisma.vehicle.findFirst({
      where: { make: v.make, model: v.model, year: v.year, mileageKm: v.mileageKm },
      select: { id: true },
    });
    if (sameCar) return "existing";
  }

  // beforward.ts already measures the width of any detail-page photo it
  // upgrades to - only measure here when that didn't happen.
  const imageWidthPx = v.imageWidthPx ?? (await measureImageWidthPx(v.imageUrl));
  if (!v.imageUrl || (imageWidthPx ?? 0) < MIN_SHARP_WIDTH_PX) {
    // No photo, or one too small to look sharp on a card - never listed.
    return "skipped";
  }

  const { eligible, ineligibleReason } = computeEligibility(v.year);
  const lifestyle = deriveLifestyle(v.bodyType, v.fuel, v.sourcePriceUsd);

  try {
    await prisma.vehicle.create({
      data: {
        make: v.make,
        model: v.model,
        trim: v.trim,
        year: v.year,
        mileageKm: v.mileageKm,
        fuel: v.fuel,
        transmission: v.transmission,
        engineCc: v.engineCc,
        bodyType: v.bodyType,
        drive: v.drive,
        seats: v.seats,
        color: v.color,
        sourceCountry: v.sourceCountry,
        sourcePriceUsd: v.sourcePriceUsd,
        freightIncluded: v.freightIncluded ?? false,
        imageUrl: v.imageUrl,
        imageUrls: v.imageUrls && v.imageUrls.length > 0 ? JSON.stringify(v.imageUrls) : null,
        imageWidthPx,
        condition: "Foreign Used",
        lifestyle: JSON.stringify(lifestyle),
        eligible,
        ineligibleReason,
        refNo: v.refNo,
        chassisNo: v.chassisNo,
        modelCode: v.modelCode,
        engineCode: v.engineCode,
        steering: v.steering,
        location: v.location,
        versionClass: v.versionClass,
        doors: v.doors,
        dimensions: v.dimensions,
        weightKg: v.weightKg,
        registrationYearMonth: v.registrationYearMonth,
        manufactureYearMonth: v.manufactureYearMonth,
        features: v.features ? JSON.stringify(v.features) : null,
        sourceSite: v.sourceSite,
        externalId: v.externalId,
        sourceUrl: v.sourceUrl,
        lastScrapedAt: new Date(),
      },
    });
  } catch (err) {
    // Unique externalId: another run saved this exact listing a moment ago.
    if ((err as { code?: string })?.code === "P2002") return "existing";
    throw err;
  }
  return "created";
}

/**
 * Inventory sync, one slice of one (site, group, page) listing page per call:
 * lists the page, drops listings already on the site (before fetching any of
 * their detail pages), enriches the rest of listings [offset, offset+limit)
 * and adds them. Nothing already on the site is updated or re-scraped.
 *
 * Callers (the admin "Run scrape" panel, the cron route) loop over groups,
 * pages and offsets themselves, keeping each individual request small enough
 * for Cloudflare Workers' per-request limits.
 */
export async function runScrapeUnit(
  site: ScrapeSite,
  group: number,
  page = 1,
  offset = 0,
  limit = UNIT_BATCH_SIZE
): Promise<UnitScrapeSummary> {
  const def: SiteAdapter = SCRAPE_SITES[site];
  const groupName = def?.groups[group] ?? null;
  const empty = { site, make: groupName, found: 0, created: 0, existing: 0, skipped: 0, errors: 0, candidates: 0, checked: 0, hasMore: false, nextOffset: offset, rateLimited: false };
  if (!def || groupName === null) return empty;

  let vehicles: ScrapedVehicle[];
  let candidates: number;
  let existing = 0;
  try {
    const listed = await def.list(group, page);
    if (listed === "rate-limited") return { ...empty, rateLimited: true };
    candidates = listed.length;
    const slice = listed.slice(offset, offset + limit);

    // Skip listings already on the site before any detail-page fetch.
    const ids = slice.map((item) => def.externalIdOf(item)).filter((id): id is string => !!id);
    const known = new Set(
      ids.length > 0
        ? (await prisma.vehicle.findMany({ where: { externalId: { in: ids } }, select: { externalId: true } })).map((r) => r.externalId)
        : []
    );
    const fresh = slice.filter((item) => {
      const id = def.externalIdOf(item);
      return !(id && known.has(id));
    });
    existing = slice.length - fresh.length;

    // One shared year gate for every source, whatever each scraper checks
    // itself: nothing older than the import cut-off is ever stored.
    vehicles = (await def.enrich(fresh)).filter((v) => v.year >= IMPORT_ELIGIBLE_FROM_YEAR && !known.has(v.externalId));
  } catch (err) {
    console.error(`[runScrapeUnit] ${site} group=${groupName} page=${page} offset=${offset} failed entirely:`, err);
    const blocked = err instanceof Error && /bot challenge|rate-limited|\b(429|403|503)\b/i.test(err.message);
    return { ...empty, errors: 1, rateLimited: blocked };
  }

  const checked = Math.max(0, Math.min(limit, candidates - offset));
  let created = 0;
  // Listings that didn't become a usable vehicle (too old, left-hand drive,
  // no price, failed detail page, no sharp photo) count as skipped, so every
  // candidate is accounted for in the totals.
  let skipped = Math.max(0, checked - existing - vehicles.length);
  let errors = 0;
  for (const v of vehicles) {
    try {
      const result = await createVehicle(v);
      if (result === "created") created++;
      else if (result === "existing") existing++;
      else skipped++;
    } catch (err) {
      errors++;
      console.error(`[runScrapeUnit] failed to save ${v.externalId}:`, err);
    }
  }

  return {
    site,
    make: groupName,
    found: vehicles.length,
    created,
    existing,
    skipped,
    errors,
    candidates,
    checked,
    hasMore: offset + limit < candidates,
    nextOffset: offset + limit,
    rateLimited: false,
  };
}
