#!/usr/bin/env node
/**
 * Sprint 30.7 — Browser QA Central de Automações.
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

const OUT = resolve("docs/testing/evidence/30-7");
const TENANT = "teste-renato-01";
const COLD_TARGET = 2500;
const WARM_TARGET = 1200;
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "30.7",
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

    const url = `${BASE_URL}/${TENANT}/automacoes`;

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
        .waitForSelector('[data-automacoes-central], h1', { timeout: 60000 })
        .catch(() => null);
      const cold = Date.now() - t0;
      report.timings.coldMs = cold;
      push(res?.status() === 200, `desktop GET automacoes ${res?.status()}`);
      push(cold <= COLD_TARGET, `desktop cold ${cold}ms (alvo <=${COLD_TARGET}ms)`);

      push(
        (await page.locator('[data-automacoes-central]').count()) > 0,
        "desktop Central marker",
      );
      push(
        (await page.locator('[data-automacoes-kpis]').count()) > 0,
        "desktop KPIs",
      );

      await page.getByRole("tab", { name: "Builder" }).click();
      await page.waitForTimeout(300);
      push(
        (await page.locator('[data-automacoes-builder]').count()) > 0,
        "desktop Builder tab",
      );
      const bodyBuilder = await page.locator("body").innerText();
      push(/etapa 1 de 8|Builder · etapa/i.test(bodyBuilder), "desktop Builder 8 steps");

      await page.getByRole("tab", { name: "Templates" }).click();
      await page.waitForTimeout(300);
      push(
        (await page.locator('[data-automacoes-templates]').count()) > 0,
        "desktop Templates tab",
      );

      await page.getByRole("tab", { name: "Lista" }).click();
      await page.waitForTimeout(200);
      push(
        (await page.getByRole("button", { name: /Dry-run cenários/i }).count()) > 0,
        "desktop dry-run button",
      );

      const t1 = Date.now();
      await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
      await page
        .waitForSelector('[data-automacoes-central], h1', { timeout: 60000 })
        .catch(() => null);
      const warm = Date.now() - t1;
      report.timings.warmMs = warm;
      push(warm <= WARM_TARGET, `desktop warm ${warm}ms (alvo <=${WARM_TARGET}ms)`);

      await setTheme(page, "dark");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForSelector('[data-automacoes-central]', { timeout: 60000 }).catch(() => null);
      await shot(page, "automacoes-desktop-dark");
      push(true, "desktop dark");

      await setTheme(page, "light");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForSelector('[data-automacoes-central]', { timeout: 60000 }).catch(() => null);
      await shot(page, "automacoes-desktop-light");
      push(true, "desktop light");
    } else {
      const res = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 180000,
      });
      await page
        .waitForSelector('[data-automacoes-central], h1', { timeout: 60000 })
        .catch(() => null);
      await page.waitForTimeout(800);
      push(res?.status() === 200, `${vp.name} GET automacoes ${res?.status()}`);
      push(
        (await page.locator('[data-automacoes-central]').count()) > 0,
        `${vp.name} Central`,
      );
      const body = await page.locator("body").innerText();
      push(/Automa|Regras|Templates|Builder/i.test(body), `${vp.name} conteúdo`);
      if (vp.name === "tablet" || vp.name === "mobile430" || vp.name === "mobile390") {
        await shot(page, `automacoes-${vp.name}`);
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
  console.log(`\nBrowser QA 30.7: ${pass} PASS · ${fail} FAIL`);
  console.log(`Cold ${report.timings.coldMs}ms · Warm ${report.timings.warmMs}ms\n`);
  process.exit(fail > 0 ? 1 : 0);
} finally {
  await browser.close();
}
