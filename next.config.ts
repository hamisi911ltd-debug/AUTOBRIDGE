import type { NextConfig } from "next";

// A value unique to each build. Evaluated once when next.config loads at
// build time, then string-inlined everywhere `process.env.NEXT_PUBLIC_BUILD_ID`
// appears (client bundle + the /api/version route). The client compares the
// id it booted with against /api/version and reloads itself when they differ,
// so an already-open tab picks up a new deploy without a manual hard refresh.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || Date.now().toString(36);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  // Keep Next's own build/asset id aligned with it too.
  generateBuildId: () => BUILD_ID,
};

export default nextConfig;
