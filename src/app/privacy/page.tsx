import type { Metadata } from "next";
import Link from "next/link";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How this site collects, stores and uses your information.",
  robots: { index: true, follow: true },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold mb-2" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed space-y-2" style={{ color: COLORS.slate }}>
        {children}
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div style={{ background: COLORS.paper, minHeight: "100vh" }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/" className="text-sm font-semibold" style={{ color: COLORS.burgundy }}>
          &larr; Back to home
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold mt-4 mb-1" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
          Privacy Policy
        </h1>
        <p className="text-xs mb-8" style={{ color: COLORS.slate }}>
          Last updated 2026
        </p>

        <Section title="What we collect">
          <p>
            When you submit an enquiry about a vehicle, we collect your name, phone number, and optionally your email address and a
            message, only what you type into that form. This is used to contact you about the vehicle you asked about, and nothing
            else.
          </p>
        </Section>

        <Section title="What we don't collect">
          <p>
            We don&apos;t collect payment details on this site. Vehicle purchases are arranged directly with our team. We don&apos;t
            require an account or login to browse, compare, or save vehicles.
          </p>
        </Section>

        <Section title="Your browser's local storage">
          <p>
            Saved vehicles, your comparison list, and whether you&apos;ve accepted this policy are stored only in your own browser
            (via <code>localStorage</code>), not on our servers. Clearing your browser data clears these too.
          </p>
        </Section>

        <Section title="WhatsApp">
          <p>
            Sending an enquiry can also open a pre-filled WhatsApp chat to reach us faster. Once you&apos;re in WhatsApp,
            that conversation is subject to WhatsApp/Meta&apos;s own privacy policy, not ours.
          </p>
        </Section>

        <Section title="Vehicle listings">
          <p>
            Vehicle details and photos are sourced from public listings on exporter sites (such as BE FORWARD and SBT Japan) or
            entered directly by our team. This data describes the vehicles for sale, not you.
          </p>
        </Section>

        <Section title="Hosting and third parties">
          <p>
            This site is hosted on Cloudflare. Some images (vehicle photos, country flags) are loaded from external CDNs, which, like
            any website loading external resources, may see your IP address when those images load.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about this policy or your data can be sent through the enquiry form on any vehicle listing, or via WhatsApp using
            the chat button on the site.
          </p>
        </Section>
      </div>
    </div>
  );
}
