import { getPublicVehicleById } from "@/lib/getPublicVehicles";

export const dynamic = "force-dynamic";

/**
 * Proxies a vehicle's own photo through our own domain for use as its
 * /car/[id] share-link preview image. Pointing og:image straight at the
 * source scraper site's CDN was unreliable - several of them (confirmed:
 * BE FORWARD's image-cdn) serve the image fine to a normal browser
 * `<img>` tag but reject or hang for link-preview crawlers (WhatsApp,
 * Facebook, etc.) specifically, by user-agent - so the share message
 * would post with no image at all. Fetching it server-side here and
 * re-serving it ourselves sidesteps that entirely: the crawler only ever
 * talks to our own domain, which it always trusts.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = new URL(req.url).origin;
  const fallback = () => Response.redirect(`${origin}/og-image.jpg`, 302);

  const vehicle = await getPublicVehicleById(id);
  if (!vehicle?.imageUrl) return fallback();

  let upstream: Response;
  try {
    upstream = await fetch(vehicle.imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "image/*",
      },
    });
  } catch {
    return fallback();
  }
  if (!upstream.ok || !upstream.body) return fallback();

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") ?? "image/jpeg");
  headers.set("Cache-Control", "public, max-age=86400");
  return new Response(upstream.body, { headers });
}
