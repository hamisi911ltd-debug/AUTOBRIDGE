import type { MetadataRoute } from "next";
import { SITE_URL } from "@/app/layout";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/login", "/api"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
