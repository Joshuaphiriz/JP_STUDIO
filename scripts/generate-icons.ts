/**
 * Renders PWA + favicon assets from public/brand/logo.svg.
 * Run: npm run icons
 */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const LOGO = path.join(ROOT, "public/brand/logo.svg");
const OUT_ICONS = path.join(ROOT, "public/icons");
const OUT_APP = path.join(ROOT, "app");

const BG = "#0d0f12";

async function main() {
  const svg = await readFile(LOGO);
  await mkdir(OUT_ICONS, { recursive: true });

  // Standard (transparent-safe) icons
  for (const size of [192, 512]) {
    await sharp(svg, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(path.join(OUT_ICONS, `icon-${size}.png`));
  }

  // Maskable: logo at ~72% inside a full-bleed background
  const inner = Math.round(512 * 0.72);
  const logo = await sharp(svg, { density: 512 })
    .resize(inner, inner)
    .png()
    .toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(path.join(OUT_ICONS, "icon-maskable-512.png"));

  // Apple touch icon (opaque, rounded handled by iOS)
  await sharp({
    create: { width: 180, height: 180, channels: 4, background: BG },
  })
    .composite([
      {
        input: await sharp(svg, { density: 512 })
          .resize(132, 132)
          .png()
          .toBuffer(),
        gravity: "centre",
      },
    ])
    .png()
    .toFile(path.join(OUT_APP, "apple-icon.png"));

  // Favicon
  await sharp(svg, { density: 256 })
    .resize(64, 64)
    .png()
    .toFile(path.join(OUT_APP, "icon.png"));

  console.log("✓ icons generated");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
