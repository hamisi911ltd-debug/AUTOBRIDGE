import { NextResponse } from "next/server";
import { getPublicVehicles } from "@/lib/getPublicVehicles";

// The unbounded catalogue (27,000+ vehicles) — fetched lazily by Search and
// Ferbot once a visitor actually opens them, instead of shipping it on every
// homepage load. Cached briefly since the underlying data only changes on a
// nightly scrape, so repeat visits within the window don't re-hit D1.
export const revalidate = 300;

export async function GET() {
  const vehicles = await getPublicVehicles();
  return NextResponse.json({ vehicles });
}
