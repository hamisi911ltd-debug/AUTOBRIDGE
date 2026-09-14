import "dotenv/config";
import sharp from "sharp";
import { writeFileSync, readFileSync } from "node:fs";

/**
 * One-off script (run manually, not part of the app or nightly jobs) that
 * builds public/og-image.jpg - the link-preview image used for
 * WhatsApp/social shares of the site. Composites the Ferbil plate-badge
 * onto one hand-picked, watermark-free car photo (a clean Land Cruiser),
 * then lays that into a branded 1200x630 card alongside the wordmark - the
 * standard Open Graph image size.
 */

const CAR_PHOTO = process.argv[2]; // local path to the source car photo
if (!CAR_PHOTO) {
  console.error("Usage: npx tsx scripts/buildOgImage.ts <path-to-car-photo.jpg>");
  process.exit(1);
}

const OUT_DIR = "public";

async function main() {
  // Plate badge - a small white rounded plate with the Ferbil wordmark,
  // sized and positioned to sit over this specific photo's actual plate
  // (eyeballed once, for this one image only - this is not a general
  // per-photo solution, see FerbilBadge.tsx's doc comment for why).
  const plateSvg = `
    <svg width="110" height="32" xmlns="http://www.w3.org/2000/svg">
      <rect width="110" height="32" rx="4" fill="#ffffff" stroke="#3B1F63" stroke-width="2"/>
      <text x="55" y="21" font-family="Georgia, 'Times New Roman', serif" font-size="16" font-weight="700"
            fill="#3B1F63" text-anchor="middle">FERBIL</text>
    </svg>`;
  const plateBuf = Buffer.from(plateSvg);

  const carWithPlate = await sharp(CAR_PHOTO)
    .composite([{ input: plateBuf, top: 276, left: 118 }])
    .toBuffer();

  const carDataUri = `data:image/jpeg;base64,${carWithPlate.toString("base64")}`;
  const logoSvg = readFileSync("public/ferbil-logo.svg", "utf8");
  const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

  const cardSvg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3B1F63"/>
          <stop offset="55%" stop-color="#8B2A5B"/>
          <stop offset="100%" stop-color="#F2762E"/>
        </linearGradient>
        <clipPath id="carClip">
          <rect x="560" y="65" width="580" height="500" rx="24"/>
        </clipPath>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>

      <image href="${logoDataUri}" x="80" y="80" width="88" height="88"/>
      <text x="184" y="140" font-family="Georgia, 'Times New Roman', serif" font-size="56" font-weight="700"
            fill="#ffffff">FERBIL</text>
      <text x="80" y="200" font-family="Georgia, 'Times New Roman', serif" font-size="22" letter-spacing="2"
            fill="#ffffffcc">CAR IMPORTS</text>

      <text x="80" y="300" font-family="Georgia, serif" font-size="34" font-weight="700" fill="#ffffff">
        Kenya&#8217;s Vehicle Import
      </text>
      <text x="80" y="342" font-family="Georgia, serif" font-size="34" font-weight="700" fill="#ffffff">
        Marketplace
      </text>
      <text x="80" y="390" font-family="Georgia, serif" font-size="19" fill="#ffffffcc">
        Real, import-eligible cars from Japan &amp; the UAE.
      </text>
      <text x="80" y="418" font-family="Georgia, serif" font-size="19" fill="#ffffffcc">
        Total price shown upfront - vehicle, freight &amp; insurance.
      </text>

      <image href="${carDataUri}" x="560" y="65" width="580" height="500" clip-path="url(#carClip)" preserveAspectRatio="xMidYMid slice"/>
      <rect x="560" y="65" width="580" height="500" rx="24" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2"/>
    </svg>`;

  const finalBuf = await sharp(Buffer.from(cardSvg)).jpeg({ quality: 90 }).toBuffer();
  writeFileSync(`${OUT_DIR}/og-image.jpg`, finalBuf);
  console.log(`Wrote ${OUT_DIR}/og-image.jpg (${finalBuf.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
