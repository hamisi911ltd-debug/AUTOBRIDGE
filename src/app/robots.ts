import type { MetadataRoute } from "next";

const SITE_URL = "https://autobridge-kenya-web.glotech.workers.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/login"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
