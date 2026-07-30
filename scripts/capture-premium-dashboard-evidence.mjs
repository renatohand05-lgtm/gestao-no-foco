/**
 * Sprint 25.5.1 — Screenshots reais do dashboard premium.
 *
 * Pré-requisitos:
 *   npm run dev
 *   docs/testing/playwright/.auth/user.json (npm run test:login)
 *
 * Uso:
 *   node scripts/capture-premium-dashboard-evidence.mjs
 */

import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
  isAuthenticated,
} from "./playwright-auth.mjs";

const ROOT = resolve(import.meta.dirname ?? ".", "..");
const OUT = resolve(ROOT, "docs/testing/evidence/25-5-1");
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

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem("gof-theme-preference", t);
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.setAttribute("data-gof-theme", t);
    document.documentElement.style.colorScheme = t;
  }, theme);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1800);
}

async function waitPremium(page) {
  await page
    .waitForSelector("[data-dashboard-premium-v251]", { timeout: 90000 })
    .catch(() => null);
  await page.waitForTimeout(2200);
}

async function main() {
  console.log("Premium dashboard evidence — Sprint 25.5.1");
  console.log(`App: ${BASE_URL}`);
  console.log(`Out: ${OUT}`);

  if (!existsSync(AUTH_FILE)) {
    throw new Error(
      `Auth ausente: ${AUTH_FILE}\nExecute: npm run test:login`,
    );
  }

  ensureChromiumInstalled();
  const browser = await chromium.launch({ headless: true });
  const report = {
    at: new Date().toISOString(),
    baseUrl: BASE_URL,
    shots: [],
    errors: [],
  };

  try {
    // --- Login / splash sem sessão ---
    const anon = await browser.newContext({ baseURL: BASE_URL });
    const loginPage = await anon.newPage();
    await loginPage.setViewportSize({ width: 1440, height: 900 });
    await loginPage.goto(`${BASE_URL}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await loginPage.waitForTimeout(800);
    report.shots.push(await shot(loginPage, "00-splash-or-login-early"));
    await loginPage.waitForTimeout(1500);
    report.shots.push(await shot(loginPage, "01-login"));
    await anon.close();

    // --- Dashboard autenticado ---
    const context = await browser.newContext({
      storageState: AUTH_FILE,
      baseURL: BASE_URL,
    });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });

    const ok = await isAuthenticated(page);
    if (!ok) {
      throw new Error("Sessão Playwright inválida — rode npm run test:login");
    }

    let url = page.url();
    let tenant = null;
    const m = url.match(/\/([^/]+)\/(dashboard|ordens|clientes|financeiro)/);
    if (m) tenant = m[1];
    if (!tenant) {
      await page.goto(`${BASE_URL}/onboarding`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await page.waitForTimeout(1200);
      url = page.url();
      const m2 = url.match(
        /\/([^/]+)\/(dashboard|ordens|clientes|financeiro|primeiro-acesso)/,
      );
      tenant = m2?.[1] ?? null;
    }
    if (!tenant || tenant === "login" || tenant === "onboarding") {
      tenant = process.env.GOF_EVIDENCE_TENANT || "teste-renato-01";
    }

    report.tenant = tenant;
    const dash = `${BASE_URL}/${tenant}/dashboard`;

    await setTheme(page, "dark");
    await page.goto(dash, { waitUntil: "domcontentloaded", timeout: 90000 });
    await waitPremium(page);
    report.shots.push(await shot(page, "02-dashboard-dark-1440"));

    const collapse = page.locator('[data-sidebar="trigger"], button[data-sidebar="trigger"]').first();
    if (await collapse.count()) {
      await collapse.click().catch(() => null);
      await page.waitForTimeout(700);
      report.shots.push(await shot(page, "03-sidebar-collapsed"));
      await collapse.click().catch(() => null);
      await page.waitForTimeout(700);
      report.shots.push(await shot(page, "04-sidebar-expanded"));
    }

    await page
      .locator('[data-premium-block="main-row"]')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => null);
    report.shots.push(await shot(page, "05-inteligencia-cash"));
    await page
      .locator('[data-premium-block="alerts-rail"]')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => null);
    report.shots.push(await shot(page, "06-alertas-fiscal"));
    await page
      .locator('[data-premium-block="ask-ai"]')
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => null);
    report.shots.push(await shot(page, "07-pergunte-ia"));

    await setTheme(page, "light");
    await page.goto(dash, { waitUntil: "domcontentloaded", timeout: 90000 });
    await waitPremium(page);
    report.shots.push(await shot(page, "08-dashboard-light-1440"));

    await setTheme(page, "dark");
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(dash, { waitUntil: "domcontentloaded", timeout: 90000 });
      await waitPremium(page);
      // Fecha drawer mobile se aberto
      await page.keyboard.press("Escape").catch(() => null);
      await page.waitForTimeout(400);
      report.shots.push(await shot(page, `09-${vp.name}`));
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    const nav = page.goto(dash, { waitUntil: "commit", timeout: 90000 });
    await page.waitForTimeout(100);
    report.shots.push(await shot(page, "10-loading-or-early"));
    await nav.catch(() => null);
    await waitPremium(page);
    report.shots.push(await shot(page, "11-empty-or-ready"));

    await context.close();
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : String(err));
    console.error(err);
  } finally {
    writeFileSync(resolve(OUT, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }

  if (report.errors.length) {
    console.error("\nEvidence incomplete:", report.errors.join("; "));
    process.exit(1);
  }
  console.log(`\nOK — ${report.shots.length} screenshots em ${OUT}`);
}

main();
