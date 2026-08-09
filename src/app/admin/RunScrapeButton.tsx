"use client";

import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { runScrapeNow } from "@/app/admin/actions";
import type { ScrapeSummary } from "@/lib/scrapers/runScrape";

export function RunScrapeButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScrapeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const summary = await runScrapeNow();
      setResult(summary);
    } catch {
      setError("Scrape failed — check the server log for details.");
    } finally {
      setRunning(false);
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
        {running ? "Scraping… (can take a few minutes)" : "Run scrape now"}
      </button>
      {result && (
        <p className="text-xs mt-2" style={{ color: COLORS.slate }}>
          Found {result.totalFound} listings ({result.bySite.beforward} BE FORWARD, {result.bySite.sbtjapan} SBT
          Japan) — {result.created} new, {result.updated} updated
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
