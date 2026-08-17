import { prisma } from "@/lib/prisma";
import { COLORS, FONT_DISPLAY } from "@/lib/constants";
import { createReview, togglePublished } from "@/app/admin/actions";
import { DeleteReviewButton } from "@/app/admin/reviews/DeleteReviewButton";

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: FONT_DISPLAY, color: COLORS.navy }}>
        Reviews <span className="text-base font-normal" style={{ color: COLORS.slate }}>({reviews.length})</span>
      </h1>
      <p className="text-sm mb-6" style={{ color: COLORS.slate }}>
        Only real customer feedback goes here. Transcribe an actual WhatsApp message, call, or email. Nothing here is generated. Unpublish
        anything you're not ready to show yet; only published reviews appear on the homepage.
      </p>

      <form action={createReview} className="bg-white rounded-2xl border p-5 mb-8 grid gap-3 max-w-xl" style={{ borderColor: COLORS.line }}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: COLORS.slate }}>
              Customer name
            </label>
            <input name="customerName" required className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: COLORS.slate }}>
              Rating
            </label>
            <select name="rating" required defaultValue="5" className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: COLORS.line }}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n !== 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: COLORS.slate }}>
            Vehicle (optional, free text)
          </label>
          <input name="vehicleLabel" placeholder="e.g. Toyota Harrier" className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: COLORS.slate }}>
            What they said
          </label>
          <textarea name="text" required rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} />
        </div>
        <button type="submit" className="justify-self-start px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: COLORS.burgundy }}>
          Add review
        </button>
      </form>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border p-4 flex items-start justify-between gap-4" style={{ borderColor: COLORS.line }}>
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold" style={{ color: COLORS.navy }}>
                  {r.customerName}
                </span>
                <span style={{ color: COLORS.gold }}>{"★".repeat(r.rating)}</span>
                {!r.published && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#F1F1EC", color: COLORS.slate }}>
                    Unpublished
                  </span>
                )}
              </div>
              {r.vehicleLabel && (
                <div className="text-xs mb-1" style={{ color: COLORS.slate }}>
                  {r.vehicleLabel}
                </div>
              )}
              <p style={{ color: COLORS.ink }}>{r.text}</p>
              <div className="mt-2 text-xs" style={{ color: COLORS.slate }}>
                {r.createdAt.toLocaleString()}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <form action={togglePublished}>
                <input type="hidden" name="id" value={r.id} />
                <button
                  type="submit"
                  className="text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap"
                  style={{ background: r.published ? "#F1F1EC" : COLORS.burgundy, color: r.published ? COLORS.ink : "white" }}
                >
                  {r.published ? "Unpublish" : "Publish"}
                </button>
              </form>
              <DeleteReviewButton id={r.id} />
            </div>
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: COLORS.slate }}>
            No reviews yet. Add the first one above once you have real customer feedback.
          </p>
        )}
      </div>
    </div>
  );
}
