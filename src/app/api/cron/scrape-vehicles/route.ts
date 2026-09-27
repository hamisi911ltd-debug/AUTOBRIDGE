import { NextResponse } from "next/server";
import { isScrapeSite, runScrapeUnit, SCRAPE_MAKE_COUNTS, SCRAPE_SITES } from "@/lib/scrapers/runScrape";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function checkAuth(req: Request): boolean {
  const secret = req.headers.get("x-cron-secret");
  if (!secret) return false;
  // Two valid secrets on purpose: CRON_SECRET belongs to the nightly
  // cron-worker's own schedule, SCRAPE_TRIGGER_SECRET is a separate one for
  // ad-hoc/manual scrape runs - so a one-off trigger never needs rotating
  // (and thereby breaking) the nightly automation's credential.
  return (!!process.env.CRON_SECRET && secret === process.env.CRON_SECRET) || (!!process.env.SCRAPE_TRIGGER_SECRET && secret === process.env.SCRAPE_TRIGGER_SECRET);
}

/**
 * Manifest telling orchestrators (the cron-worker, the admin panel) how many
 * (site, makeIndex) units exist to loop over - avoids duplicating the make
 * lists in the cron-worker, which is a separate deployable with no access to
 * this app's source.
 */
export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(SCRAPE_MAKE_COUNTS);
}

/**
 * Triggered by an external scheduler (Cloudflare Cron Trigger, via the
 * cron-worker) or the admin "Run scrape now" button - not by anything inside
 * this app's own request cycle. Protected by a shared secret since it's an
 * unauthenticated route that kicks off outbound scraping.
 *
 * Scrapes one slice of one (site, make) page per call - see runScrapeUnit for why:
 * Cloudflare Workers' free-tier CPU budget is 10ms per request, so the
 * looping happens in the caller, not here.
 */
export async function POST(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const site = searchParams.get("site");
  const makeIndex = parseInt(searchParams.get("makeIndex") ?? "", 10);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  // One slice of the page per call (see runScrapeUnit) - callers follow the
  // response's hasMore/nextOffset to walk the rest of the page.
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

  if (!isScrapeSite(site)) {
    return NextResponse.json({ error: `invalid or missing 'site' (expected ${Object.keys(SCRAPE_SITES).join("|")})` }, { status: 400 });
  }
  if (Number.isNaN(makeIndex)) {
    return NextResponse.json({ error: "invalid or missing 'makeIndex'" }, { status: 400 });
  }

  // Create-only: cars already on the site are skipped, never updated.
  const summary = await runScrapeUnit(site, makeIndex, Math.max(1, page || 1), offset);
  return NextResponse.json(summary);
}
