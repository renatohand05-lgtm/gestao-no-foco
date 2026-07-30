/**
 * Sprint 25.5.2 — Screenshots reais da landing premium.
 * Uso: NEXT_PUBLIC_APP_URL=http://localhost:3000 node scripts/capture-landing-premium-evidence.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BASE_URL, ensureChromiumInstalled } from "./playwright-auth.mjs";

const ROOT = resolve(import.meta.dirname ?? ".", "..");
const OUT = resolve(ROOT, "docs/testing/evidence/25-5-2");
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "notebook-1440", width: 1440, height: 900 },
  { name: "notebook-1366", width: 1366, height: 768 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
];

async function shot(page, name) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`  saved ${name}.png`);
  return path;
}

async function main() {
  console.log("Landing premium evidence — Sprint 25.5.2");
  console.log(`App: ${BASE_URL}`);
  ensureChromiumInstalled();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const report = { at: new Date().toISOString(), baseUrl: BASE_URL, shots: [], errors: [] };

  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForSelector("[data-landing-shell]", { timeout: 60000 });
    await page.waitForTimeout(1500);
    report.shots.push(await shot(page, "01-landing-top"));

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    report.shots.push(
      await page.screenshot({
        path: resolve(OUT, "02-header-top.png"),
        clip: { x: 0, y: 0, width: 1440, height: 80 },
      }).then(() => {
        console.log("  saved 02-header-top.png");
        return resolve(OUT, "02-header-top.png");
      }),
    );

    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);
    report.shots.push(
      await page.screenshot({
        path: resolve(OUT, "03-header-scrolled.png"),
        clip: { x: 0, y: 0, width: 1440, height: 80 },
      }).then(() => {
        console.log("  saved 03-header-scrolled.png");
        return resolve(OUT, "03-header-scrolled.png");
      }),
    );

    for (const sel of [
      ["04-hero", '[data-landing-block="hero"]'],
      ["05-pillars", '[data-landing-block="pillars"]'],
      ["06-modules", '[data-landing-block="modules"]'],
      ["07-preview", '[data-landing-block="preview-full"]'],
      ["08-intelligence", '[data-landing-block="intelligence"]'],
      ["09-cta", '[data-landing-block="cta"]'],
      ["10-footer", "[data-landing-footer]"],
    ]) {
      const el = page.locator(sel[1]).first();
      await el.scrollIntoViewIfNeeded().catch(() => null);
      await page.waitForTimeout(400);
      report.shots.push(await shot(page, sel[0]));
    }

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForSelector("[data-landing-shell]", { timeout: 60000 });
      await page.waitForTimeout(1200);
      report.shots.push(await shot(page, `11-${vp.name}`));
    }
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : String(err));
    console.error(err);
  } finally {
    writeFileSync(resolve(OUT, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }

  if (report.errors.length) process.exit(1);
  console.log(`\nOK — ${report.shots.length} screenshots em ${OUT}`);
}

main();
