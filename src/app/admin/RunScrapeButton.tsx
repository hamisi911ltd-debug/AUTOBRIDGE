"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS } from "@/lib/constants";
import { getScrapeManifest, migrateImageBatchNow, runScrapeUnitNow, revalidateAfterScrape, type ScrapeManifest } from "@/app/admin/actions";
import type { ScrapeSite, UnitScrapeSummary } from "@/lib/scrapers/runScrape";
import { IMPORT_ELIGIBLE_FROM_YEAR } from "@/lib/scrapers/normalize";

type Totals = { checked: number; created: number; existing: number; skipped: number; errors: number };
const ZERO: Totals = { checked: 0, created: 0, existing: 0, skipped: 0, errors: 0 };

// Depth per make/year for sites split that way, and total depth for sites
// that page through one combined stock list.
const GROUP_PAGE_OPTIONS = [1, 2, 3, 5, 10, 25, 50];
const LIST_PAGE_OPTIONS = [5, 10, 25, 50, 100, 250];

// A thrown server action is usually a transient network/deploy blip, and a
// rate-limited source usually clears within a minute or two - both are
// retried a few times before a unit is written off as an error.
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_PAUSE_MS = 45_000;
// Gap between calls to the same site - back-to-back runs are what tripped
// BE FORWARD's throttle in testing, and a steady pace costs little.
const PACE_MS = 1500;

type Job = { site: ScrapeSite; group: number; label: string; pages: number };

function sleep(ms: number, stopped: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = setInterval(() => {
      if (stopped() || Date.now() - started >= ms) {
        clearInterval(tick);
        resolve();
      }
    }, 250);
  });
}

export function RunScrapeButton() {
  const router = useRouter();
  const [manifest, setManifest] = useState<ScrapeManifest | null>(null);
  const [enabled, setEnabled] = useState<Partial<Record<ScrapeSite, boolean>>>({});
  const [groupPages, setGroupPages] = useState(3);
  const [listPages, setListPages] = useState(10);

  const [running, setRunning] = useState(false);
  const [siteStatus, setSiteStatus] = useState<Partial<Record<ScrapeSite, string>>>({});
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [totals, setTotals] = useState<Totals | null>(null);
  const [perSite, setPerSite] = useState<Partial<Record<ScrapeSite, number>>>({});
  const [log, setLog] = useState<string[]>([]);
  const [finished, setFinished] = useState<"done" | "stopped" | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    getScrapeManifest()
      .then((m) => {
        setManifest(m);
        // Every source on by default - the goal is as much stock as possible.
        setEnabled(Object.fromEntries(m.map((s) => [s.site, true])));
      })
      .catch(() => setLog(["Couldn't load the scraper list. Refresh the page and try again."]));
  }, []);

  // Leaving the page mid-run silently abandons it - warn first.
  useEffect(() => {
    if (!running) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [running]);

  const sites = manifest?.filter((s) => s.groups.length > 0) ?? [];
  const labelOf = (site: ScrapeSite) => sites.find((s) => s.site === site)?.label ?? site;

  function note(line: string) {
    setLog((prev) => [...prev.slice(-9), line]);
  }
  function status(site: ScrapeSite, text: string) {
    setSiteStatus((prev) => ({ ...prev, [site]: text }));
  }

  /** One slice, retried on thrown errors and rate limits. Returns null if it never succeeded. */
  async function runUnit(job: Job, page: number, offset: number): Promise<UnitScrapeSummary | null> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (stopRef.current) return null;
      try {
        const unit = await runScrapeUnitNow(job.site, job.group, page, offset);
        if (!unit.rateLimited) return unit;
        if (attempt === MAX_ATTEMPTS) {
          note(`${job.label} page ${page}: still blocked by the source site, moved on.`);
          return unit;
        }
        status(job.site, `${job.label} page ${page}: site is throttling us, pausing ${RATE_LIMIT_PAUSE_MS / 1000}s…`);
        await sleep(RATE_LIMIT_PAUSE_MS, () => stopRef.current);
      } catch {
        if (attempt === MAX_ATTEMPTS) {
          note(`${job.label} page ${page}: request failed ${MAX_ATTEMPTS} times, skipped.`);
          return null;
        }
        await sleep(3000 * attempt, () => stopRef.current);
      }
    }
    return null;
  }

  async function handleRun() {
    if (!manifest) return;
    stopRef.current = false;
    setRunning(true);
    setFinished(null);
    setLog([]);
    setSiteStatus({});
    setPerSite({});

    const jobsBySite = new Map<ScrapeSite, Job[]>();
    for (const s of sites) {
      if (!enabled[s.site]) continue;
      jobsBySite.set(
        s.site,
        s.groups.map((g, i) => ({
          site: s.site,
          group: i,
          label: s.groupKind === "all" ? s.label : `${s.label} · ${g}`,
          pages: s.groupKind === "all" ? listPages : groupPages,
        }))
      );
    }

    const total = [...jobsBySite.values()].flat().reduce((sum, j) => sum + j.pages, 0);
    let done = 0;
    const run: Totals = { ...ZERO };
    const createdBySite: Partial<Record<ScrapeSite, number>> = {};
    setProgress({ done, total });
    setTotals({ ...run });

    // Each site works through its own queue one request at a time (polite
    // to that site), while different sites run side by side.
    async function runSite(site: ScrapeSite, jobs: Job[]) {
      jobLoop: for (const job of jobs) {
        for (let page = 1; page <= job.pages; page++) {
          if (stopRef.current) break jobLoop;
          const pageLabel = `${job.label} · page ${page}`;

          let offset = 0;
          let pageCandidates = 0;
          let hasMore = true;
          while (hasMore && !stopRef.current) {
            status(site, `${pageLabel}${offset > 0 ? ` (listings ${offset + 1}+)` : ""}`);
            const unit = await runUnit(job, page, offset);
            await sleep(PACE_MS, () => stopRef.current);
            if (!unit) {
              run.errors++;
              break;
            }
            run.checked += unit.checked;
            run.created += unit.created;
            run.existing += unit.existing;
            run.skipped += unit.skipped;
            run.errors += unit.errors;
            createdBySite[site] = (createdBySite[site] ?? 0) + unit.created;
            setTotals({ ...run });
            setPerSite({ ...createdBySite });
            pageCandidates = unit.candidates;
            hasMore = unit.hasMore;
            offset = unit.nextOffset;
          }
          done++;
          setProgress({ done, total });

          // A page with no listings means this make/year has run out of
          // stock - skip ahead to the next one. Pages full of cars we already
          // have are walked through (cheaply - no detail fetches), since
          // unseen stock sits behind them.
          if (page < job.pages && pageCandidates === 0) {
            done += job.pages - page;
            setProgress({ done, total });
            break;
          }
        }
      }
      status(site, stopRef.current ? "Stopped" : "Finished");
    }

    try {
      await Promise.all([...jobsBySite].map(([site, jobs]) => runSite(site, jobs)));
    } finally {
      const wasStopped = stopRef.current;
      // Copy the new cars' photos into our own image storage straight away.
      // Some sources block photos shown on other sites (hotlink protection),
      // and the copier works newest-first, so this covers exactly this run.
      if (run.created > 0) {
        let copied = 0;
        try {
          for (let batch = 0; copied < run.created && batch < 500; batch++) {
            setCopyStatus(`Copying new photos to our storage… ${Math.min(copied, run.created)}/${run.created}`);
            const r = await migrateImageBatchNow();
            copied += r.processed;
            if (r.done || r.processed === 0) break;
          }
          setCopyStatus(null);
        } catch {
          setCopyStatus(null);
          note("Couldn't copy the new photos to our storage now - use \"Migrate images to R2\" to finish it.");
        }
      }
      try {
        await revalidateAfterScrape();
      } catch {
        note("Couldn't refresh cached pages - new stock will show after the cache expires.");
      }
      setRunning(false);
      setFinished(wasStopped ? "stopped" : "done");
      router.refresh();
    }
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const selectCls = "border rounded px-1 py-0.5";

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: COLORS.navy }}>
        {sites.map((s) => (
          <label key={s.site} className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!enabled[s.site]}
              disabled={running}
              onChange={(e) => setEnabled((prev) => ({ ...prev, [s.site]: e.target.checked }))}
            />
            {s.label}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs mt-2" style={{ color: COLORS.navy }}>
        <label className="inline-flex items-center gap-1.5">
          Pages per make / year
          <select value={groupPages} disabled={running} onChange={(e) => setGroupPages(Number(e.target.value))} className={selectCls} style={{ borderColor: COLORS.line }}>
            {GROUP_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5">
          Pages for single-list sites
          <select value={listPages} disabled={running} onChange={(e) => setListPages(Number(e.target.value))} className={selectCls} style={{ borderColor: COLORS.line }}>
            {LIST_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-[11px] mt-1.5" style={{ color: COLORS.slate }}>
        Only new cars are added: anything already on the site is skipped, never updated. Cars must be {IMPORT_ELIGIBLE_FROM_YEAR} or newer, right-hand drive, with a price and a sharp photo.
      </p>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleRun}
          disabled={running || !manifest || !sites.some((s) => enabled[s.site])}
          className="text-sm font-semibold px-4 py-2 rounded-full text-white disabled:opacity-60"
          style={{ background: COLORS.burgundy }}
        >
          {running ? `Scraping… ${pct}%` : "Run scrape now"}
        </button>
        {running && (
          <button
            onClick={() => {
              stopRef.current = true;
              note("Stopping after the current batches…");
            }}
            className="text-sm font-semibold px-4 py-2 rounded-full border"
            style={{ borderColor: COLORS.line, color: COLORS.navy }}
          >
            Stop
          </button>
        )}
      </div>

      {(running || finished) && progress.total > 0 && (
        <div className="mt-3">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: COLORS.card }}>
            <div className="h-full transition-all" style={{ width: `${pct}%`, background: COLORS.burgundy }} />
          </div>
          <ul className="text-[11px] mt-1.5 space-y-0.5" style={{ color: COLORS.slate }}>
            {(Object.keys(siteStatus) as ScrapeSite[]).map((site) => (
              <li key={site}>
                <strong style={{ color: COLORS.navy }}>{labelOf(site)}</strong> · {perSite[site] ?? 0} new · {siteStatus[site]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {copyStatus && (
        <p className="text-xs mt-2" style={{ color: COLORS.navy }}>
          {copyStatus}
        </p>
      )}

      {totals && (
        <p className="text-xs mt-2" style={{ color: COLORS.slate }}>
          {finished === "stopped" ? "Stopped. " : finished === "done" ? "Done. " : ""}
          Checked {totals.checked} listings: <strong style={{ color: COLORS.navy }}>{totals.created} new</strong>, {totals.existing} already on the site
          {totals.skipped > 0 ? `, ${totals.skipped} skipped (too old, left-hand drive, no price or no sharp photo)` : ""}
          {totals.errors > 0 ? `, ${totals.errors} errors` : ""}.
        </p>
      )}

      {log.length > 0 && (
        <ul className="text-[11px] mt-2 space-y-0.5" style={{ color: COLORS.burgundy }}>
          {log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
