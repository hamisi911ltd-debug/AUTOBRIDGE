"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { whatsAppLink, vehicleDetailBlock } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import type { PublicVehicle } from "@/types/vehicle";

const SHOW_AFTER_MS = 1100;

/**
 * A promotional pop-up (not a plain banner) offered once per vehicle view,
 * a beat after the page itself has rendered, inviting a shopper straight
 * into WhatsApp for more photos/video rather than the slower "fill in the
 * enquiry form" path. Keyed by the caller on vehicle.id so opening a
 * different vehicle (including via "similar vehicles") shows it again;
 * dismissing it only silences it for the vehicle currently being viewed.
 *
 * The image box's aspect ratio is set from the photo's own natural
 * dimensions once it loads (not a fixed 4:3) so the photo always fills the
 * box exactly — no letterboxed brand-color bars down the sides, which a
 * fixed ratio produced whenever a photo's real proportions didn't match it.
 */
export function MorePhotosPoster({ vehicle }: { vehicle: PublicVehicle }) {
  const [visible, setVisible] = useState(false);
  const [ratio, setRatio] = useState(4 / 3);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  if (!visible) return null;

  const ref = `AB-${vehicle.id.slice(-7).toUpperCase()}`;
  const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? " " + vehicle.trim : ""}`;
  const waText = [
    `More photos request`,
    vehicleDetailBlock(vehicle, ref, window.location.origin),
    `Could you send more photos, extra angles and a video if available?`,
  ].join("\n");

  function requestPhotos() {
    window.open(whatsAppLink(waText), "_blank", "noopener,noreferrer");
    setVisible(false);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(11,31,58,0.6)", backdropFilter: "blur(2px)" }}
      onClick={() => setVisible(false)}
    >
      <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl" style={{ background: "#fff", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
        {/* The box takes the photo's own aspect ratio once it loads, so the
           photo fills it exactly with no unfilled brand-color space down
           either side. */}
        <div className="relative w-full" style={{ aspectRatio: ratio, background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyDeep})` }}>
          {vehicle.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- external CDN, many hosts
            <img
              src={vehicle.imageUrl}
              alt={label}
              className="absolute inset-0 w-full h-full object-contain"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
              }}
            />
          )}
          <button
            onClick={() => setVisible(false)}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(11,31,58,0.6)" }}
          >
            <X size={16} color="#fff" />
          </button>
          {/* Same white strip used on every other card photo, over the
             exact spot the source site stamps its own watermark. */}
          <div className="absolute bottom-0 inset-x-0 h-6 sm:h-[24px] bg-white flex items-center justify-center gap-1">
            <span className="text-[8px] sm:text-[9px] font-bold" style={{ color: "#F2762E" }}>
              {vehicle.year} &middot; {vehicle.sourceCountry}
            </span>
          </div>
        </div>

        {/* Small space at the bottom, just the car name, prompt and the two actions. */}
        <div className="p-3.5">
          <p className="text-sm font-semibold text-center" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            {label}
          </p>
          <p className="text-xs text-center mt-1 mb-2.5" style={{ color: COLORS.slate }}>
            Want more photos of this car? Ask us on WhatsApp, or dismiss and keep browsing.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVisible(false)}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white"
              style={{ background: "#DC2626" }}
            >
              Cancel
            </button>
            <button
              onClick={requestPhotos}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold text-white"
              style={{ background: "#25D366" }}
            >
              <WhatsAppIcon size={16} /> WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
