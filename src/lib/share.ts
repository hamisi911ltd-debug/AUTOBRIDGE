import { formatUsd } from "@/lib/format";
import { BRAND } from "@/lib/brand";
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
    BRAND.siteName,
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
 * WhatsApp/SMS/Messages/anybody themselves. Where it doesn't exist, this
 * falls back to copying the text+link to the clipboard - NOT a WhatsApp
 * deep-link to this business's own number (that's `whatsAppLink` from
 * lib/whatsapp, correctly used for enquiries *to* the admin, but wrong
 * here: sharing a car with a friend must never pre-fill a chat straight
 * to the dealership instead of letting the person choose who to send it
 * to). A plain clipboard copy works everywhere, for any recipient.
 *
 * Tries sharing the actual photo as a file first (Web Share API Level 2) -
 * the recipient then sees exactly this car's own plain photo as an
 * attached image with the details as its caption, same as picking a photo
 * from your gallery to share. That's a stronger guarantee than a link
 * preview card, which depends on the *recipient's* app successfully
 * unfurling the URL's OG tags - not something this can control once it's
 * out of our hands. Text+link sharing (still carrying /car/[id] for a
 * click-through) is the fallback where file-sharing isn't supported.
 */
export async function shareVehicle(v: PublicVehicle, totalUsd: number): Promise<"shared" | "cancelled" | "copied" | "failed"> {
  const origin = window.location.origin;
  const url = shareUrlFor(v.id, origin);
  const text = shareTextFor(v, totalUsd);
  const title = `${v.year} ${v.make} ${v.model}`;

  if (typeof navigator.canShare === "function" && v.imageUrl) {
    try {
      const res = await fetch(`/api/og-image/${v.id}`);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], `${v.id}.jpg`, { type: blob.type || "image/jpeg" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title, text: `${text}\n${url}` });
          return "shared";
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
      // Any other failure (blob fetch, unsupported combination) - fall
      // through to the plain text+link share below rather than give up.
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (err) {
      // AbortError = the user closed the share sheet without picking
      // anything - a real cancel, not a failure, so no fallback needed.
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
