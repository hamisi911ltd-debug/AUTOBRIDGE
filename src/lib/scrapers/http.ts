/**
 * Both source sites occasionally return a transient 404/5xx or hang on an
 * individual request under normal load — not a sign the URL or make id is
 * wrong, just a flaky real-world HTTP call. One retry after a short delay
 * clears the vast majority of these without masking a genuinely broken URL
 * (which will fail the same way twice).
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 2, delayMs = 1200): Promise<T> {
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
