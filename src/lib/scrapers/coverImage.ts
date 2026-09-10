import { Buffer } from "node:buffer";

const USER_AGENT = "Mozilla/5.0 (compatible; AutoBridgeKenyaBot/1.0; nightly inventory sync)";

/**
 * The listing-page thumbnail is unreliable: BE FORWARD's ?w= resize param
 * is honored on some listings and silently ignored on others — some now
 * serve a genuine 200x150 thumbnail no matter what width is requested.
 * The real photo always lives on the detail page's gallery, so this is the
 * one place worth spending an extra couple of subrequests per vehicle: one
 * to fetch the detail page HTML, one to fetch the photo itself (also used
 * to measure its real width, so getPublicVehicles' quality gate has an
 * accurate number from the moment the vehicle is first scraped).
 */
export async function fetchCoverImage(
  site: "beforward" | "sbtjapan",
  detailUrl: string
): Promise<{ url: string; widthPx: number } | "rate-limited" | null> {
  try {
    const detailRes = await fetch(detailUrl, { headers: { "User-Agent": USER_AGENT } });
    if (detailRes.status === 429) return "rate-limited";
    if (!detailRes.ok) {
      console.error(`[fetchCoverImage] detail fetch ${detailRes.status} for ${detailUrl}`);
      return null;
    }
    const html = await detailRes.text();

    const imageUrl = extractCoverImageUrl(site, html);
    if (!imageUrl) {
      console.error(`[fetchCoverImage] no image match in detail HTML (len=${html.length}) for ${detailUrl}`);
      return null;
    }

    const widthPx = await measureImageWidthPx(imageUrl);
    if (!widthPx) {
      console.error(`[fetchCoverImage] width measurement failed for ${imageUrl}`);
      return null;
    }

    return { url: imageUrl, widthPx };
  } catch (err) {
    console.error(`[fetchCoverImage] threw for ${detailUrl}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/** Ranged fetch + JPEG SOF-marker parse — the real dimensions are always within the first few KB. */
export async function measureImageWidthPx(imageUrl: string | null): Promise<number | null> {
  if (!imageUrl) return null;
  try {
    const res = await fetch(imageUrl, { headers: { "User-Agent": USER_AGENT, Range: "bytes=0-65535" } });
    if (!res.ok && res.status !== 206) {
      console.error(`[measureImageWidthPx] fetch ${res.status} for ${imageUrl}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const width = jpegWidth(buf);
    if (!width) console.error(`[measureImageWidthPx] no SOF marker found (${buf.length} bytes) for ${imageUrl}`);
    return width;
  } catch (err) {
    console.error(`[measureImageWidthPx] threw for ${imageUrl}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function extractCoverImageUrl(site: "beforward" | "sbtjapan", html: string): string | null {
  if (site === "beforward") {
    const match = html.match(/https?:\/\/image-cdn\.beforward\.jp\/large\/[^\s"'<>]+\.jpe?g/i);
    return match ? match[0] : null;
  }

  const match = html.match(/https?:\/\/img\.sbtjapan\.com\/img\/carphoto\/[^\s"'<>]+\.jpe?g/i);
  if (!match) return null;
  const url = new URL(match[0]);
  url.searchParams.set("imwidth", "1200");
  return url.toString();
}

function jpegWidth(buf: Buffer): number | null {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) return buf.readUInt16BE(i + 7);
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
}
