export interface Env {
  TARGET_URL: string;
  CRON_SECRET: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const url = `${env.TARGET_URL.replace(/\/$/, "")}/api/cron/scrape-vehicles`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "x-cron-secret": env.CRON_SECRET },
        });
        const body = await res.text();
        console.log(`[nightly-scrape] ${res.status} ${body}`);
        if (!res.ok) throw new Error(`scrape trigger failed: ${res.status} ${body}`);
      })()
    );
  },
};
