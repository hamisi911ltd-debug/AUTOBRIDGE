import type { Metadata } from "next";
import "./globals.css";
import { VersionWatcher } from "@/components/layout/VersionWatcher";
import { BRAND, COMPANY } from "@/lib/brand";

// Each deployment's own URL - must be set at build time (see lib/brand.ts)
// for a template deployment, since it's baked into metadataBase/OG/canonical
// tags, not something resolvable at request time in a static export of them.
// Defaults to the real custom domain (not the workers.dev address) since
// that's what's actually connected in Cloudflare and what Search Console
// verifies - a sitemap whose listed URLs point to a different host than
// the one it's served from is rejected outright ("Invalid sitemap
// address"), which is exactly what shipped here before this default was
// wrong.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ferbilcarimports.com";
const SITE_NAME = BRAND.siteName;
const OG_IMAGE = BRAND.isTemplate ? "/og-image-template.jpg" : "/og-image.jpg";
const SITE_DESCRIPTION = BRAND.isTemplate
  ? "A ready-to-brand vehicle import marketplace template - total landed price shown upfront on every listing."
  : "Ferbil Car Imports - Kenya's trusted vehicle import marketplace. Real, import-eligible cars sourced from Japan, the UK, the UAE and beyond, with the total landed price (vehicle plus freight & insurance) shown upfront on every listing, no hidden costs.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: BRAND.isTemplate
    ? ["vehicle import marketplace template", "car dealership website template"]
    : [
        "Ferbil",
        "Ferbil Car Imports",
        "Ferbil Kenya",
        "Ferbil Interfreight",
        "import cars Kenya",
        "buy car Kenya",
        "Japan used cars Kenya",
        "UK used cars Kenya",
        "UAE used cars Kenya",
        "car import marketplace Kenya",
        "best car importer Kenya",
        "Toyota import Kenya",
        "vehicle import Kenya",
        "landed cost car Kenya",
      ],
  alternates: { canonical: "/" },
  robots: BRAND.isTemplate ? { index: false, follow: false } : { index: true, follow: true },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "en_KE",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

// AutoDealer (what actually earns a dealer-style listing in Google, with
// phone/rating eligibility) plus WebSite+SearchAction - the one piece of
// sitelink-adjacent behavior a site can actually opt into (the "sitelinks
// search box" under the main result). Which, if any, sitelinks Google
// shows beneath the main result is otherwise entirely its own algorithmic
// call based on site structure and authority, not something any one piece
// of markup can force - real, consistently-linked pages (nav, footer,
// /car/[id] on every listing) are what earns that over time.
const dealerSchema = {
  "@context": "https://schema.org",
  "@type": "AutoDealer",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  telephone: BRAND.isTemplate ? undefined : COMPANY.phone,
  email: BRAND.isTemplate ? undefined : COMPANY.email,
  areaServed: { "@type": "Country", name: "Kenya" },
  address: { "@type": "PostalAddress", addressCountry: "KE" },
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dealerSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }} />
      </head>
      <body className="min-h-full flex flex-col">
        <VersionWatcher />
        {children}
      </body>
    </html>
  );
}
