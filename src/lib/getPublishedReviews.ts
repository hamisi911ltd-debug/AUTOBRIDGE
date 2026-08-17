import { prisma } from "@/lib/prisma";
import type { PublicReview } from "@/types/review";

export async function getPublishedReviews(): Promise<PublicReview[]> {
  const reviews = await prisma.review.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return reviews.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    rating: r.rating,
    text: r.text,
    vehicleLabel: r.vehicleLabel,
  }));
}
