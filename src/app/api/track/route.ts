import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["PAGE_VIEW", "VEHICLE_VIEW", "QUOTE_DOWNLOAD"]);
// A path/id this long isn't a real route or cuid - reject rather than store
// junk (or something someone's deliberately trying to stuff in here).
const MAX_LEN = 300;

function str(v: unknown): string | null {
  if (typeof v !== "string" || v.length === 0 || v.length > MAX_LEN) return null;
  return v;
}

/**
 * Records one anonymous traffic event (see src/lib/track.ts for what gets
 * sent and why). Deliberately unauthenticated - it's called from every
 * visitor's browser, not just admins - and deliberately silent on bad
 * input: a malformed beacon should never surface as a visible error to a
 * real visitor, it should just be dropped.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    // sendBeacon posts a Blob with no explicit content-type guarantee across
    // browsers, so this reads it as text and parses JSON itself rather than
    // relying on req.json() to infer the body type correctly.
    body = JSON.parse(await req.text());
  } catch {
    return new Response(null, { status: 204 });
  }

  const type = str(body.type);
  if (!type || !VALID_TYPES.has(type)) return new Response(null, { status: 204 });

  const yearRaw = body.vehicleYear;
  const vehicleYear = typeof yearRaw === "number" && Number.isFinite(yearRaw) ? Math.round(yearRaw) : null;

  try {
    await prisma.siteEvent.create({
      data: {
        type: type as "PAGE_VIEW" | "VEHICLE_VIEW" | "QUOTE_DOWNLOAD",
        path: str(body.path),
        vehicleId: str(body.vehicleId),
        vehicleMake: str(body.vehicleMake),
        vehicleModel: str(body.vehicleModel),
        vehicleYear,
        visitorId: str(body.visitorId),
      },
    });
  } catch (err) {
    // Never let a tracking hiccup show up as a failed request to the
    // visitor's browser - log it server-side and move on.
    console.error("[track] failed to record event:", err);
  }

  return new Response(null, { status: 204 });
}
