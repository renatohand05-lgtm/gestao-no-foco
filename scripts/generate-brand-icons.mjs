#!/usr/bin/env node
/**
 * Sprint 25.5 — Gera ícones oficiais a partir de public/brand/icon-512.png
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public/brand/icon-512.png");
const outDir = join(root, "public/brand");
mkdirSync(outDir, { recursive: true });

const sizes = [192, 96, 64, 32, 16];
for (const s of sizes) {
  await sharp(src)
    .resize(s, s, { fit: "contain" })
    .png()
    .toFile(join(outDir, `icon-${s}.png`));
  console.log(`icon-${s}.png`);
}
// 512 already exists as source — ensure copy remains canonical
console.log("icon-512.png (source)");

await sharp(src).resize(180, 180).png().toFile(join(root, "public/apple-touch-icon.png"));
await sharp(src).resize(32, 32).png().toFile(join(root, "public/favicon-32.png"));
await sharp(src).resize(16, 16).png().toFile(join(root, "public/favicon-16.png"));

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (r < 40 && g < 40 && b < 40) data[i + 3] = 0;
}

const transparent512 = join(outDir, "mark-transparent-512.png");
await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(transparent512);

for (const s of [192, 64, 32]) {
  await sharp(transparent512)
    .resize(s, s)
    .png()
    .toFile(join(outDir, `mark-${s}.png`));
  console.log(`mark-${s}.png`);
}

console.log("Brand icons generated.");
