/**
 * Sprint 27.6 — Captura visual Inteligência Enterprise (browser real).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/27-6");
mkdirSync(OUT, { recursive: true });

const TENANT = "teste-renato-01";
const report = {
  at: new Date().toISOString(),
  baseUrl: BASE_URL,
  tenant: TENANT,
  sprint: "27.6",
  shots: [],
  checks: [],
  consoleErrors: [],
  urls: [],
};

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

function push(ok, detail) {
  report.checks.push({ ok, detail });
  console.log(ok ? "PASS" : "FAIL", detail);
}

async function shot(page, name, fullPage = true) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage });
  report.shots.push(name);
  console.log("saved", name);
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, theme);
  await page.waitForTimeout(400);
}

async function gotoReady(page, path, selectors, timeout = 120000) {
  const res = await page.goto(`${BASE_URL}/${TENANT}/${path}`, {
    waitUntil: "domcontentloaded",
    timeout,
  });
  const list = Array.isArray(selectors) ? selectors : [selectors];
  let ok = false;
  for (const sel of list) {
    try {
      await page.waitForSelector(sel, { timeout: 45000 });
      if ((await page.locator(sel).count()) > 0) {
        ok = true;
        break;
      }
    } catch {
      /* next */
    }
  }
  await page.waitForTimeout(600);
  report.urls.push({
    path,
    final: page.url(),
    status: res?.status() ?? null,
    ok,
  });
  console.log("goto", path, "→", page.url(), "ok=", ok);
  return ok;
}

try {
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text());
  });

  await page.setViewportSize({ width: 1440, height: 900 });

  await gotoReady(page, "dashboard", [
    "[data-gf-kpi-cockpit]",
    "[data-gf-executive-header]",
  ]);

  const hubOk = await gotoReady(page, "inteligencia", [
    "[data-intelligence-hub]",
  ]);
  push(hubOk, "hub inteligencia");
  push(page.url().includes("/inteligencia"), "hub url");
  push(
    (await page.getByText(/Inteligência Enterprise/i).count()) > 0,
    "hub title",
  );
  for (const theme of ["dark", "light"]) {
    await setTheme(page, theme);
    await shot(page, `hub-${theme}-desktop`);
  }

  const copilotOk = await gotoReady(page, "inteligencia/copiloto", [
    "[data-gf-executive-copilot]",
  ]);
  push(copilotOk, "copilot mounted");
  push(page.url().includes("/copiloto"), "copilot url");
  await setTheme(page, "dark");
  await shot(page, "copiloto-vazio-dark");
  await setTheme(page, "light");
  await shot(page, "copiloto-vazio-light");

  push(
    (await page.locator("[data-gf-provider-status]").count()) > 0,
    "provider status visible",
  );

  if (copilotOk) {
    const input = page.locator("[data-gf-intelligence-input]");
    await input.fill("Como está meu caixa?");
    await page.getByRole("button", { name: /Perguntar/i }).click();
    try {
      await page.waitForSelector("[data-gf-confidence-badge]", {
        timeout: 45000,
      });
    } catch {
      /* optional */
    }
    await page.waitForTimeout(1200);
    push(
      (await page.locator("[data-gf-confidence-badge]").count()) > 0 ||
        (await page.getByText(/Confiança|deterministic|Análise/i).count()) > 0,
      "copilot response UI",
    );
    await shot(page, "copiloto-respondendo-deterministic");
    const evidBtn = page.getByRole("button", { name: /evidên/i });
    if (await evidBtn.count()) {
      await evidBtn.first().click();
      await page.waitForTimeout(700);
      await shot(page, "evidencias-drawer");
    }
  }

  for (const vp of [
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(vp);
    await setTheme(page, "dark");
    await page.waitForTimeout(400);
    await shot(page, `copiloto-dark-${vp.name}`);
  }

  await page.setViewportSize({ width: 1440, height: 900 });

  for (const [route, name, sels] of [
    ["inteligencia/historico", "historico", ["[data-intelligence-history-page]"]],
    ["inteligencia/auditoria", "auditoria", ["[data-intelligence-audit-page]"]],
    ["inteligencia/configuracoes", "configuracoes", ["[data-intelligence-config-page]"]],
  ]) {
    await gotoReady(page, route, sels);
    await setTheme(page, "dark");
    await shot(page, `${name}-dark`);
    await setTheme(page, "light");
    await shot(page, `${name}-light`);
  }

  for (const [route, name, sels] of [
    ["dashboard", "dashboard", ["[data-gf-kpi-cockpit]"]],
    ["financeiro", "financeiro", ["h1"]],
    ["crm", "crm", ["h1"]],
  ]) {
    await gotoReady(page, route, sels);
    await setTheme(page, "dark");
    await shot(page, `regressao-${name}-dark`);
  }

  const fails = report.checks.filter((c) => !c.ok).length;
  report.summary = {
    pass: report.checks.filter((c) => c.ok).length,
    fail: fails,
    shots: report.shots.length,
    consoleErrors: report.consoleErrors.length,
  };
  writeFileSync(
    resolve(OUT, "capture-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("\nCapture summary", report.summary);
  if (fails > 0) process.exitCode = 1;
} catch (err) {
  console.error(err);
  writeFileSync(
    resolve(OUT, "capture-report.json"),
    JSON.stringify({ ...report, fatal: String(err) }, null, 2),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
