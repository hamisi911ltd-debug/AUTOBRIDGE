import { Star } from "lucide-react";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import type { PublicReview } from "@/types/review";

/**
 * Real customer feedback only, entered by an admin from an actual
 * conversation (see /admin/reviews) — never generated. Renders nothing
 * until at least one review is published, rather than showing an empty
 * "reviews" section or, worse, inventing placeholder testimonials.
 */
export function CustomerReviews({ reviews }: { reviews: PublicReview[] }) {
  if (reviews.length === 0) return null;

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="w-10 h-1 rounded-full mb-3" style={{ background: COLORS.gold }} />
          <h2 className="text-2xl sm:text-3xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
            What our customers say
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={16} fill={n <= Math.round(avg) ? COLORS.gold : "none"} color={COLORS.gold} />
            ))}
          </div>
          <span className="text-sm font-medium" style={{ color: COLORS.slate }}>
            {avg.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {reviews.slice(0, 6).map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border p-5" style={{ borderColor: COLORS.line }}>
            <div className="flex mb-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={14} fill={n <= r.rating ? COLORS.gold : "none"} color={COLORS.gold} />
              ))}
            </div>
            <p className="text-sm" style={{ color: COLORS.ink }}>
              &ldquo;{r.text}&rdquo;
            </p>
            <div className="mt-3 text-xs font-semibold" style={{ color: COLORS.navy }}>
              {r.customerName}
            </div>
            {r.vehicleLabel && (
              <div className="text-xs" style={{ color: COLORS.slate }}>
                {r.vehicleLabel}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
