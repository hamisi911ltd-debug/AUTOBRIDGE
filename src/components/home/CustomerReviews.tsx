"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import type { PublicReview } from "@/types/review";

const PAGE_SIZE = 3;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Real customer feedback only, entered by an admin from an actual
 * conversation (see /admin/reviews) - never generated. Renders nothing
 * until at least one review is published, rather than showing an empty
 * "reviews" section or, worse, inventing placeholder testimonials.
 *
 * A snap-scroll carousel, 3 cards per page (stacked to 1 on mobile) - both
 * nav arrows sit together on one side (top-right), same as the pagination
 * dots below, which cluster as one group rather than spreading edge to
 * edge. Cards share a fixed height via flex + line-clamp so a short review
 * and a long one still read as the same size, matched with "See full
 * review" to expand in place instead of a separate page.
 */
export function CustomerReviews({ reviews }: { reviews: PublicReview[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  if (reviews.length === 0) return null;

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const pages = chunk(reviews.slice(0, 12), PAGE_SIZE);

  function scrollToPage(i: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(pages.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setPageIndex(clamped);
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setPageIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <style>{`.reviews-scroller::-webkit-scrollbar { display: none; }`}</style>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="w-10 h-1 rounded-full mb-3" style={{ background: COLORS.gold }} />
          <h2 className="text-2xl sm:text-3xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            What our customers say
          </h2>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={14} fill={n <= Math.round(avg) ? COLORS.gold : "none"} color={COLORS.gold} />
              ))}
            </div>
            <span className="text-xs font-medium" style={{ color: COLORS.slate }}>
              {avg.toFixed(1)} &middot; {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Both nav arrows sit together on one side, not split apart. */}
        {pages.length > 1 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => scrollToPage(pageIndex - 1)}
              disabled={pageIndex === 0}
              aria-label="Previous reviews"
              className="w-9 h-9 rounded-full border flex items-center justify-center disabled:opacity-40"
              style={{ borderColor: COLORS.line, color: COLORS.navy }}
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={() => scrollToPage(pageIndex + 1)}
              disabled={pageIndex === pages.length - 1}
              aria-label="Next reviews"
              className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 text-white"
              style={{ background: COLORS.burgundy }}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="reviews-scroller flex overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
        style={{ scrollbarWidth: "none" }}
      >
        {pages.map((page, i) => (
          <div key={i} className="w-full shrink-0 snap-start grid grid-cols-1 sm:grid-cols-3 gap-5 pr-0">
            {page.map((r) => {
              const isExpanded = expanded.has(r.id);
              return (
                <div key={r.id} className="rounded-2xl border p-5 flex flex-col h-full" style={{ borderColor: COLORS.line, background: COLORS.card }}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={14} fill={n <= r.rating ? COLORS.gold : "none"} color={COLORS.gold} />
                      ))}
                    </div>
                    <span className="text-base leading-none" aria-hidden>
                      🇰🇪
                    </span>
                  </div>

                  {r.vehicleLabel && (
                    <div className="text-sm font-bold mb-1.5" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
                      {r.vehicleLabel}
                    </div>
                  )}

                  {r.photoUrl && isExpanded && (
                    // eslint-disable-next-line @next/next/no-img-element -- admin-entered external URL
                    <img src={r.photoUrl} alt={`${r.customerName}'s car`} className="w-full h-36 object-cover rounded-xl mb-2.5" />
                  )}

                  <p className={`text-sm flex-1 ${isExpanded ? "" : "line-clamp-4"}`} style={{ color: COLORS.ink }}>
                    &ldquo;{r.text}&rdquo;
                  </p>

                  <div className="mt-3 pt-3 flex items-center justify-between gap-2 border-t" style={{ borderColor: COLORS.line }}>
                    <div className="flex items-center gap-2 min-w-0">
                      {r.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- admin-entered external URL
                        <img src={r.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: COLORS.navy }}
                        >
                          {initials(r.customerName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate" style={{ color: COLORS.navy }}>
                          {r.customerName}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleExpanded(r.id)}
                      className="text-xs font-semibold whitespace-nowrap shrink-0 underline"
                      style={{ color: COLORS.burgundy }}
                    >
                      {isExpanded ? "Show less" : "See full review"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {pages.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-5">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToPage(i)}
              aria-label={`Show reviews page ${i + 1}`}
              className="rounded-full transition-all"
              style={{ width: i === pageIndex ? 18 : 6, height: 6, background: i === pageIndex ? COLORS.burgundy : COLORS.line }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
