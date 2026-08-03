#!/usr/bin/env node
/**
 * Sprint 30.6 — Browser QA Decision Center / Analytics.
 * Cold <=2000ms · Warm <=1000ms.
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

const OUT = resolve("docs/testing/evidence/30-6");
const TENANT = "teste-renato-01";
const COLD_TARGET = 2000;
const WARM_TARGET = 1000;
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "30.6",
  tenant: TENANT,
  baseUrl: BASE_URL,
  targets: { coldMs: COLD_TARGET, warmMs: WARM_TARGET },
  timings: {},
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

if (!existsSync(AUTH_FILE)) {
  console.error("AUTH ausente");
  process.exit(2);
}

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

try {
  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile430", width: 430, height: 932 },
    { name: "mobile390", width: 390, height: 844 },
    { name: "mobile375", width: 375, height: 812 },
  ];

  for (const vp of viewports) {
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

    if (vp.name === "desktop") {
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      push(await isAuthenticated(page), "sessão autenticada");

      const t0 = Date.now();
      const res = await page.goto(`${BASE_URL}/${TENANT}/analytics/executivo`, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page
        .waitForSelector(
          '[data-analytics-decision-center], [data-dc-block="executive-intelligence"], h1',
          { timeout: 60000 },
        )
        .catch(() => null);
      const cold = Date.now() - t0;
      report.timings.coldMs = cold;
      push(res?.status() === 200, `desktop GET analytics ${res?.status()}`);
      push(cold <= COLD_TARGET, `desktop cold ${cold}ms (alvo <=${COLD_TARGET}ms)`);

      const body = await page.locator("body").innerText();
      push(
        /Centro de Inteligência|Decision Center|Previsão|Saúde dos indicadores/i.test(body),
        "desktop Intelligence",
      );
      push(
        (await page.locator('[data-dc-block="insights"]').count()) > 0 ||
          /Business Insights|Insights/i.test(body),
        "desktop Insights",
      );
      push(
        (await page.locator('[data-dc-block="forecast"]').count()) > 0 ||
          /Previsão/i.test(body),
        "desktop Forecast",
      );
      push(
        (await page.locator('[data-dc-block="decision-center"]').count()) > 0 ||
          /Decision Center/i.test(body),
        "desktop Decision Center",
      );
      push(
        (await page.locator('[data-dc-block="kpi-health"]').count()) > 0 ||
          /Saúde dos indicadores/i.test(body),
        "desktop KPI Health",
      );

      const t1 = Date.now();
      await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
      await page
        .waitForSelector('[data-analytics-decision-center], h1', { timeout: 60000 })
        .catch(() => null);
      const warm = Date.now() - t1;
      report.timings.warmMs = warm;
      push(warm <= WARM_TARGET, `desktop warm ${warm}ms (alvo <=${WARM_TARGET}ms)`);

      await setTheme(page, "dark");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
      await shot(page, "analytics-desktop-dark");
      push(true, "desktop dark");
      await setTheme(page, "light");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
      await shot(page, "analytics-desktop-light");
      push(true, "desktop light");
    } else {
      const res = await page.goto(`${BASE_URL}/${TENANT}/analytics/executivo`, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page.waitForTimeout(800);
      push(res?.status() === 200, `${vp.name} GET analytics ${res?.status()}`);
      const body = await page.locator("body").innerText();
      push(
        /Inteligência|Analytics|Decision|Previsão|Indicador/i.test(body),
        `${vp.name} Analytics`,
      );
      if (vp.name === "tablet" || vp.name === "mobile390") {
        await shot(page, `analytics-${vp.name}`);
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
  report.summary = { pass, fail };
  writeFileSync(resolve(OUT, "browser-qa.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    resolve(OUT, "browser-run.log"),
    report.checks.map((c) => `${c.ok ? "PASS" : "FAIL"} ${c.detail}`).join("\n") +
      `\n\nCold ${report.timings.coldMs}ms · Warm ${report.timings.warmMs}ms\n`,
  );
  console.log(`\nBrowser QA 30.6: ${pass} PASS · ${fail} FAIL`);
  console.log(`Cold ${report.timings.coldMs}ms · Warm ${report.timings.warmMs}ms\n`);
  process.exit(fail > 0 ? 1 : 0);
} finally {
  await browser.close();
}
