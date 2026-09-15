import { formatUsd } from "@/lib/format";
import type { PublicVehicle } from "@/types/vehicle";

/**
 * Text for sharing a vehicle "as a post" - name, price and spec, meant to
 * stand alone even before a link preview (WhatsApp/etc.) renders the
 * /car/[id] page's own OG image alongside it.
 */
export function shareTextFor(v: PublicVehicle, totalUsd: number): string {
  return [
    `${v.year} ${v.make} ${v.model}${v.trim ? " " + v.trim : ""}`,
    `${formatUsd(totalUsd)} incl. freight & insurance to Mombasa`,
    `${v.mileageKm.toLocaleString()} km · ${v.transmission} · ${v.fuel} · from ${v.sourceCountry}`,
    "Ferbil Car Imports",
  ].join("\n");
}

/**
 * A real, server-rendered URL (unlike every other in-app "page", which is
 * just client state) - /car/[id] carries this specific vehicle's own OG
 * tags, so sharing it is what makes WhatsApp/etc. actually unfurl a card
 * with this car's photo and price, not just a bare link.
 */
export function shareUrlFor(id: string, origin: string): string {
  return `${origin}/car/${id}`;
}

/**
 * Web Share API where it exists (mobile browsers, and most desktop
 * browsers now) - the OS-native share sheet, letting someone pick
 * WhatsApp/SMS/Messages/etc. themselves. Falls back to a WhatsApp
 * deep-link where it doesn't, since that's already this business's own
 * primary channel, rather than a bare clipboard copy with no next step.
 */
export async function shareVehicle(v: PublicVehicle, totalUsd: number): Promise<"shared" | "cancelled" | "fallback"> {
  const origin = window.location.origin;
  const url = shareUrlFor(v.id, origin);
  const text = shareTextFor(v, totalUsd);

  if (navigator.share) {
    try {
      await navigator.share({ title: `${v.year} ${v.make} ${v.model}`, text, url });
      return "shared";
    } catch (err) {
      // AbortError = the user closed the share sheet without picking
      // anything - a real cancel, not a failure, so no fallback needed.
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
    }
  }

  const { whatsAppLink } = await import("@/lib/whatsapp");
  window.open(whatsAppLink(`${text}\n${url}`), "_blank", "noopener,noreferrer");
  return "fallback";
}
