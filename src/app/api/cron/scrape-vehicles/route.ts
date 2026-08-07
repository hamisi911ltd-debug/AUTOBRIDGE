import { NextResponse } from "next/server";
import { runScrape } from "@/lib/scrapers/runScrape";

export const maxDuration = 300; // scraping several pages across two sites can take a while

/**
 * Triggered by an external scheduler (Cloudflare Cron Trigger, GitHub Actions,
 * etc.) — not by anything inside this app. Protected by a shared secret since
 * it's an unauthenticated route that kicks off outbound scraping.
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const summary = await runScrape(2);
  return NextResponse.json(summary);
}
