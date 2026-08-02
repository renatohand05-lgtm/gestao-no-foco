#!/usr/bin/env node
/**
 * Sprint 30.4 — Browser QA Executive Cockpit V2.
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

const OUT = resolve("docs/testing/evidence/30-4");
const TENANT = "teste-renato-01";
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "30.4",
  tenant: TENANT,
  baseUrl: BASE_URL,
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
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const ctx = await browser.newContext({
      storageState: AUTH_FILE,
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await ctx.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        report.consoleErrors.push(`[${vp.name}] ${msg.text().slice(0, 180)}`);
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
    await page.waitForTimeout(1500);
    const coldMs = Date.now() - t0;
    report.timings[`${vp.name}_cold_ms`] = coldMs;
    push(res?.status() === 200, `${vp.name} GET dashboard ${res?.status()}`);
    push(coldMs <= 8000, `${vp.name} cold load ${coldMs}ms (soft <=8s QA local)`);

    const body = await page.locator("body").innerText();
    push(
      (await page.locator("[data-dashboard-premium-v304]").count()) > 0 ||
        (await page.locator('[data-signature="30.4"]').count()) > 0,
      `${vp.name} cockpit v2 marker`,
    );
    push(
      (await page.locator('[data-cockpit-block="kpis"]').count()) > 0 ||
        /KPIs principais|Faturamento/i.test(body),
      `${vp.name} KPIs`,
    );
    push(
      (await page.locator('[data-cockpit-block="executive-brief"]').count()) > 0 ||
        /Executive Brief|Resumo do dia/i.test(body),
      `${vp.name} Executive Brief`,
    );
    push(
      (await page.locator('[data-cockpit-block="alerts"]').count()) > 0 ||
        /Central de alertas/i.test(body),
      `${vp.name} Alertas`,
    );
    push(
      (await page.locator('[data-cockpit-block="quick-actions"]').count()) > 0 ||
        /Quick Actions|Nova venda/i.test(body),
      `${vp.name} Quick Actions`,
    );
    push(
      /Meta do mês|Metas/i.test(body),
      `${vp.name} Metas`,
    );
    push(
      /Fluxo de caixa|Saldo atual/i.test(body),
      `${vp.name} Fluxo Caixa`,
    );
    push(
      /DRE executivo|Receita/i.test(body),
      `${vp.name} DRE`,
    );

    await setTheme(page, "light");
    await shot(page, `${vp.name}-light`);
    await setTheme(page, "dark");
    await shot(page, `${vp.name}-dark`);

    if (vp.name === "desktop") {
      const t1 = Date.now();
      await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
      await page.waitForTimeout(800);
      const warmMs = Date.now() - t1;
      report.timings.desktop_warm_ms = warmMs;
      push(warmMs <= 6000, `desktop warm load ${warmMs}ms (soft <=6s QA local)`);

      const kpiBtn = page.locator("[data-kpi-id='faturamento']").first();
      if ((await kpiBtn.count()) > 0) {
        await kpiBtn.click();
        await page.waitForTimeout(400);
        push(
          (await page.locator("[data-cockpit-drilldown]").count()) > 0 ||
            (await page.getByRole("dialog").count()) > 0,
          "drill-down dialog KPI",
        );
        await shot(page, "kpi-drilldown");
        await page.keyboard.press("Escape");
      } else {
        push(false, "drill-down dialog KPI");
      }
    }

    await ctx.close();
  }

  const failed = report.checks.filter((c) => !c.ok).length;
  const passed = report.checks.filter((c) => c.ok).length;
  report.summary = { passed, failed, consoleErrors: report.consoleErrors.length };
  writeFileSync(resolve(OUT, "browser-qa.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    resolve(OUT, "browser-run.log"),
    `PASS ${passed}\nFAIL ${failed}\nCOLD ${report.timings.desktop_cold_ms ?? "?"}\nWARM ${report.timings.desktop_warm_ms ?? "?"}\n`,
  );
  console.log(`\nBrowser QA: ${passed} PASS · ${failed} FAIL`);
  process.exit(failed > 0 ? 1 : 0);
} finally {
  await browser.close();
}
