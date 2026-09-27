export interface Env {
  TARGET_URL: string;
  CRON_SECRET: string;
}

type ScrapeSite = "beforward" | "sbtjapan" | "dubicars";

/**
 * The app's /api/cron/scrape-vehicles route scrapes one (site, make) page
 * per request — Cloudflare Workers' free-tier CPU budget is 10ms per
 * request, and parsing dozens of pages in a single invocation blew past
 * that. So the looping over every make lives here instead: this worker just
 * sequences plain fetch() calls (I/O wait, not CPU), which doesn't threaten
 * its own CPU budget no matter how many makes there are.
 */
export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const base = env.TARGET_URL.replace(/\/$/, "");
        const headers = { "x-cron-secret": env.CRON_SECRET };

        const manifestRes = await fetch(`${base}/api/cron/scrape-vehicles`, { headers });
        if (!manifestRes.ok) {
          throw new Error(`manifest fetch failed: ${manifestRes.status} ${await manifestRes.text()}`);
        }
        const manifest: Record<ScrapeSite, number> = await manifestRes.json();

        let totalFound = 0;
        let created = 0;
        let existing = 0;
        let errors = 0;

        for (const site of Object.keys(manifest) as ScrapeSite[]) {
          for (let makeIndex = 0; makeIndex < manifest[site]; makeIndex++) {
            // Each call handles one slice of the page; follow nextOffset
            // until the page is exhausted. The cap guards against a bad
            // response ever looping forever.
            let offset = 0;
            for (let slice = 0; slice < 20; slice++) {
              const url = `${base}/api/cron/scrape-vehicles?site=${site}&makeIndex=${makeIndex}&page=1&offset=${offset}`;
              try {
                const res = await fetch(url, { method: "POST", headers });
                const body = await res.json<{ found: number; created: number; existing?: number; errors: number; hasMore?: boolean; nextOffset?: number }>();
                if (!res.ok) {
                  errors++;
                  console.error(`[nightly-scrape] ${site}[${makeIndex}] offset=${offset} failed: ${res.status}`, body);
                  break;
                }
                totalFound += body.found;
                created += body.created;
                existing += body.existing ?? 0;
                errors += body.errors;
                if (!body.hasMore || typeof body.nextOffset !== "number" || body.nextOffset <= offset) break;
                offset = body.nextOffset;
              } catch (err) {
                errors++;
                console.error(`[nightly-scrape] ${site}[${makeIndex}] offset=${offset} request failed:`, err);
                break;
              }
            }
          }
        }

        console.log(`[nightly-scrape] done — found=${totalFound} created=${created} alreadyListed=${existing} errors=${errors}`);
      })()
    );
  },
};
