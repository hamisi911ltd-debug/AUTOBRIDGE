/**
 * Some source sites refuse to serve their photos to pages on other domains:
 * Autocom's image host answers 403 unless the request comes from its own
 * site (hotlink protection), and JPC Trade's answers 429 when a page of
 * cards asks for many photos at once. A shopper's browser can't get round
 * either, so photos from these hosts are routed through our own
 * /api/img relay, which fetches them the way the host expects and lets
 * Cloudflare cache the result.
 */
const RELAYED_HOSTS = new Set(["assets.autocj.co.jp", "www.jpctrade.com"]);

const RELAY_PREFIX = "/api/img?u=";

export function isRelayedHost(hostname: string): boolean {
  return RELAYED_HOSTS.has(hostname);
}

/** The URL a browser should load for this stored photo URL. */
export function displayImageUrl(url: string): string {
  try {
    return isRelayedHost(new URL(url).hostname) ? `${RELAY_PREFIX}${encodeURIComponent(url)}` : url;
  } catch {
    return url; // relative (our own /api/vehicle-image/...) or malformed - leave as is
  }
}

/** Reverses displayImageUrl, for server code that fetches the photo itself. */
export function originalImageUrl(url: string): string {
  return url.startsWith(RELAY_PREFIX) ? decodeURIComponent(url.slice(RELAY_PREFIX.length)) : url;
}
