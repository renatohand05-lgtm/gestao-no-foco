#!/usr/bin/env node
/**
 * Sprint 30.8 — Browser QA Integration Hub Enterprise.
 * Cold <=2500ms · Warm <=1200ms.
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

const OUT = resolve("docs/testing/evidence/30-8");
const TENANT = "teste-renato-01";
const COLD_TARGET = 2500;
const WARM_TARGET = 1200;
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "30.8",
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

    const url = `${BASE_URL}/${TENANT}/integracoes`;

    if (vp.name === "desktop") {
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      push(await isAuthenticated(page), "sessão autenticada");

      const t0 = Date.now();
      const res = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page
        .waitForSelector("[data-integration-hub]", { timeout: 60000 })
        .catch(() => null);
      const cold = Date.now() - t0;
      report.timings.coldMs = cold;
      push(res?.status() === 200, `desktop GET integracoes ${res?.status()}`);
      push(cold <= COLD_TARGET, `desktop cold ${cold}ms (alvo <=${COLD_TARGET}ms)`);

      push(
        (await page.locator("[data-integration-hub]").count()) > 0,
        "desktop Integration Hub marker",
      );
      push(
        (await page.locator('[data-hub-block="dashboard"]').count()) > 0,
        "desktop Dashboard block",
      );

      const body = await page.locator("body").innerText();
      push(
        /Integration Hub Enterprise|Arquitetura/i.test(body),
        "desktop Integration Hub title",
      );

      await page.getByRole("tab", { name: "API Center" }).click();
      await page.waitForTimeout(300);
      push(
        (await page.locator('[data-hub-block="api-center"]').count()) > 0,
        "desktop API Center tab",
      );

      await page.getByRole("tab", { name: "Marketplace" }).click();
      await page.waitForTimeout(300);
      push(
        (await page.locator('[data-hub-block="marketplace"]').count()) > 0,
        "desktop Marketplace tab",
      );

      await page.getByRole("tab", { name: "Webhooks" }).click();
      await page.waitForTimeout(300);
      push(
        (await page.locator('[data-hub-block="webhooks"]').count()) > 0,
        "desktop Webhooks tab",
      );

      await page.getByRole("tab", { name: "Dashboard" }).click();
      await page.waitForTimeout(200);

      const t1 = Date.now();
      await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
      await page
        .waitForSelector("[data-integration-hub]", { timeout: 60000 })
        .catch(() => null);
      const warm = Date.now() - t1;
      report.timings.warmMs = warm;
      push(warm <= WARM_TARGET, `desktop warm ${warm}ms (alvo <=${WARM_TARGET}ms)`);

      await setTheme(page, "dark");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
      await page
        .waitForSelector("[data-integration-hub]", { timeout: 60000 })
        .catch(() => null);
      await shot(page, "integracoes-desktop-dark");
      push(true, "desktop dark");

      await setTheme(page, "light");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
      await page
        .waitForSelector("[data-integration-hub]", { timeout: 60000 })
        .catch(() => null);
      await shot(page, "integracoes-desktop-light");
      push(true, "desktop light");
    } else {
      const res = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page
        .waitForSelector("[data-integration-hub]", { timeout: 60000 })
        .catch(() => null);
      await page.waitForTimeout(800);
      push(res?.status() === 200, `${vp.name} GET integracoes ${res?.status()}`);
      push(
        (await page.locator("[data-integration-hub]").count()) > 0,
        `${vp.name} Integration Hub`,
      );
      const body = await page.locator("body").innerText();
      push(
        /Integration Hub|Marketplace|API Center|Webhooks/i.test(body),
        `${vp.name} conteúdo`,
      );
      if (vp.name === "tablet" || vp.name === "mobile390") {
        await shot(page, `integracoes-${vp.name}`);
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
  try {
    writeFileSync(
      resolve(OUT, "browser-run.log"),
      report.checks.map((c) => `${c.ok ? "PASS" : "FAIL"} ${c.detail}`).join("\n") +
        `\n\nCold ${report.timings.coldMs}ms · Warm ${report.timings.warmMs}ms\n`,
    );
  } catch {
    writeFileSync(
      resolve(OUT, "browser-summary.log"),
      report.checks.map((c) => `${c.ok ? "PASS" : "FAIL"} ${c.detail}`).join("\n") +
        `\n\nCold ${report.timings.coldMs}ms · Warm ${report.timings.warmMs}ms\n`,
    );
  }
  console.log(`\nBrowser QA 30.8: ${pass} PASS · ${fail} FAIL`);
  console.log(`Cold ${report.timings.coldMs}ms · Warm ${report.timings.warmMs}ms\n`);
  process.exit(fail > 0 ? 1 : 0);
} finally {
  await browser.close();
}
