import "dotenv/config";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- no @types/better-sqlite3 in this project; only ever used from plain node -e scripts before now
const Database = require("better-sqlite3");
import { computeEligibility } from "@/lib/scrapers/normalize";
import { flushToD1, sleep, type PendingRow } from "./lib/d1Upsert";

/**
 * Restores SBT Japan vehicles from the local dev.db snapshot (~11,200 rows)
 * into production, which currently has zero - all of it was deliberately
 * deleted from production before (BE FORWARD-only was explicitly
 * requested at the time), but the local copy was never pruned to match.
 *
 * Explicitly NOT a blind copy: this data is weeks old (lastScrapedAt),
 * photo links go dead over time, and dumping it back verbatim would very
 * likely reintroduce broken-image cards at scale - the same problem this
 * project just spent real effort cleaning up. So every row's own image is
 * re-checked live against img.sbtjapan.com before it's allowed back into
 * production; only ones that still resolve get restored. Eligibility
 * (KRA's rolling "under 8 years" window) is also recomputed fresh against
 * today's date, not trusted from the stored snapshot.
 *
 * Usage:  npx tsx scripts/restoreLocalSbt.ts [count] [startIndex]
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

const WANT_RESTORED = process.argv[2] ? parseInt(process.argv[2], 10) : 11500;
const START_INDEX = process.argv[3] ? parseInt(process.argv[3], 10) : 0;

const REQUEST_DELAY_MS = 300;
const FLUSH_EVERY = 30;
const FETCH_TIMEOUT_MS = 10_000;
// Same reasoning as verifyImageReachability.ts's own circuit breaker: a
// dead rate anywhere near this high is far more likely to mean
// img.sbtjapan.com is throttling this run's own requests than that this
// much of a month-old snapshot genuinely went dead.
const DEAD_RATE_CIRCUIT_BREAKER = 0.5;
const MIN_CHECKED_BEFORE_BREAKER = 60;

type LocalRow = {
  id: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  mileageKm: number;
  fuel: string;
  transmission: string;
  engineCc: number;
  bodyType: string;
  drive: string;
  seats: number;
  color: string;
  sourceCountry: string;
  sourcePriceUsd: number;
  freightIncluded: number;
  imageUrl: string | null;
  imageUrls: string | null;
  imageWidthPx: number | null;
  refNo: string | null;
  chassisNo: string | null;
  modelCode: string | null;
  engineCode: string | null;
  steering: string | null;
  location: string | null;
  versionClass: string | null;
  doors: number | null;
  dimensions: string | null;
  weightKg: number | null;
  registrationYearMonth: string | null;
  manufactureYearMonth: string | null;
  features: string | null;
  sourceUrl: string;
  externalId: string;
};

async function isImageLive(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": USER_AGENT }, signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const db = new Database("./dev.db", { readonly: true });
  const rows = db.prepare("SELECT * FROM Vehicle WHERE sourceSite = 'sbtjapan' ORDER BY id").all() as LocalRow[];
  db.close();
  console.log(`Loaded ${rows.length} local SBT Japan rows. Restoring up to ${WANT_RESTORED}, starting at index ${START_INDEX}.`);

  let pending: PendingRow[] = [];
  let restored = 0;
  let checked = 0;
  let dead = 0;
  let ineligible = 0;

  async function flush(reason: string) {
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    await flushToD1(batch);
    restored += batch.length;
    console.log(`  flushed ${batch.length} (${reason}) - ${restored} restored so far`);
  }

  for (let i = START_INDEX; i < rows.length; i++) {
    if (restored + pending.length >= WANT_RESTORED) break;
    const row = rows[i];

    if (!computeEligibility(row.year).eligible) {
      ineligible++;
      continue;
    }
    if (!row.imageUrl) continue;

    const live = await isImageLive(row.imageUrl);
    checked++;
    if (!live) {
      dead++;
      if (checked >= MIN_CHECKED_BEFORE_BREAKER && dead / checked > DEAD_RATE_CIRCUIT_BREAKER) {
        console.error(
          `\nABORTING at local index ${i}: ${dead}/${checked} images came back dead (>${Math.round(DEAD_RATE_CIRCUIT_BREAKER * 100)}%) - ` +
            `more likely img.sbtjapan.com is throttling this run than that this much of the snapshot genuinely died. ` +
            `${restored} already flushed are kept. Resume later with: npx tsx scripts/restoreLocalSbt.ts ${WANT_RESTORED} ${i}`
        );
        await flush("circuit breaker");
        return;
      }
      continue;
    }

    pending.push({
      sourceSite: "sbtjapan",
      externalId: row.externalId,
      sourceUrl: row.sourceUrl,
      make: row.make,
      model: row.model,
      trim: row.trim,
      year: row.year,
      mileageKm: row.mileageKm,
      fuel: row.fuel,
      transmission: row.transmission,
      engineCc: row.engineCc,
      bodyType: row.bodyType,
      drive: row.drive,
      seats: row.seats,
      color: row.color,
      sourceCountry: row.sourceCountry,
      sourcePriceUsd: row.sourcePriceUsd,
      freightIncluded: !!row.freightIncluded,
      imageUrl: row.imageUrl,
      imageWidthPx: row.imageWidthPx,
      refNo: row.refNo ?? undefined,
      chassisNo: row.chassisNo ?? undefined,
      modelCode: row.modelCode ?? undefined,
      engineCode: row.engineCode ?? undefined,
      steering: row.steering ?? undefined,
      location: row.location ?? undefined,
      versionClass: row.versionClass ?? undefined,
      doors: row.doors ?? undefined,
      dimensions: row.dimensions ?? undefined,
      weightKg: row.weightKg ?? undefined,
      registrationYearMonth: row.registrationYearMonth ?? undefined,
      manufactureYearMonth: row.manufactureYearMonth ?? undefined,
      features: row.features ? (JSON.parse(row.features) as string[]) : undefined,
    });

    if (pending.length >= FLUSH_EVERY) await flush("batch full");
    if (checked % 200 === 0) console.log(`Progress: index ${i}/${rows.length}, ${checked} checked, ${dead} dead, ${ineligible} now-ineligible, ${restored + pending.length} restorable so far`);
    await sleep(REQUEST_DELAY_MS);
  }

  await flush("done");
  console.log(`\nDone. ${restored} SBT Japan vehicles restored (${checked} checked, ${dead} dead, ${ineligible} aged out of eligibility).`);
}

main();
