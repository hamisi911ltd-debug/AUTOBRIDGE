import type { MetadataRoute } from "next";

const SITE_URL = "https://autobridge-kenya-web.glotech.workers.dev";

// Deliberately just the homepage: Search/Detail/Compare are client-side view
// states within one page (see AutoBridgeApp), not separate crawlable URLs, so
// there is nothing else real to list here yet. Giving individual vehicles
// their own indexable URL (e.g. /vehicles/[id]) would be the single biggest
// lever for organic search traffic on a listings site like this, but that's
// a real routing change, not a sitemap edit.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 }];
}
