/**
 * Both source sites occasionally return a transient 404/5xx or hang on an
 * individual request under normal load — not a sign the URL or make id is
 * wrong, just a flaky real-world HTTP call. One retry after a short delay
 * clears the vast majority of these without masking a genuinely broken URL
 * (which will fail the same way twice).
 *
 * Bumped from 2 attempts/1200ms after a real incident: a heavy multi-hour
 * scraping session tripped a short-lived IP-level 429 block on BE FORWARD
 * (confirmed via curl — 429 with an empty body, then a normal 302 again
 * about 3 minutes later on the same URL). The old 2-attempt/1200ms budget
 * gave up mid-block, and — because the caller only special-cases a 429
 * status specifically, not "ran out of retries" — that surfaced as a
 * silent empty result ("no listings for this model") rather than a visible
 * rate-limit message, which is how Mitsubishi/Suzuki/Jeep/Citroen ended up
 * logged as empty despite Jeep alone having confirmed real stock in the
 * thousands. More attempts with a longer backoff gives a short block more
 * runway to clear before a request gives up.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 4, delayMs = 3000): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}
