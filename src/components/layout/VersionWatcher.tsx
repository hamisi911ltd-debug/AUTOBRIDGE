"use client";

import { useEffect, useRef, useState } from "react";

const BOOT_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const POLL_MS = 60_000;
const RELOAD_KEY = "ab_reloaded_for";

/**
 * Keeps an open tab from running a stale deploy. It compares the build id
 * the bundle booted with against /api/version:
 *
 * - on an interval, on tab focus / visibility change, and on bfcache restore
 * - if the deployed id has changed, it reloads once (guarded by a
 *   sessionStorage marker so a genuinely bad deploy can't loop the tab)
 * - reloads silently when the tab is hidden; when it's in front, shows a
 *   two-second "updating" strip first so a reload never happens mid-tap
 *
 * `location.reload()` re-requests the HTML (served no-store), which points at
 * the new content-hashed chunks - so this also clears any stale cached JS.
 */
export function VersionWatcher() {
  const [updating, setUpdating] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (!BOOT_ID) return;

    function reloadOnce() {
      try {
        if (sessionStorage.getItem(RELOAD_KEY) === serverId) return; // already reloaded for this id
        sessionStorage.setItem(RELOAD_KEY, serverId);
      } catch {
        /* private mode / storage blocked - still fine to reload */
      }
      window.location.reload();
    }

    let serverId = "";

    async function check(force = false) {
      if (busy.current) return;
      busy.current = true;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { buildId?: string };
        serverId = data.buildId ?? "";
        if (!serverId || serverId === "unknown" || serverId === BOOT_ID) return;

        if (force || document.visibilityState === "hidden") {
          reloadOnce();
        } else {
          setUpdating(true);
          setTimeout(reloadOnce, 2000);
        }
      } catch {
        /* offline / transient - try again next tick */
      } finally {
        busy.current = false;
      }
    }

    const interval = setInterval(() => check(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    const onPageShow = (e: PageTransitionEvent) => check(e.persisted); // bfcache restore -> reload immediately

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onPageShow);
    check();

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  if (!updating) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: 2147483647,
        background: "#8B2A5B",
        color: "#fff",
        textAlign: "center",
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.2,
      }}
    >
      Updating to the latest version…
    </div>
  );
}
