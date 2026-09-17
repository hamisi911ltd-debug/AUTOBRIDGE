import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { VersionWatcher } from "@/components/layout/VersionWatcher";
import { BRAND } from "@/lib/brand";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Each deployment's own URL - must be set at build time (see lib/brand.ts)
// for a template deployment, since it's baked into metadataBase/OG/canonical
// tags, not something resolvable at request time in a static export of them.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://autobridge-kenya-web.glotech.workers.dev";
const SITE_NAME = BRAND.siteName;
const OG_IMAGE = BRAND.isTemplate ? "/og-image-template.jpg" : "/og-image.jpg";
const SITE_DESCRIPTION = BRAND.isTemplate
  ? "A ready-to-brand vehicle import marketplace template - total landed price shown upfront on every listing."
  : "Browse real, import-eligible vehicles from Japan and the UAE with total price (vehicle plus freight & insurance) shown upfront on every listing. Kenya's vehicle import marketplace.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: BRAND.isTemplate
    ? ["vehicle import marketplace template", "car dealership website template"]
    : ["import cars Kenya", "buy car Kenya", "Japan used cars Kenya", "UAE used cars Kenya", "car import marketplace Kenya", "Toyota import Kenya", "vehicle import Kenya"],
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

const structuredData = {
  "@context": "https://schema.org",
  "@type": "AutoDealer",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  areaServed: { "@type": "Country", name: "Kenya" },
  address: { "@type": "PostalAddress", addressCountry: "KE" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full antialiased`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </head>
      <body className="min-h-full flex flex-col">
        <VersionWatcher />
        {children}
      </body>
    </html>
  );
}
