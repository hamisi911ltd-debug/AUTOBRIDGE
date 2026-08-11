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
        let updated = 0;
        let errors = 0;

        for (const site of Object.keys(manifest) as ScrapeSite[]) {
          for (let makeIndex = 0; makeIndex < manifest[site]; makeIndex++) {
            const url = `${base}/api/cron/scrape-vehicles?site=${site}&makeIndex=${makeIndex}&page=1`;
            try {
              const res = await fetch(url, { method: "POST", headers });
              const body = await res.json<{ found: number; created: number; updated: number; errors: number }>();
              if (!res.ok) {
                errors++;
                console.error(`[nightly-scrape] ${site}[${makeIndex}] failed: ${res.status}`, body);
                continue;
              }
              totalFound += body.found;
              created += body.created;
              updated += body.updated;
              errors += body.errors;
            } catch (err) {
              errors++;
              console.error(`[nightly-scrape] ${site}[${makeIndex}] request failed:`, err);
            }
          }
        }

        console.log(`[nightly-scrape] done — found=${totalFound} created=${created} updated=${updated} errors=${errors}`);
      })()
    );
  },
};
