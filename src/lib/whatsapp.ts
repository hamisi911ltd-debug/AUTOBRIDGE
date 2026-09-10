import { formatUsd } from "@/lib/format";
import type { PublicVehicle } from "@/types/vehicle";

export const WHATSAPP_NUMBER = "254725745777";

export function whatsAppLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Every client-triggered WhatsApp message (enquiry, quote request, "send
 * more photos") ends up as the admin's own notification, since there's no
 * server-side WhatsApp API here, only this wa.me deep-link pattern. Reusing
 * one detail block everywhere means the admin always gets the same full
 * picture, and always gets a link straight to the vehicle in /admin — from
 * there the existing "Original listing" link tracks it back to the
 * exporter's own page, which is why this only needs to carry the internal
 * admin link, not the source URL itself (that stays out of anything a
 * customer's own chat draft could show them).
 */
export function vehicleDetailBlock(v: Pick<PublicVehicle, "id" | "year" | "make" | "model" | "trim" | "mileageKm" | "fuel" | "transmission" | "sourceCountry" | "sellingPriceUsd">, ref: string, origin: string): string {
  return [
    `Vehicle: ${v.year} ${v.make} ${v.model}${v.trim ? " " + v.trim : ""} (Ref ${ref})`,
    `Spec: ${v.mileageKm.toLocaleString()} km, ${v.fuel}, ${v.transmission}, from ${v.sourceCountry}`,
    `Listed price: ${formatUsd(v.sellingPriceUsd)}`,
    `View in admin: ${origin}/admin/vehicles/${v.id}/edit`,
  ].join("\n");
}
