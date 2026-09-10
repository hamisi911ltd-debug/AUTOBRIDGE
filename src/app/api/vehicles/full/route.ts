import { NextResponse } from "next/server";
import { getPublicVehicles } from "@/lib/getPublicVehicles";

// These routes depend on the request-time D1 binding and must not be
// prerendered during the Next.js build step.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const vehicles = await getPublicVehicles();
  return NextResponse.json({ vehicles });
}
