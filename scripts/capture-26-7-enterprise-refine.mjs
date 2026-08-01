/**
 * Sprint 26.3–26.7 — Captura visual enterprise refine (identidade preservada).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/26-7");
mkdirSync(OUT, { recursive: true });
mkdirSync(resolve("docs/testing/evidence/26-3"), { recursive: true });
mkdirSync(resolve("docs/testing/evidence/26-4"), { recursive: true });
mkdirSync(resolve("docs/testing/evidence/26-5"), { recursive: true });
mkdirSync(resolve("docs/testing/evidence/26-6"), { recursive: true });

const TENANT = "teste-renato-01";
const report = {
  at: new Date().toISOString(),
  baseUrl: BASE_URL,
  tenant: TENANT,
  sprint: "26.3-26.7",
  shots: [],
  checks: [],
  consoleErrors: [],
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
  await page.waitForTimeout(300);
}

try {
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text());
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/${TENANT}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await Promise.race([
    page.waitForSelector("[data-gf-kpi-cockpit]", { timeout: 180000 }),
    page.waitForSelector("text=/Cockpit Executivo/i", { timeout: 180000 }),
  ]);
  await page.waitForTimeout(1200);

  push((await page.locator("[data-gf-kpi-cockpit]").count()) > 0, "kpi structure");
  push((await page.locator("[data-gf-executive-header]").count()) > 0, "header structure");

  for (const theme of ["dark", "light"]) {
    await setTheme(page, theme);
    await shot(page, `dashboard-${theme}-desktop`);
  }

  for (const vp of [
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(vp);
    await setTheme(page, "dark");
    await page.waitForTimeout(400);
    await shot(page, `dashboard-dark-${vp.name}`);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  const atalhos = page.locator("#premium-trigger-atalhos");
  if (await atalhos.count()) {
    await atalhos.click();
    await page.waitForTimeout(600);
    push(
      (await page.locator("[data-launcher-shortcuts]").count()) > 0,
      "launcher shortcuts",
    );
    await shot(page, "launcher-atalhos", false);
  }

  const modules = [
    ["analytics/executivo", "analytics"],
    ["crm", "crm"],
    ["financeiro", "financeiro"],
    ["estoque", "estoque"],
    ["vendas", "vendas"],
    ["compras", "compras"],
    ["clientes", "clientes"],
    ["ordens", "ordens"],
    ["configuracoes", "configuracoes"],
  ];

  for (const [route, name] of modules) {
    await page.goto(`${BASE_URL}/${TENANT}/${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForLoadState("domcontentloaded").catch(() => null);
    await page.waitForTimeout(2000);
    try {
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
      });
      await page.waitForTimeout(400);
      await shot(page, `${name}-dark`);
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
      });
      await page.waitForTimeout(400);
      await shot(page, `${name}-light`);
    } catch (e) {
      push(false, `${name} capture: ${String(e).slice(0, 120)}`);
      await shot(page, `${name}-error`);
    }
  }

  // overflow check
  await page.goto(`${BASE_URL}/${TENANT}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector("[data-gf-kpi-cockpit]", { timeout: 180000 });
  for (const vp of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 2,
    );
    push(!overflow, `no overflow @ ${vp.name}`);
  }

  await context.close();
} catch (err) {
  report.fatal = String(err);
  console.error(err);
} finally {
  await browser.close();
  writeFileSync(resolve(OUT, "capture-report.json"), JSON.stringify(report, null, 2));
  // mirror key report pointer
  writeFileSync(
    resolve("docs/testing/evidence/26-3/README.md"),
    "# Sprint 26.3\n\nEvidências consolidadas em `../26-7/`.\n",
  );
  writeFileSync(
    resolve("docs/testing/evidence/26-4/README.md"),
    "# Sprint 26.4\n\nEvidências consolidadas em `../26-7/`.\n",
  );
  writeFileSync(
    resolve("docs/testing/evidence/26-5/README.md"),
    "# Sprint 26.5\n\nEvidências consolidadas em `../26-7/`.\n",
  );
  writeFileSync(
    resolve("docs/testing/evidence/26-6/README.md"),
    "# Sprint 26.6\n\nEvidências consolidadas em `../26-7/`.\n",
  );
  console.log(
    "Shots",
    report.shots.length,
    "FAIL",
    report.checks.filter((c) => !c.ok).length,
  );
}
