#!/usr/bin/env node
/**
 * Sprint 30.8.1 — Browser QA Integration Hub Enterprise.
 * Cold <=2500ms · Warm <=1200ms · 10 tabs <500ms (após 1ª).
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

const OUT = resolve("docs/testing/evidence/30-8-1");
const TENANT = "teste-renato-01";
const COLD_TARGET = 2500;
const WARM_TARGET = 1200;
const TAB_SWITCH_TARGET = 500;
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const TAB_LABELS = [
  "Dashboard",
  "API Center",
  "Marketplace",
  "Connections",
  "Webhooks",
  "Scheduler",
  "Event Bus",
  "Logs",
  "Monitor",
  "Config",
];

const VIEWPORTS = [
  { name: "desktop1920", width: 1920, height: 1080, kind: "desktop" },
  { name: "desktop1440", width: 1440, height: 900, kind: "desktop", primary: true },
  { name: "desktop1366", width: 1366, height: 768, kind: "desktop" },
  { name: "desktop1024", width: 1024, height: 768, kind: "desktop" },
  { name: "tablet768", width: 768, height: 1024, kind: "tablet" },
  { name: "mobile430", width: 430, height: 932, kind: "mobile" },
  { name: "mobile390", width: 390, height: 844, kind: "mobile" },
  { name: "mobile375", width: 375, height: 812, kind: "mobile" },
];

const report = {
  at: new Date().toISOString(),
  sprint: "30.8.1",
  tenant: TENANT,
  baseUrl: BASE_URL,
  targets: {
    coldMs: COLD_TARGET,
    warmMs: WARM_TARGET,
    tabSwitchMs: TAB_SWITCH_TARGET,
  },
  timings: {},
  tabSwitchMs: [],
  checks: [],
  consoleErrors: [],
};

function push(ok, detail) {
  report.checks.push({ ok: Boolean(ok), detail });
  console.log(ok ? "  PASS" : "  FAIL", detail);
}

async function shot(page, name) {
  await page.screenshot({
    path: resolve(OUT, `screenshots/${name}.png`),
    fullPage: false,
  });
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.setAttribute("data-gof-theme", t);
    document.documentElement.style.colorScheme = t;
  }, theme);
}

function writeOutputs() {
  const pass = report.checks.filter((c) => c.ok).length;
  const fail = report.checks.filter((c) => !c.ok).length;
  report.summary = { pass, fail };
  writeFileSync(resolve(OUT, "browser-qa.json"), JSON.stringify(report, null, 2));
  const logBody =
    report.checks.map((c) => `${c.ok ? "PASS" : "FAIL"} ${c.detail}`).join("\n") +
    `\n\nCold ${report.timings.coldMs ?? "—"}ms · Warm ${report.timings.warmMs ?? "—"}ms\n` +
    (report.tabSwitchMs.length
      ? `Tab switches: ${report.tabSwitchMs.map((t) => `${t.label}=${t.ms}ms`).join(", ")}\n`
      : "");
  try {
    writeFileSync(resolve(OUT, "browser-run.log"), logBody);
  } catch (err) {
    if (err?.code === "EBUSY") {
      writeFileSync(resolve(OUT, "browser-run.retry.log"), logBody);
    } else {
      throw err;
    }
  }
}

if (!existsSync(AUTH_FILE)) {
  console.error("AUTH ausente");
  process.exit(2);
}

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

try {
  const baseUrl = `${BASE_URL}/${TENANT}/integracoes`;

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      storageState: AUTH_FILE,
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await ctx.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        report.consoleErrors.push(`[${vp.name}] ${msg.text().slice(0, 160)}`);
      }
    });

    if (vp.primary) {
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      push(await isAuthenticated(page), "sessão autenticada");

      const t0 = Date.now();
      const res = await page.goto(baseUrl, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page
        .waitForSelector("[data-integration-hub]", { timeout: 60000 })
        .catch(() => null);
      const cold = Date.now() - t0;
      report.timings.coldMs = cold;
      push(res?.status() === 200, `GET integracoes ${res?.status()}`);
      push(cold <= COLD_TARGET, `cold ${cold}ms (alvo <=${COLD_TARGET}ms)`);
      push(
        (await page.locator("[data-integration-hub]").count()) > 0,
        "Integration Hub marker",
      );

      const resMkt = await page.goto(`${baseUrl}?tab=marketplace`, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page
        .waitForSelector('[data-hub-block="marketplace"]', { timeout: 60000 })
        .catch(() => null);
      push(resMkt?.status() === 200, `GET ?tab=marketplace ${resMkt?.status()}`);
      push(
        (await page.locator('[data-hub-block="marketplace"]').count()) > 0,
        "Marketplace tab via URL",
      );

      const resApi = await page.goto(`${baseUrl}?tab=api`, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page
        .waitForSelector('[data-hub-block="api-center"]', { timeout: 60000 })
        .catch(() => null);
      push(resApi?.status() === 200, `GET ?tab=api ${resApi?.status()}`);
      push(
        (await page.locator('[data-hub-block="api-center"]').count()) > 0,
        "API Center tab via URL",
      );

      await page.goto(baseUrl, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page
        .waitForSelector("[data-integration-hub]", { timeout: 60000 })
        .catch(() => null);

      let firstTabMs = null;
      for (let i = 0; i < TAB_LABELS.length; i++) {
        const label = TAB_LABELS[i];
        const t1 = Date.now();
        await page.getByRole("tab", { name: label }).click();
        await page.waitForTimeout(50);
        const ms = Date.now() - t1;
        report.tabSwitchMs.push({ label, ms });
        if (i === 0) {
          firstTabMs = ms;
          push(true, `tab 1ª (${label}) ${ms}ms (baseline)`);
        } else {
          push(
            ms < TAB_SWITCH_TARGET,
            `tab switch ${label} ${ms}ms (alvo <${TAB_SWITCH_TARGET}ms)`,
          );
        }
      }
      report.timings.firstTabMs = firstTabMs;

      await page.getByRole("tab", { name: "Dashboard" }).click();
      await page.waitForTimeout(200);

      const tWarm = Date.now();
      await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
      await page
        .waitForSelector("[data-integration-hub]", { timeout: 60000 })
        .catch(() => null);
      const warm = Date.now() - tWarm;
      report.timings.warmMs = warm;
      push(warm <= WARM_TARGET, `warm ${warm}ms (alvo <=${WARM_TARGET}ms)`);

      await setTheme(page, "dark");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
      await page
        .waitForSelector("[data-integration-hub]", { timeout: 60000 })
        .catch(() => null);
      await shot(page, "integracoes-desktop-dark");
      push(true, "desktop dark screenshot");

      await setTheme(page, "light");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
      await page
        .waitForSelector("[data-integration-hub]", { timeout: 60000 })
        .catch(() => null);
      await shot(page, "integracoes-desktop-light");
      push(true, "desktop light screenshot");
    } else {
      const res = await page.goto(baseUrl, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page
        .waitForSelector("[data-integration-hub]", { timeout: 60000 })
        .catch(() => null);
      await page.waitForTimeout(600);
      push(res?.status() === 200, `${vp.name} GET integracoes ${res?.status()}`);
      push(
        (await page.locator("[data-integration-hub]").count()) > 0,
        `${vp.name} Integration Hub`,
      );

      if (vp.name === "tablet768") {
        await shot(page, "integracoes-tablet-768");
        push(true, "tablet-768 screenshot");
      }
      if (vp.name === "mobile390") {
        await shot(page, "integracoes-mobile-390");
        push(true, "mobile-390 screenshot");
      }
      if (vp.name === "mobile375") {
        await shot(page, "integracoes-mobile-375");
        push(true, "mobile-375 screenshot");
      }
    }

    await ctx.close();
  }

  const blocking = report.consoleErrors.filter(
    (t) => !/favicon|React DevTools|Download the React|hydrat/i.test(t),
  );
  push(blocking.length === 0, `console bloqueante=${blocking.length}`);

  const pass = report.checks.filter((c) => c.ok).length;
  const fail = report.checks.filter((c) => !c.ok).length;
  writeOutputs();
  console.log(`\nBrowser QA 30.8.1: ${pass} PASS · ${fail} FAIL`);
  console.log(
    `Cold ${report.timings.coldMs}ms · Warm ${report.timings.warmMs}ms\n`,
  );
  process.exit(fail > 0 ? 1 : 0);
} catch (err) {
  writeOutputs();
  throw err;
} finally {
  await browser.close();
}
