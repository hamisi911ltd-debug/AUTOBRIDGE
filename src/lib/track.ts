"use client";

/**
 * Anonymous traffic tracking for the admin "Activity" page - page views,
 * which vehicles get clicked into, and quote downloads. No name, email,
 * phone or IP is ever sent; `visitorId` is a random id this browser makes
 * for itself (see src/app/privacy). Fire-and-forget: a tracking call never
 * throws, blocks navigation, or is awaited by its caller.
 */

const VISITOR_KEY = "ferbil:visitor:v1";

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `v${Date.now()}${Math.random().toString(36).slice(2)}`;
  }
}

/** Stable per-browser id, created once and reused - not sent anywhere except our own /api/track. */
function getVisitorId(): string | null {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null; // localStorage unavailable - event still sends, just without a visitor id
  }
}

export type TrackVehicle = { id: string; make: string; model: string; year: number };

function send(body: Record<string, unknown>) {
  try {
    const payload = JSON.stringify({ ...body, visitorId: getVisitorId() });
    // sendBeacon survives the page unloading (e.g. clicking "print" then
    // closing the tab); fetch with keepalive is the fallback where it's
    // unavailable. Either way this never awaits or throws into the caller.
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const ok = navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      if (ok) return;
    }
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
  } catch {
    // Tracking must never be the reason a real interaction fails.
  }
}

export function trackPageView(path: string) {
  send({ type: "PAGE_VIEW", path });
}

export function trackVehicleView(vehicle: TrackVehicle, path: string) {
  send({ type: "VEHICLE_VIEW", path, vehicleId: vehicle.id, vehicleMake: vehicle.make, vehicleModel: vehicle.model, vehicleYear: vehicle.year });
}

export function trackQuoteDownload(vehicle: TrackVehicle | null, path: string) {
  send({
    type: "QUOTE_DOWNLOAD",
    path,
    vehicleId: vehicle?.id,
    vehicleMake: vehicle?.make,
    vehicleModel: vehicle?.model,
    vehicleYear: vehicle?.year,
  });
}
