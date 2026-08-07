# AutoBridge

A Kenya-focused vehicle import marketplace. Customers browse foreign-used
cars (2019 and newer only, per Kenya's import-age rule) with the full
landed-cost breakdown — duty, excise, VAT, freight, clearing — shown once a
specific car is selected. Inventory is kept fresh by a nightly scraper
against BE FORWARD and SBT Japan; pricing is a configurable markup engine
(reseller model — customers only ever see the final price, never the source
cost).

## Stack

Next.js 16 (App Router, TypeScript), Prisma 7 + SQLite (local dev), Auth.js
v5 (Credentials + bcrypt), Tailwind v4. Single deployable — no separate
backend service.

## Local setup

```bash
npm install
cp .env.example .env      # fill in AUTH_SECRET and CRON_SECRET, see below
npx prisma generate
npx prisma db push        # creates prisma/dev.db from schema.prisma
npx prisma db seed        # 23 sample vehicles, 1 admin user, default pricing rule
npm run dev
```

Open http://localhost:3000. Admin panel is at `/admin` — the seed script
prints the admin email/password to the console when it runs.

Generate the two secrets in `.env`:

```bash
npx auth secret            # prints a value for AUTH_SECRET
openssl rand -hex 32        # anything long/random works for CRON_SECRET
```

## Nightly inventory sync

`src/lib/scrapers/` holds two scrapers (`beforward.ts`, `sbtJapan.ts`) that
parse public listing pages and upsert into the `Vehicle` table, keyed by
`sourceSite:externalId` so re-running never creates duplicates. They cover
Toyota, Honda, Nissan, Mazda, Mitsubishi, Subaru, Suzuki and Isuzu today —
add more entries to `BEFORWARD_MAKES` / `SBT_MAKES` to widen coverage (the
site's own make-filter URL gives you the numeric id).

The route that actually runs a scrape is `POST /api/cron/scrape-vehicles`,
protected by the `x-cron-secret` header matching `CRON_SECRET`. It's meant
to be triggered by something external on a schedule — `cron-worker/` is a
small standalone Cloudflare Worker that does exactly that once a day (see
`cron-worker/README.md` for its own setup). You can also trigger a scrape
on demand from the admin dashboard's "Run scrape now" button.

Keep an eye on request volume if you add more makes/pages: if the main app
is deployed to Cloudflare Pages, each scrape run costs one outbound
subrequest per listing page fetched, and the free tier caps that at 50 per
invocation.

## Project layout

```
prisma/schema.prisma        Vehicle, PricingRule, Enquiry, User models
prisma/seed.ts               Sample data + admin user + default pricing rule
src/lib/scrapers/            BE FORWARD + SBT Japan scrapers, shared HTTP/normalize helpers
src/lib/pricing/engine.ts    Resolves the applicable PricingRule and computes selling price
src/app/                     Public site (single page, client-side view state) + /admin/*
src/components/              Public-facing UI components
cron-worker/                 Standalone Cloudflare Worker — nightly cron trigger only
```
