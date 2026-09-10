import { Buffer } from "node:buffer";

export const USER_AGENT = "Mozilla/5.0 (compatible; AutoBridgeKenyaBot/1.0; nightly inventory sync)";

// The spec table's cell text strips HTML tags but source markup also
// carries named/numeric entities (dimensions rows use "&times;"/"&nbsp;",
// e.g. "4.74&times;1.85&times;1.66&nbsp;m") — decoded here so the stored
// value is real text ("4.74×1.85×1.66 m"), not raw entity source.
const HTML_ENTITIES: Record<string, string> = {
  "&times;": "×",
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&[a-z]+;/gi, (entity) => HTML_ENTITIES[entity] ?? entity);
}

/**
 * The listing-page thumbnail is unreliable: BE FORWARD's ?w= resize param
 * is honored on some listings and silently ignored on others — some now
 * serve a genuine 200x150 thumbnail no matter what width is requested.
 * The real photo always lives on the detail page's gallery, so this is the
 * one place worth spending an extra couple of subrequests per vehicle: one
 * to fetch the detail page HTML, one to fetch the photo itself (also used
 * to measure its real width, so getPublicVehicles' quality gate has an
 * accurate number from the moment the vehicle is first scraped).
 */
export async function fetchCoverImage(
  site: "beforward" | "sbtjapan",
  detailUrl: string
): Promise<{ url: string; widthPx: number } | "rate-limited" | null> {
  const detail = await fetchBeforwardDetail(site, detailUrl);
  if (detail === "rate-limited" || detail === null) return detail;
  if (!detail.image) return null;
  return detail.image;
}

/**
 * Fetches a detail page once and pulls out both the cover photo and (for
 * beforward) the extended spec sheet — image extraction and spec extraction
 * fail independently, so a vehicle whose photo can't be found/measured
 * still keeps whatever specs the page had, and vice versa. `site` still
 * gates whether spec parsing runs at all, since only BE FORWARD's detail
 * pages have been inspected for this — SBT Japan's page structure is
 * unverified and specs are left empty there.
 */
export async function fetchBeforwardDetail(
  site: "beforward" | "sbtjapan",
  detailUrl: string
): Promise<{ image: { url: string; widthPx: number } | null; specs: BeforwardSpecs; mombasaTotalUsd: number | null } | "rate-limited" | null> {
  try {
    const detailRes = await fetch(detailUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        // BE FORWARD picks which country's port list (and which one it
        // treats as "the" total-price default) off this cookie — with no
        // cookie at all it fell back to a US port list for Cloudflare
        // Workers' outbound requests specifically (confirmed live: Baltimore/
        // Newark/Jacksonville/etc, never Mombasa), even though the exact
        // same fetch from this project's own dev sandbox got Kenya/Mombasa
        // by default. Setting it explicitly removes that dependency on
        // wherever the request happens to egress from.
        Cookie: "wwwbf[country_code]=ke; wwwbf[country_code_to_display]=ke",
      },
    });
    if (detailRes.status === 429) return "rate-limited";
    if (!detailRes.ok) {
      console.error(`[fetchBeforwardDetail] detail fetch ${detailRes.status} for ${detailUrl}`);
      return null;
    }
    const html = await detailRes.text();

    let image: { url: string; widthPx: number } | null = null;
    const imageUrl = extractCoverImageUrl(site, html);
    if (imageUrl) {
      const widthPx = await measureImageWidthPx(imageUrl);
      if (widthPx) image = { url: imageUrl, widthPx };
      else console.error(`[fetchBeforwardDetail] width measurement failed for ${imageUrl}`);
    } else {
      console.error(`[fetchBeforwardDetail] no image match in detail HTML (len=${html.length}) for ${detailUrl}`);
    }

    const specs = site === "beforward" ? extractBeforwardSpecs(html) : {};
    const mombasaTotalUsd = site === "beforward" ? extractMombasaTotalUsd(html) : null;

    return { image, specs, mombasaTotalUsd };
  } catch (err) {
    console.error(`[fetchBeforwardDetail] threw for ${detailUrl}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * BE FORWARD's own detail page already computes a real Cost & Freight total
 * to Mombasa via RORO (confirmed live, embedded as a plain hidden input —
 * not display-formatted text) — the exact same route Kenya-bound buyers
 * actually use. Reading this straight from the page beats guessing freight
 * off a flat per-country table, especially for anything bulkier than a
 * sedan (a heavy truck's real freight can be many times a car's). Picks
 * specifically the plain "pick up at port, no customs clearing bundled in"
 * RORO option — matches what landedCost.ts adds Kenya's own duty/clearing
 * on top of, so nothing gets double-counted against a variant that already
 * includes clearing.
 */
function extractMombasaTotalUsd(html: string): number | null {
  // Order-independent on purpose: the marker tag's attribute order isn't
  // guaranteed stable across listings, so this pulls out each candidate tag
  // whole and tests its attributes individually rather than assuming one
  // fixed sequence.
  const tagMatches = html.matchAll(/<input[^>]*id="fn-port-city-info-([\w:]+)"[^>]*>/g);
  let rowId: string | null = null;
  for (const m of tagMatches) {
    const tag = m[0];
    const isMombasa = tag.includes('data-port="MOMBASA"') || tag.includes('data-destination="MOMBASA"');
    const isRoro = tag.includes('data-via="pick up at port (RORO)"');
    const noClearing = tag.includes('data-with-clearing=""');
    if (isMombasa && isRoro && noClearing) {
      rowId = m[1];
      break;
    }
  }
  if (!rowId) return null;

  const escapedId = rowId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const priceMatch = html.match(new RegExp(`data-quote-form-row="${escapedId}"[\\s\\S]{0,600}?class="fn-total-price" value="(\\d+)"`));
  if (!priceMatch) return null;
  const n = parseInt(priceMatch[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Ranged fetch + JPEG SOF-marker parse — the real dimensions are always within the first few KB. */
export async function measureImageWidthPx(imageUrl: string | null): Promise<number | null> {
  if (!imageUrl) return null;
  try {
    const res = await fetch(imageUrl, { headers: { "User-Agent": USER_AGENT, Range: "bytes=0-65535" } });
    if (!res.ok && res.status !== 206) {
      console.error(`[measureImageWidthPx] fetch ${res.status} for ${imageUrl}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const width = jpegWidth(buf);
    if (!width) console.error(`[measureImageWidthPx] no SOF marker found (${buf.length} bytes) for ${imageUrl}`);
    return width;
  } catch (err) {
    console.error(`[measureImageWidthPx] threw for ${imageUrl}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export type BeforwardSpecs = {
  refNo?: string;
  chassisNo?: string;
  modelCode?: string;
  engineCode?: string;
  steering?: string;
  location?: string;
  versionClass?: string;
  doors?: number;
  dimensions?: string;
  weightKg?: number;
  registrationYearMonth?: string;
  manufactureYearMonth?: string;
  features?: string[];
};

const SPEC_FIELD_MAP: Record<string, keyof BeforwardSpecs> = {
  "Ref. No.": "refNo",
  "Chassis No.": "chassisNo",
  "Model Code": "modelCode",
  "Engine Code": "engineCode",
  Steering: "steering",
  Location: "location",
  "Version/Class": "versionClass",
  Doors: "doors",
  Dimension: "dimensions",
  Weight: "weightKg",
  "Registration Year/month": "registrationYearMonth",
  "Manufacture Year/month": "manufactureYearMonth",
};

/**
 * BE FORWARD's detail page carries a much richer spec sheet than the
 * stocklist row does — table.specification (label/value cells, two pairs
 * per row) plus a features list. Parsed from the SAME detail-page HTML
 * fetchCoverImage already fetches for the photo upgrade, not a separate
 * request.
 *
 * The features list has two different real formats seen live: most
 * listings use <ul><li class="attached_on|attached_off">Name</li></ul>
 * (only "attached_on" items are actually equipped), but some — a Toyota
 * HiAce van, at least — instead use a single <p class="vehicle-option-list">
 * with a slash-separated string. Tried in that order; whichever matches first
 * wins, since a page only ever seems to carry one of the two.
 */
export function extractBeforwardSpecs(html: string): BeforwardSpecs {
  const specs: BeforwardSpecs = {};

  const tableMatch = html.match(/<table[^>]*class="[^"]*\bspecification\b[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (tableMatch) {
    const rowMatches = tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const rowMatch of rowMatches) {
      const cells = [...rowMatch[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) =>
        decodeHtmlEntities(m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
      );
      for (let i = 0; i + 1 < cells.length; i += 2) {
        const field = SPEC_FIELD_MAP[cells[i]];
        const value = cells[i + 1];
        if (!field || !value || value === "-") continue;
        if (field === "doors" || field === "weightKg") {
          const n = parseInt(value.replace(/[^\d]/g, ""), 10);
          if (!Number.isNaN(n)) (specs[field] as number) = n;
        } else {
          (specs[field] as string) = value;
        }
      }
    }
  }

  const attachedOn = [...html.matchAll(/<li[^>]*class="[^"]*\battached_on\b[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => decodeHtmlEntities(m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()))
    .filter(Boolean);
  if (attachedOn.length > 0) {
    specs.features = attachedOn;
  } else {
    const optionsMatch = html.match(/<p[^>]*class="[^"]*\bvehicle-option-list\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    if (optionsMatch) {
      const text = decodeHtmlEntities(optionsMatch[1].replace(/<[^>]+>/g, "").trim());
      const features = text
        .split("/")
        .map((f) => f.trim())
        .filter(Boolean);
      if (features.length > 0) specs.features = features;
    }
  }

  return specs;
}

export function extractCoverImageUrl(site: "beforward" | "sbtjapan", html: string): string | null {
  if (site === "beforward") {
    const match = html.match(/https?:\/\/image-cdn\.beforward\.jp\/large\/[^\s"'<>]+\.jpe?g/i);
    return match ? match[0] : null;
  }

  const match = html.match(/https?:\/\/img\.sbtjapan\.com\/img\/carphoto\/[^\s"'<>]+\.jpe?g/i);
  if (!match) return null;
  const url = new URL(match[0]);
  url.searchParams.set("imwidth", "1200");
  return url.toString();
}

function jpegWidth(buf: Buffer): number | null {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) return buf.readUInt16BE(i + 7);
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
}
