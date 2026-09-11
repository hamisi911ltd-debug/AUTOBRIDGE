import { NextResponse } from "next/server";
import { getPublicVehicles } from "@/lib/getPublicVehicles";

// force-dynamic, not ISR - see the note on src/app/page.tsx for why: this
// app's R2-backed incremental cache proved unreliable (hangs on both reads
// and writes), so a slightly heavier but predictable direct compute beats
// depending on a flaky cache layer. getPublicVehicles() now only selects
// the columns it actually uses, which keeps even the full unbounded pass
// reasonably fast.
export const dynamic = "force-dynamic";

export async function GET() {
  const vehicles = await getPublicVehicles();
  return NextResponse.json({ vehicles });
}
