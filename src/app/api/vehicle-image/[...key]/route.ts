import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- R2Bucket type comes from @cloudflare/workers-types, not worth pulling in just for this cast (same convention as src/lib/prisma.ts)
type CloudflareEnv = { VEHICLE_IMAGES?: any };

/** Serves a vehicle photo migrated into our own R2 bucket (see src/lib/imageMigration.ts), so the public site loads images from Cloudflare's own network instead of hotlinking the original scraper sites' CDNs. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const { env } = getCloudflareContext() as { env: CloudflareEnv };
  const bucket = env.VEHICLE_IMAGES;
  if (!bucket) return new Response("Not configured", { status: 500 });

  const object = await bucket.get(key.join("/"));
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag);

  return new Response(object.body, { headers });
}
