/**
 * Sprint 26.2.1 — Captura visual: restauração de contraste (estrutura 26.2 preservada).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/26-2-1");
mkdirSync(OUT, { recursive: true });
const TENANT = "teste-renato-01";

const report = {
  at: new Date().toISOString(),
  baseUrl: BASE_URL,
  tenant: TENANT,
  sprint: "26.2.1",
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

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, theme);
  await page.waitForTimeout(350);
}

try {
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text());
  });

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${BASE_URL}/${TENANT}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await Promise.race([
    page.waitForSelector("[data-gf-kpi-cockpit]", { timeout: 180000 }),
    page.waitForSelector("[data-dashboard-premium-v262]", { timeout: 180000 }),
    page.waitForSelector("text=/Cockpit Executivo/i", { timeout: 180000 }),
  ]);
  await page.waitForTimeout(1500);

  push(
    (await page.locator("[data-gf-kpi-cockpit]").count()) > 0,
    "kpi cockpit estrutural",
  );
  push(
    (await page.locator("[data-gf-executive-header]").count()) > 0,
    "executive header estrutural",
  );
  push(
    (await page.locator("[data-gf-revenue-chart]").count()) > 0,
    "revenue chart estrutural",
  );
  push(
    (await page.locator("text=/AUTORAL|ASSINATURA/i").count()) === 0,
    "sem badges técnicos na UI",
  );

  // Dashboard dark
  await setTheme(page, "dark");
  await shot(page, "dashboard-dark", true);
  await crop(page, "[data-gf-executive-header]", "header");
  await crop(page, "[data-gf-kpi-cockpit]", "kpis-desktop");
  await crop(page, "[data-gf-revenue-chart], [data-chart-panel]", "grafico");
  const point = page.locator("[data-chart-revenue] button").first();
  if (await point.count()) {
    await point.hover();
    await page.waitForTimeout(400);
    await crop(page, "[data-chart-tooltip], [data-chart-revenue]", "tooltip");
  } else {
    await shot(page, "tooltip");
  }
  await crop(page, "[data-intel-panel]", "central-inteligencia-dark");

  // Dashboard light
  await setTheme(page, "light");
  await shot(page, "dashboard-light", true);
  await crop(page, "[data-intel-panel]", "central-inteligencia-light");

  // KPIs notebook / mobile
  await page.setViewportSize({ width: 1440, height: 900 });
  await setTheme(page, "dark");
  await page.waitForTimeout(400);
  await crop(page, "[data-gf-kpi-cockpit]", "kpis-notebook");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await crop(page, "[data-gf-kpi-cockpit]", "kpis-mobile");

  // Analytics dark + light
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${BASE_URL}/${TENANT}/analytics/executivo`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(2000);
  await setTheme(page, "dark");
  await shot(page, "analytics-dark", true);
  await setTheme(page, "light");
  await shot(page, "analytics-light", true);
  push(
    (await page.locator("[data-analytics-legible], [data-analytics-sources-panel]").count()) >
      0 ||
      (await page.locator("text=/Analytics|Cobertura|Executivo/i").count()) > 0,
    "analytics page",
  );

  // CRM + Financeiro (light + dark snapshot)
  for (const [route, name] of [
    [`/${TENANT}/crm`, "crm"],
    [`/${TENANT}/financeiro`, "financeiro"],
  ]) {
    await page.goto(`${BASE_URL}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForTimeout(2000);
    // Theme via localStorage + reload for persistence across client navigations
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      try {
        localStorage.setItem("theme", "dark");
      } catch {
        /* ignore */
      }
    });
    await page.waitForTimeout(500);
    await shot(page, `${name}-dark`, true);
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      try {
        localStorage.setItem("theme", "light");
      } catch {
        /* ignore */
      }
    });
    await page.waitForTimeout(500);
    await shot(page, `${name}-light`, true);
  }

  // KPI truncation check (featured value overflow)
  await page.goto(`${BASE_URL}/${TENANT}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector("[data-kpi-no-truncation]", { timeout: 180000 });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await setTheme(page, "dark");
  const trunc = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll("[data-kpi-no-truncation]")];
    return nodes.map((el) => ({
      text: el.textContent?.trim() ?? "",
      overflow: el.scrollWidth > el.clientWidth + 1,
    }));
  });
  const anyOverflow = trunc.some((t) => t.overflow);
  push(!anyOverflow, `kpi values not clipped (${trunc.length} metrics)`);
  if (anyOverflow) {
    report.kpiOverflow = trunc.filter((t) => t.overflow);
  }

  await context.close();
} catch (err) {
  report.fatal = String(err);
  console.error(err);
} finally {
  await browser.close();
  writeFileSync(resolve(OUT, "capture-report.json"), JSON.stringify(report, null, 2));
  console.log(
    "Shots",
    report.shots.length,
    "FAIL",
    report.checks.filter((c) => !c.ok).length,
  );
}
