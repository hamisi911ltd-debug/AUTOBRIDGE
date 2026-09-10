import { NextResponse } from "next/server";
import { runScrapeUnit, SCRAPE_MAKE_COUNTS, type ScrapeSite } from "@/lib/scrapers/runScrape";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function checkAuth(req: Request): boolean {
  const secret = req.headers.get("x-cron-secret");
  if (!secret) return false;
  // Two valid secrets on purpose: CRON_SECRET belongs to the nightly
  // cron-worker's own schedule, SCRAPE_TRIGGER_SECRET is a separate one for
  // ad-hoc/manual scrape runs — so a one-off trigger never needs rotating
  // (and thereby breaking) the nightly automation's credential.
  return (!!process.env.CRON_SECRET && secret === process.env.CRON_SECRET) || (!!process.env.SCRAPE_TRIGGER_SECRET && secret === process.env.SCRAPE_TRIGGER_SECRET);
}

/**
 * Manifest telling orchestrators (the cron-worker, the admin panel) how many
 * (site, makeIndex) units exist to loop over — avoids duplicating the make
 * lists in the cron-worker, which is a separate deployable with no access to
 * this app's source.
 */
export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(SCRAPE_MAKE_COUNTS);
}

/**
 * Triggered by an external scheduler (Cloudflare Cron Trigger, via the
 * cron-worker) or the admin "Run scrape now" button — not by anything inside
 * this app's own request cycle. Protected by a shared secret since it's an
 * unauthenticated route that kicks off outbound scraping.
 *
 * Scrapes exactly one (site, make) page per call — see runScrapeUnit for why:
 * Cloudflare Workers' free-tier CPU budget is 10ms per request, so the
 * looping happens in the caller, not here.
 */
export async function POST(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const site = searchParams.get("site");
  const makeIndex = parseInt(searchParams.get("makeIndex") ?? "", 10);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  // Refreshes price/country/spec accuracy on vehicles already in the
  // catalogue without letting it grow — a newly-discovered listing is
  // skipped rather than created.
  const refreshOnly = searchParams.get("refreshOnly") === "true";

  if (site !== "beforward" && site !== "sbtjapan" && site !== "dubicars") {
    return NextResponse.json({ error: "invalid or missing 'site' (expected beforward|sbtjapan|dubicars)" }, { status: 400 });
  }
  if (Number.isNaN(makeIndex)) {
    return NextResponse.json({ error: "invalid or missing 'makeIndex'" }, { status: 400 });
  }

  const summary = await runScrapeUnit(site as ScrapeSite, makeIndex, page, refreshOnly);
  return NextResponse.json(summary);
}
