import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

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

const SITE_URL = "https://autobridge-kenya-web.glotech.workers.dev";
const SITE_NAME = "Ferbil Autos";
const SITE_DESCRIPTION =
  "Browse real, import-eligible vehicles from Japan and the UAE with total price (vehicle plus freight & insurance) shown upfront on every listing. Ferbil Autos is Kenya's vehicle import marketplace.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Kenya's Vehicle Import Marketplace`, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: [
    "import cars Kenya",
    "buy car Kenya",
    "Japan used cars Kenya",
    "UAE used cars Kenya",
    "car import marketplace Kenya",
    "Toyota import Kenya",
    "vehicle import Kenya",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Kenya's Vehicle Import Marketplace`,
    description: SITE_DESCRIPTION,
    locale: "en_KE",
    images: [{ url: "/logo.png", width: 68, height: 42, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — Kenya's Vehicle Import Marketplace`,
    description: SITE_DESCRIPTION,
    images: ["/logo.png"],
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
