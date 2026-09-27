import { isRelayedHost } from "@/lib/imageProxy";
import { imageRequestHeaders } from "@/lib/scrapers/coverImage";

/**
 * Relays vehicle photos from source hosts that block direct browser loads
 * (see src/lib/imageProxy.ts). Only allow-listed hosts are relayed, so this
 * can't be used as an open proxy. Cloudflare caches the upstream fetch and
 * browsers cache the response, so each photo is fetched from the source
 * rarely.
 */
export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get("u");
  let url: URL;
  try {
    url = new URL(target ?? "");
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (url.protocol !== "https:" || !isRelayedHost(url.hostname)) return new Response("host not allowed", { status: 403 });

  let upstream: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      upstream = await fetch(url.toString(), {
        headers: { ...imageRequestHeaders(url.toString()), Accept: "image/*" },
        // Cloudflare edge cache for the upstream photo (ignored off Cloudflare).
        cf: { cacheEverything: true, cacheTtl: 60 * 60 * 24 * 30 },
      } as RequestInit);
    } catch {
      upstream = null;
    }
    // JPC Trade throttles bursts with 429 - a short wait usually clears it.
    if (upstream?.status !== 429) break;
    await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
  }

  const type = upstream?.headers.get("content-type") ?? "";
  if (!upstream || !upstream.ok || !upstream.body || !type.startsWith("image/")) {
    // A real error status, so the page's <img> onError moves on to the next photo.
    return new Response("image unavailable", { status: 502, headers: { "Cache-Control": "public, max-age=300" } });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=2592000, immutable",
    },
  });
}
