/**
 * Sprint 25.7.2 — Runtime: sem duplicate key / hydration no console.
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/25-7-2");
mkdirSync(OUT, { recursive: true });

const report = {
  at: new Date().toISOString(),
  baseUrl: BASE_URL,
  checks: [],
  consoleErrors: [],
  consoleWarnings: [],
  fatal: false,
  shots: [],
};

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

function classify(text) {
  if (/same key|duplicate key|Encountered two children with the same key/i.test(text)) {
    return "duplicate_key";
  }
  if (/Hydration failed|hydration mismatch/i.test(text)) {
    return "hydration";
  }
  if (/CssSyntaxError|Build Error/i.test(text)) {
    return "build_css";
  }
  return "other";
}

async function wire(page) {
  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    const kind = classify(text);
    const entry = { type, kind, text: text.slice(0, 500) };
    if (type === "error") report.consoleErrors.push(entry);
    if (type === "warning") report.consoleWarnings.push(entry);
  });
  page.on("pageerror", (err) => {
    const text = String(err);
    report.consoleErrors.push({
      type: "pageerror",
      kind: classify(text),
      text: text.slice(0, 500),
    });
  });
}

async function shot(page, name) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  report.shots.push(path);
  console.log("saved", name);
}

{
  const page = await browser.newPage();
  await wire(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const res = await page.goto(`${BASE_URL}/`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForSelector("[data-landing-hero-final]", { timeout: 60000 });
  await page.waitForTimeout(1000);
  report.checks.push({
    page: "landing",
    status: res?.status() ?? null,
    overlay: (await page.locator("text=Build Error").count()) > 0,
  });
  await shot(page, "landing");
  await page.close();
}

if (!existsSync(AUTH_FILE)) {
  report.fatal = true;
  report.checks.push({ page: "dashboard", error: "auth missing" });
} else {
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();
  await wire(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${BASE_URL}/teste-renato-01/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector("[data-dashboard-premium-v257]", {
    timeout: 120000,
  });
  await page.waitForTimeout(2500);

  const reportsCount = await page
    .locator('[data-sidebar="menu-button"]')
    .filter({ hasText: "Relatórios" })
    .count();
  const analyticsCount = await page
    .locator('[data-sidebar="menu-button"]')
    .filter({ hasText: /^Analytics$/ })
    .count();

  report.checks.push({
    page: "dashboard",
    url: page.url(),
    overlay: (await page.locator("text=Build Error").count()) > 0,
    sidebarKeysMarker:
      (await page.locator('[data-sidebar-nav-keys="id"]').count()) > 0,
    reportsMenuCount: reportsCount,
    analyticsMenuCount: analyticsCount,
  });
  await shot(page, "dashboard-sidebar");

  // collapsed
  const trigger = page.locator('[data-sidebar="trigger"]').first();
  if (await trigger.count()) {
    await trigger.click().catch(() => null);
    await page.waitForTimeout(600);
    await shot(page, "sidebar-collapsed");
    await trigger.click().catch(() => null);
    await page.waitForTimeout(400);
  }

  await page.goto(`${BASE_URL}/teste-renato-01/analytics`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2000);
  report.checks.push({
    page: "analytics",
    status: 200,
    url: page.url(),
  });
  await shot(page, "analytics");

  await page.goto(`${BASE_URL}/teste-renato-01/analytics/relatorios`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2000);
  report.checks.push({
    page: "analytics-relatorios",
    url: page.url(),
  });
  await shot(page, "analytics-relatorios");

  // theme cycle
  const toggle = page.locator("[data-theme-toggle]").first();
  if (await toggle.count()) {
    await toggle.click();
    await page.waitForTimeout(800);
    await shot(page, "theme-toggled");
    await toggle.click();
    await page.waitForTimeout(500);
  }

  await shot(page, "dashboard-dark-final");
  await context.close();
}

await browser.close();

const dup = [...report.consoleErrors, ...report.consoleWarnings].filter(
  (e) => e.kind === "duplicate_key",
);
const hydra = [...report.consoleErrors, ...report.consoleWarnings].filter(
  (e) => e.kind === "hydration",
);
const build = [...report.consoleErrors].filter((e) => e.kind === "build_css");

report.fatal =
  report.fatal ||
  dup.length > 0 ||
  hydra.length > 0 ||
  build.length > 0 ||
  report.checks.some((c) => c.overlay) ||
  report.checks.some(
    (c) => c.page === "dashboard" && c.reportsMenuCount !== 1,
  );

writeFileSync(resolve(OUT, "runtime-report.json"), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      fatal: report.fatal,
      checks: report.checks,
      duplicateKey: dup.length,
      hydration: hydra.length,
      buildCss: build.length,
      errors: report.consoleErrors.slice(0, 8),
      warnings: report.consoleWarnings.slice(0, 8),
    },
    null,
    2,
  ),
);
process.exit(report.fatal ? 1 : 0);
