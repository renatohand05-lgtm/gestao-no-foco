/**
 * Sprint 25.7.1 — Validação runtime real (sem overlay Build Error).
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/25-7-1");
mkdirSync(OUT, { recursive: true });

const report = {
  at: new Date().toISOString(),
  baseUrl: BASE_URL,
  checks: [],
  consoleErrors: [],
  consoleWarnings: [],
  shots: [],
  fatal: false,
};

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

async function wire(page) {
  page.on("console", (msg) => {
    const t = msg.type();
    const text = msg.text();
    if (t === "error") report.consoleErrors.push(text.slice(0, 500));
    if (t === "warning") report.consoleWarnings.push(text.slice(0, 300));
  });
  page.on("pageerror", (err) => {
    report.consoleErrors.push(`pageerror: ${String(err).slice(0, 500)}`);
  });
}

async function shot(page, name) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  report.shots.push(path);
  console.log("saved", name);
}

function hasBuildOverlay(page) {
  return Promise.all([
    page.locator("text=Build Error").count(),
    page.locator("text=CssSyntaxError").count(),
  ]).then(([a, b]) => a + b > 0);
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
  await page.waitForTimeout(1200);
  const overlay = await hasBuildOverlay(page);
  report.checks.push({
    page: "landing",
    status: res?.status() ?? null,
    overlay,
    rendered: (await page.locator("h1").count()) > 0,
  });
  await shot(page, "landing-1440");
  await page.close();
}

{
  const page = await browser.newPage();
  await wire(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const res = await page.goto(`${BASE_URL}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(1200);
  report.checks.push({
    page: "login",
    status: res?.status() ?? null,
    overlay: await hasBuildOverlay(page),
    rendered:
      (await page.locator('input[type="email"], input[name="email"]').count()) >
      0,
  });
  await shot(page, "login-1440");
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

  const nav = page.goto(`${BASE_URL}/teste-renato-01/dashboard`, {
    waitUntil: "commit",
    timeout: 90000,
  });
  await page.waitForTimeout(280);
  await shot(page, "loader-or-early");
  await nav.catch(() => null);

  await page.waitForSelector(
    "[data-dashboard-premium-v257], [data-dashboard-premium-v2561]",
    { timeout: 120000 },
  );
  await page.waitForTimeout(2200);

  const overlay = await hasBuildOverlay(page);
  const kpi = await page.locator("[data-kpi-value]").count();
  const chartLabels = await page.locator("[data-revenue-label]").count();
  const body = await page.locator("body").innerText();
  report.checks.push({
    page: "dashboard-dark",
    url: page.url(),
    overlay,
    kpi,
    chartLabels,
    hasCockpit: /Cockpit|Faturamento/i.test(body),
    reactRendered:
      (await page.locator("[data-dashboard-premium-v257]").count()) > 0,
  });
  await shot(page, "dashboard-1440-dark");

  await page.evaluate(() => {
    localStorage.setItem("gof-theme-preference", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-gof-theme", "light");
  });
  await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("[data-dashboard-premium-v257]", {
    timeout: 120000,
  });
  await page.waitForTimeout(1800);
  report.checks.push({
    page: "dashboard-light",
    overlay: await hasBuildOverlay(page),
  });
  await shot(page, "dashboard-1440-light");

  await page.evaluate(() => {
    localStorage.setItem("gof-theme-preference", "dark");
    document.documentElement.classList.add("dark");
  });
  await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("[data-dashboard-premium-v257]", {
    timeout: 120000,
  });
  await page.waitForTimeout(1500);
  const trigger = page.locator("#premium-trigger-ia");
  if (await trigger.count()) {
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await page.waitForTimeout(1000);
    await shot(page, "command-center-open");
    for (const [sel, name] of [
      ['[data-premium-v257="business-health"]', "business-health"],
      ['[data-premium-v257="decision-center"]', "decision-center"],
      ['[data-premium-v257="simulation-card"]', "simulator"],
    ]) {
      const loc = page.locator(sel).first();
      if (await loc.count()) {
        await loc.scrollIntoViewIfNeeded();
        await page.waitForTimeout(350);
        await shot(page, name);
      }
    }
  }

  const header = page.locator('[data-premium-v257="header"]').first();
  if (await header.count()) {
    await header.screenshot({ path: resolve(OUT, "header-1440.png") });
    report.shots.push(resolve(OUT, "header-1440.png"));
  }
  const sidebar = page.locator('[data-premium-v257="sidebar"]').first();
  if (await sidebar.count()) {
    await sidebar.screenshot({ path: resolve(OUT, "sidebar-1440.png") });
    report.shots.push(resolve(OUT, "sidebar-1440.png"));
  }

  await context.close();
}

await browser.close();

const fatalCss = report.consoleErrors.some((e) =>
  /CssSyntaxError|Build Error|Unexpected end of JSON/i.test(e),
);
report.fatal =
  fatalCss ||
  report.checks.some((c) => c.overlay === true || c.error) ||
  !report.checks.some((c) => c.page === "dashboard-dark" && c.reactRendered);

writeFileSync(resolve(OUT, "runtime-report.json"), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      fatal: report.fatal,
      checks: report.checks,
      errCount: report.consoleErrors.length,
      warnCount: report.consoleWarnings.length,
      errorsSample: report.consoleErrors.slice(0, 6),
    },
    null,
    2,
  ),
);
process.exit(report.fatal ? 1 : 0);
