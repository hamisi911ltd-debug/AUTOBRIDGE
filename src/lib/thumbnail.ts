/**
 * Historically rewrote a vehicle photo URL to a smaller CDN-provided
 * variant for card/thumbnail contexts. Retired after two rounds of visible
 * quality complaints: BE FORWARD's "/medium/" path is a fixed 200x150 (very
 * blurry once stretched to a real card width), and even a "?w=400" resize
 * on the "large" path still looked noticeably soft on wider grid cards.
 * The full "large" photo already stored in R2 is only ~30-40KB, which is
 * small enough on its own - not worth trading visible quality for - so
 * this is now a pass-through and every context (cards, gallery, detail
 * hero) shows the same full-quality photo. Kept as a named function rather
 * than inlining `src` everywhere it's called, so a real resize strategy
 * (e.g. a proper image-resizing service) can slot back in later without
 * touching every call site.
 */
export function thumbnailUrl(url: string): string {
  return url;
}
