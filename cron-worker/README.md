# Nightly scrape trigger (Cloudflare Cron Trigger)

A tiny standalone Cloudflare Worker whose only job is to fire once a night and
POST to your deployed app's `/api/cron/scrape-vehicles` endpoint, which does
the actual scraping. Kept separate from the Next.js app itself so it works
regardless of how/where you deploy that app.

## Setup

1. `cd cron-worker && npm install`
2. Edit `wrangler.toml` — set `TARGET_URL` to your deployed app's real URL.
3. Set the shared secret (must match `CRON_SECRET` in the main app's `.env`):
   ```
   npx wrangler secret put CRON_SECRET
   ```
   Paste the same value that's in `autobridge-kenya-web/.env` as `CRON_SECRET`.
4. `npx wrangler deploy`

That's it — Cloudflare will fire the `scheduled` handler once a day at the
cron expression in `wrangler.toml` (default `0 23 * * *` = 23:00 UTC =
02:00 Africa/Nairobi). Change the cron expression there if you want a
different time; Cloudflare Cron Triggers are always UTC, so do the timezone
math yourself when editing it.

## Testing without waiting for 2am

```
npx wrangler deploy
npx wrangler tail          # in one terminal, to watch logs
curl -X POST "$(grep TARGET_URL wrangler.toml | cut -d'"' -f2)/api/cron/scrape-vehicles" \
  -H "x-cron-secret: <same secret>"
```

Or trigger the scheduled handler directly in local dev:
```
npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled"
```
