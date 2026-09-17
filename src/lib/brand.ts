/**
 * Single switch that turns this codebase's live Ferbil deployment into a
 * blank, white-label template deployment - every other branding constant
 * in this file (and the two files re-exporting from it below) derives
 * from this one flag, so standing up a new unbranded instance is just
 * "set NEXT_PUBLIC_BRAND_MODE=template and build/deploy again", never a
 * fork of the code or an ongoing second codebase to keep in sync.
 *
 * NEXT_PUBLIC_* is inlined by Next.js at *build* time, not read at
 * request time - this must be set in the shell before `next build` /
 * `opennextjs-cloudflare build` runs, not as a Workers runtime var.
 */
const IS_TEMPLATE = process.env.NEXT_PUBLIC_BRAND_MODE === "template";

export const BRAND = {
  isTemplate: IS_TEMPLATE,
  // Header/footer wordmark - short mark + a smaller line under/after it.
  shortName: IS_TEMPLATE ? "Your Company" : "FERBIL",
  tagline: IS_TEMPLATE ? "Vehicle Imports" : "Car Imports",
  // <title>, OG/Twitter tags, JSON-LD structured data.
  siteName: IS_TEMPLATE ? "Your Company Name" : "Ferbil Car Imports",
  // The Ferbil ribbon-F mark is real brand artwork, not something a
  // template deployment should show - a neutral placeholder mark instead.
  logoSrc: IS_TEMPLATE ? "/brand-placeholder-logo.svg" : "/ferbil-logo.svg",
  // The "FERBIL CAR IMPORTS" plate graphic on every vehicle photo is
  // real branding baked into a static image, not a genericizable text
  // string - a template deployment just shows the bare photo instead.
  showPlateBadge: !IS_TEMPLATE,
} as const;

/**
 * Trading-entity details for customer-facing documents (invoices,
 * quotations) and the footer/contact info. Kept in one place so every
 * surface that shows this stays identical.
 */
export const COMPANY = IS_TEMPLATE
  ? {
      name: "Your Company Name Ltd",
      poBox: "P.O Box 00000-00000",
      addressLines: ["Your Street Address", "Your City", "Your Country"],
      phone: "+000 000 000 000",
      email: "info@yourcompany.com",
      web: "www.yourcompany.com",
    }
  : {
      name: "Ferbil Interfreight Limited",
      poBox: "P.O Box 95034-00100",
      addressLines: ["Olemonana House, 2nd Floor", "Moi Avenue, Mombasa", "Mombasa, Kenya"],
      phone: "+254 725 745 777",
      email: "info@ferbil.co.ke",
      web: "www.ferbil.co.ke",
    };

/** NCBA USD account - where invoice payments are settled. Not something
 * genericizable field-by-field (a template deployment has no real bank
 * account of its own), so this is just an obvious "fill this in" row. */
export const BANK_DETAILS: { label: string; value: string }[] = IS_TEMPLATE
  ? [{ label: "Payment details", value: "Add your bank account details here" }]
  : [
      { label: "Account type", value: "USD Account" },
      { label: "Bank name", value: "NCBA" },
      { label: "Branch", value: "Tatu City" },
      { label: "Account name", value: "FERBIL INTERFREIGHT LIMITED" },
      { label: "Account number", value: "1001635557" },
      { label: "SWIFT code", value: "CBAFKENX" },
      { label: "Branch code", value: "236" },
    ];

// Obviously-fake placeholder number in template mode - wa.me links still
// render (nothing to null-check at every call site) but resolve nowhere,
// same spirit as the phone/email placeholders above.
export const WHATSAPP_NUMBER = IS_TEMPLATE ? "000000000000" : "254725745777";
