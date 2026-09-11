import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Returns the build id of the currently-deployed Worker. The client
 * (VersionWatcher) polls this and reloads itself when the id no longer
 * matches the one its bundle was built with - so an open tab never keeps
 * running a superseded deploy. Sent no-store so it's never itself cached.
 */
export async function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown" },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  );
}
