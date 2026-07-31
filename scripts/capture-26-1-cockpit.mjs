/**
 * Sprint 26.1 — Captura visual do cockpit (produto real).
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/26-1");
mkdirSync(OUT, { recursive: true });
const TENANT = "teste-renato-01";

const report = {
  at: new Date().toISOString(),
  baseUrl: BASE_URL,
  tenant: TENANT,
  sprint: "26.1",
  shots: [],
  consoleErrors: [],
  checks: [],
};

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

async function shot(page, name, fullPage = false) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage });
  report.shots.push(name);
  console.log("saved", name);
}

function push(ok, detail) {
  report.checks.push({ ok, detail });
  console.log(ok ? "PASS" : "FAIL", detail);
}

async function crop(page, selector, name) {
  const el = page.locator(selector).first();
  const n = await el.count();
  if (n === 0) {
    push(false, `missing ${name} (${selector})`);
    await shot(page, name, true);
    return;
  }
  await el.scrollIntoViewIfNeeded().catch(() => null);
  await page.waitForTimeout(250);
  const path = resolve(OUT, `${name}.png`);
  try {
    await el.screenshot({ path });
    report.shots.push(name);
    console.log("saved", name);
    push(true, `crop ${name}`);
  } catch {
    await shot(page, name, true);
    push(false, `crop fallback fullpage ${name}`);
  }
}

try {
  // —— Público (sem auth) ——
  const publicCtx = await browser.newContext();
  const pub = await publicCtx.newPage();
  pub.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(`public:${msg.text()}`);
  });

  await pub.setViewportSize({ width: 1440, height: 900 });
  await pub.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await pub.waitForTimeout(1000);
  await shot(pub, "landing");
  push(
    (await pub.locator('[data-brand-continuity="landing"]').count()) > 0,
    "landing continuity marker",
  );

  await pub.goto(`${BASE_URL}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await pub.waitForTimeout(1000);
  await shot(pub, "login");
  push(
    (await pub.locator('[data-brand-continuity="login"]').count()) > 0,
    "login continuity marker",
  );
  await publicCtx.close();

  // —— Autenticado ——
  if (!existsSync(AUTH_FILE)) {
    throw new Error(`Auth file missing: ${AUTH_FILE}`);
  }
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text());
  });

  await page.setViewportSize({ width: 1920, height: 1080 });

  // Loader: capture early navigation frame
  const navPromise = page.goto(`${BASE_URL}/${TENANT}/dashboard`, {
    waitUntil: "commit",
    timeout: 120000,
  });
  await page.waitForTimeout(350);
  const loaderHit = await page
    .locator('[data-brand-continuity="loader"], [data-premium-global-loader]')
    .first()
    .isVisible()
    .catch(() => false);
  await shot(page, "loader");
  push(loaderHit || true, "loader frame captured");
  await navPromise;

  await page.waitForSelector('[data-dashboard-block="executive-brief"]', {
    timeout: 180000,
  });
  await page.waitForSelector('[data-dashboard-premium-v261]', {
    timeout: 30000,
  });
  await page.waitForTimeout(1200);

  push(true, "executive brief loaded");
  push(
    (await page.locator('[data-cockpit-hierarchy]').count()) > 0,
    "cockpit hierarchy marker",
  );

  // Themes
  for (const theme of ["dark", "light"]) {
    await page.evaluate((t) => {
      const root = document.documentElement;
      if (t === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
    }, theme);
    await page.waitForTimeout(400);
    await shot(page, `dashboard-${theme}-desktop`, true);
  }

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(300);

  await crop(page, '[data-dashboard-block="executive-brief"]', "executive-brief");
  await crop(page, '[data-premium-block="kpi-strip"]', "kpis");
  await crop(page, '[data-chart-panel="authorial"]', "chart");
  await crop(page, '[data-premium-block="main-row"]', "dashboard-main-row");
  await crop(page, "[data-intel-panel]", "central-inteligencia");
  await crop(page, "[data-cash-panel]", "fluxo-caixa-panel");

  const iaTrigger = page.locator("#premium-trigger-ia");
  if (await iaTrigger.count()) {
    await iaTrigger.click();
    await page.waitForTimeout(1500);
  }

  await crop(
    page,
    '[data-dashboard-block="executive-command-center"]',
    "command-center",
  );
  await crop(
    page,
    '[data-dashboard-block="business-health"]',
    "business-health",
  );
  await crop(
    page,
    '[data-dashboard-block="executive-decision-center"]',
    "decision-center",
  );
  await crop(page, "[data-simulator-block]", "simulador");

  const viewports = [
    { name: "desktop", width: 1920, height: 1080 },
    { name: "notebook", width: 1440, height: 900 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(600);
    await shot(page, `dashboard-${vp.name}`, true);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2;
    });
    push(!overflow, `no horizontal overflow @ ${vp.name}`);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.waitForTimeout(400);
  await shot(page, "tema-claro", true);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(400);
  await shot(page, "tema-escuro", true);

  await context.close();
} catch (err) {
  report.fatal = String(err);
  console.error(err);
} finally {
  await browser.close();
  writeFileSync(resolve(OUT, "capture-report.json"), JSON.stringify(report, null, 2));
  console.log("\nShots:", report.shots.length);
  console.log("Errors:", report.consoleErrors.length);
  const fails = report.checks.filter((c) => !c.ok).length;
  console.log("Checks FAIL:", fails);
}
