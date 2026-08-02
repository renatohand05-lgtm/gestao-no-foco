#!/usr/bin/env node
/**
 * Sprint 30.4.1 — Browser QA performance + UX polish.
 * Targets: cold <=3000ms · warm <=1500ms (documenta se não atingir).
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

const OUT = resolve("docs/testing/evidence/30-4-1");
const TENANT = "teste-renato-01";
const COLD_TARGET = 3000;
const WARM_TARGET = 1500;
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "30.4.1",
  tenant: TENANT,
  baseUrl: BASE_URL,
  targets: { coldMs: COLD_TARGET, warmMs: WARM_TARGET },
  baseline: { coldMs: 4802, warmMs: 3955 },
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
    { name: "notebook", width: 1366, height: 768 },
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
    }

    const t0 = Date.now();
    const res = await page.goto(`${BASE_URL}/${TENANT}/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 180000,
    });
    // First paint cockpit markers — não espera gráficos pesados
    await page
      .waitForSelector(
        '[data-cockpit-block="kpis"], [data-dashboard-premium-v304], [data-dashboard-premium-v3041]',
        { timeout: 60000 },
      )
      .catch(() => null);
    const coldMs = Date.now() - t0;
    report.timings[`${vp.name}_cold_ms`] = coldMs;

    push(res?.status() === 200, `${vp.name} GET dashboard ${res?.status()}`);
    // Functional checks always; target checks only fail desktop cold/warm vs meta
    push(
      (await page.locator("[data-cockpit-block='kpis']").count()) > 0 ||
        /KPIs principais|Faturamento/i.test(await page.locator("body").innerText()),
      `${vp.name} KPIs`,
    );
    push(
      (await page.locator("[data-cockpit-block='executive-brief']").count()) > 0 ||
        /Executive Brief/i.test(await page.locator("body").innerText()),
      `${vp.name} Executive Brief`,
    );
    push(
      (await page.locator("[data-cockpit-block='alerts']").count()) > 0 ||
        /Central de alertas/i.test(await page.locator("body").innerText()),
      `${vp.name} Alertas`,
    );
    push(
      (await page.locator("[data-cockpit-block='quick-actions']").count()) > 0 ||
        /Quick Actions|Nova venda/i.test(await page.locator("body").innerText()),
      `${vp.name} Quick Actions`,
    );

    if (vp.name === "desktop") {
      push(
        coldMs <= COLD_TARGET,
        `desktop cold ${coldMs}ms (alvo <=${COLD_TARGET}ms)`,
      );
      const t1 = Date.now();
      await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
      await page
        .waitForSelector('[data-cockpit-block="kpis"]', { timeout: 60000 })
        .catch(() => null);
      const warmMs = Date.now() - t1;
      report.timings.desktop_warm_ms = warmMs;
      push(
        warmMs <= WARM_TARGET,
        `desktop warm ${warmMs}ms (alvo <=${WARM_TARGET}ms)`,
      );
      const gainCold = Math.round(
        ((report.baseline.coldMs - coldMs) / report.baseline.coldMs) * 100,
      );
      const gainWarm = Math.round(
        ((report.baseline.warmMs - warmMs) / report.baseline.warmMs) * 100,
      );
      report.gains = { coldPct: gainCold, warmPct: gainWarm };
      push(true, `ganho cold ~${gainCold}% · warm ~${gainWarm}% (informativo)`);

      await setTheme(page, "light");
      await shot(page, "desktop-light");
      await setTheme(page, "dark");
      await shot(page, "desktop-dark");
    } else if (vp.name === "tablet" || vp.name === "mobile390") {
      await setTheme(page, "light");
      await shot(page, `${vp.name}-light`);
      await setTheme(page, "dark");
      await shot(page, `${vp.name}-dark`);
    }

    await ctx.close();
  }

  const failed = report.checks.filter((c) => !c.ok).length;
  const passed = report.checks.filter((c) => c.ok).length;
  report.summary = {
    passed,
    failed,
    coldTargetMet: Boolean(
      report.timings.desktop_cold_ms != null &&
        report.timings.desktop_cold_ms <= COLD_TARGET,
    ),
    warmTargetMet: Boolean(
      report.timings.desktop_warm_ms != null &&
        report.timings.desktop_warm_ms <= WARM_TARGET,
    ),
  };
  writeFileSync(resolve(OUT, "browser-qa.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    resolve(OUT, "browser-run.log"),
    `PASS ${passed}\nFAIL ${failed}\nCOLD ${report.timings.desktop_cold_ms}\nWARM ${report.timings.desktop_warm_ms}\nCOLD_TARGET_MET ${report.summary.coldTargetMet}\nWARM_TARGET_MET ${report.summary.warmTargetMet}\n`,
  );
  console.log(`\nBrowser QA 30.4.1: ${passed} PASS · ${failed} FAIL`);
  console.log(
    `Cold ${report.timings.desktop_cold_ms}ms · Warm ${report.timings.desktop_warm_ms}ms`,
  );
  process.exit(failed > 0 ? 1 : 0);
} finally {
  await browser.close();
}
