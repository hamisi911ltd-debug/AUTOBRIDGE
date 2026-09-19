import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { BRAND } from "@/lib/brand";

/**
 * Real, static, crawlable paragraph copy about the business itself - not
 * another car listing. The homepage otherwise reads to a search engine as
 * almost entirely a rotating grid of vehicle cards with no page-level
 * text explaining who runs it, what it actually does, or where its stock
 * comes from - this is what a search result's own description/snippet and
 * general relevance ranking for brand + service queries ("Ferbil Car
 * Imports", "import cars from Japan to Kenya") actually draws on, on top
 * of the meta description in layout.tsx.
 */
export function AboutSection() {
  if (BRAND.isTemplate) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-10 h-1 rounded-full mb-3" style={{ background: COLORS.gold }} />
      <h2 className="text-xl sm:text-2xl font-semibold mb-3" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
        About Ferbil Car Imports
      </h2>
      <div className="grid sm:grid-cols-2 gap-6 text-sm leading-relaxed" style={{ color: COLORS.slate }}>
        <p>
          Ferbil Car Imports is Kenya&apos;s vehicle import marketplace - we source real, import-eligible used cars
          directly from trusted exporters in Japan, the UK and the UAE, and bring them in on our own, without a
          third-party clearing agent in between. Every listing shows the total landed price upfront: the vehicle
          itself plus ocean freight and marine insurance to Mombasa, so what you see is what the car actually costs
          before KRA duty and clearing.
        </p>
        <p>
          Beyond browsing and buying, we handle the parts most importers find hardest: shipping by RoRo vessel,
          port clearance at Mombasa, KRA duty/excise/VAT, and NTSA registration, all managed in-house so a car
          arrives ready to drive rather than stuck in paperwork. Popular imports include Toyota (Vitz, Axio,
          Premio, Harrier, Land Cruiser), Nissan (Note, X-Trail), Mazda (Demio, CX-5), Subaru Forester and Honda
          Fit - or search the full catalogue for whatever you&apos;re after.
        </p>
      </div>
    </section>
  );
}
