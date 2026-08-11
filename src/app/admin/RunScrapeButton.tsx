"use client";

import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { getScrapeManifest, runScrapeUnitNow, revalidateAfterScrape } from "@/app/admin/actions";
import type { ScrapeSite } from "@/lib/scrapers/runScrape";

type Totals = { totalFound: number; created: number; updated: number; errors: number; bySite: Record<ScrapeSite, number> };

const EMPTY_TOTALS: Totals = { totalFound: 0, created: 0, updated: 0, errors: 0, bySite: { beforward: 0, sbtjapan: 0, dubicars: 0 } };

export function RunScrapeButton() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const manifest = await getScrapeManifest();
      const sites = Object.keys(manifest) as ScrapeSite[];
      const total = sites.reduce((sum, site) => sum + manifest[site], 0);
      setProgress({ done: 0, total });

      const totals: Totals = { ...EMPTY_TOTALS, bySite: { beforward: 0, sbtjapan: 0, dubicars: 0 } };
      let done = 0;

      // One call per (site, make) — each call is its own request, keeping
      // every individual invocation's parsing work small. Sequential, not
      // parallel, to stay a light, respectful visitor to the source sites.
      for (const site of sites) {
        for (let makeIndex = 0; makeIndex < manifest[site]; makeIndex++) {
          const unit = await runScrapeUnitNow(site, makeIndex);
          totals.totalFound += unit.found;
          totals.created += unit.created;
          totals.updated += unit.updated;
          totals.errors += unit.errors;
          totals.bySite[site] += unit.found;
          done++;
          setProgress({ done, total });
        }
      }

      await revalidateAfterScrape();
      setResult(totals);
    } catch {
      setError("Scrape failed — check the server log for details.");
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={running}
        className="text-sm font-semibold px-4 py-2 rounded-full text-white disabled:opacity-60"
        style={{ background: COLORS.burgundy }}
      >
        {running
          ? `Scraping… (${progress ? `${progress.done}/${progress.total}` : "starting"})`
          : "Run scrape now"}
      </button>
      {result && (
        <p className="text-xs mt-2" style={{ color: COLORS.slate }}>
          Found {result.totalFound} listings ({result.bySite.beforward} BE FORWARD, {result.bySite.sbtjapan} SBT
          Japan, {result.bySite.dubicars} Dubicars) — {result.created} new, {result.updated} updated
          {result.errors > 0 ? `, ${result.errors} errors` : ""}.
        </p>
      )}
      {error && (
        <p className="text-xs mt-2" style={{ color: COLORS.burgundy }}>
          {error}
        </p>
      )}
    </div>
  );
}
