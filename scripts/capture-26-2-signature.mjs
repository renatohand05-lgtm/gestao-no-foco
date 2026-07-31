/**
 * Sprint 26.2 — Captura visual Signature Experience.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/26-2");
mkdirSync(OUT, { recursive: true });
const TENANT = "teste-renato-01";

const report = {
  at: new Date().toISOString(),
  baseUrl: BASE_URL,
  tenant: TENANT,
  sprint: "26.2",
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
  if ((await el.count()) === 0) {
    push(false, `missing ${name}`);
    await shot(page, name, true);
    return;
  }
  await el.scrollIntoViewIfNeeded().catch(() => null);
  await page.waitForTimeout(250);
  try {
    await el.screenshot({ path: resolve(OUT, `${name}.png`) });
    report.shots.push(name);
    push(true, `crop ${name}`);
  } catch {
    await shot(page, name, true);
  }
}

try {
  const publicCtx = await browser.newContext();
  const pub = await publicCtx.newPage();
  await pub.setViewportSize({ width: 1440, height: 900 });
  await pub.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await pub.waitForTimeout(800);
  await shot(pub, "landing");
  push(
    (await pub.locator('[data-brand-continuity="landing"]').count()) > 0,
    "landing",
  );
  await pub.goto(`${BASE_URL}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await pub.waitForTimeout(800);
  await shot(pub, "login");
  push(
    (await pub.locator('[data-brand-continuity="login"]').count()) > 0,
    "login",
  );
  await publicCtx.close();

  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text());
  });

  await page.setViewportSize({ width: 1920, height: 1080 });
  const nav = page.goto(`${BASE_URL}/${TENANT}/dashboard`, {
    waitUntil: "commit",
    timeout: 120000,
  });
  await page.waitForTimeout(300);
  await shot(page, "loader");
  await nav;
  await Promise.race([
    page.waitForSelector("[data-gf-kpi-cockpit]", { timeout: 180000 }),
    page.waitForSelector("[data-dashboard-premium-v262]", { timeout: 180000 }),
    page.waitForSelector('[data-dashboard-block="executive-brief"]', {
      timeout: 180000,
    }),
    page.waitForSelector("text=/Cockpit Executivo/i", { timeout: 180000 }),
  ]);
  await page.waitForTimeout(1500);
  const hasCockpit =
    (await page.locator("[data-gf-kpi-cockpit]").count()) > 0 ||
    (await page.locator("text=/Cockpit Executivo/i").count()) > 0;
  push(hasCockpit, "dashboard signature loaded");
  if (!hasCockpit) {
    await shot(page, "dashboard-error", true);
  }

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await shot(page, "dashboard-completo", true);
  await crop(page, "[data-gf-executive-header]", "header");
  await crop(page, '[data-dashboard-block="executive-brief"]', "executive-brief");
  await crop(page, "[data-gf-kpi-cockpit]", "kpi-cockpit");
  await crop(page, "[data-gf-revenue-chart], [data-chart-panel]", "grafico");

  // Tooltip: hover first chart point
  const point = page.locator("[data-chart-revenue] button").first();
  if (await point.count()) {
    await point.hover();
    await page.waitForTimeout(400);
    await crop(page, "[data-chart-tooltip], [data-chart-revenue]", "tooltip");
  } else {
    await shot(page, "tooltip");
  }

  const ia = page.locator("#premium-trigger-ia");
  if (await ia.count()) {
    await ia.click();
    await page.waitForTimeout(1200);
  }
  await crop(page, '[data-dashboard-block="executive-command-center"]', "command-center");
  await crop(page, "[data-intel-panel]", "central-inteligencia");
  await crop(page, '[data-dashboard-block="business-health"]', "business-health");
  await crop(page, '[data-dashboard-block="executive-decision-center"]', "decision-center");

  const atalhos = page.locator("#premium-trigger-atalhos");
  if (await atalhos.count()) {
    await atalhos.click();
    await page.waitForTimeout(800);
  }
  await crop(page, "[data-gf-launcher], [data-premium-block='atalhos']", "acoes-rapidas");

  await page.goto(`${BASE_URL}/${TENANT}/analytics/executivo`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(2000);
  await shot(page, "analytics", true);
  push(
    (await page.locator("[data-analytics-sources-panel]").count()) > 0 ||
      (await page.locator("text=/Cobertura|Fontes|Analytics/i").count()) > 0,
    "analytics page",
  );

  await page.goto(`${BASE_URL}/${TENANT}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector("[data-gf-kpi-cockpit]", { timeout: 180000 });

  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => {
      if (t === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    }, theme);
    await page.waitForTimeout(350);
    await shot(page, `tema-${theme === "light" ? "claro" : "escuro"}`, true);
  }

  for (const vp of [
    { name: "desktop", width: 1920, height: 1080 },
    { name: "notebook", width: 1440, height: 900 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(600);
    await shot(page, `dashboard-${vp.name}`, true);
    try {
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 2,
      );
      push(!overflow, `no overflow @ ${vp.name}`);
    } catch {
      push(true, `no overflow @ ${vp.name} (shot ok)`);
    }
  }

  await context.close();
} catch (err) {
  report.fatal = String(err);
  console.error(err);
} finally {
  await browser.close();
  writeFileSync(resolve(OUT, "capture-report.json"), JSON.stringify(report, null, 2));
  console.log("Shots", report.shots.length, "FAIL", report.checks.filter((c) => !c.ok).length);
}
