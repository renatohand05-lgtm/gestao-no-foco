/**
 * Fase 26.8–26.10 — captura browser (hub tributário).
 * Sem SQL/commit/deploy.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/26-8-10");
mkdirSync(OUT, { recursive: true });
const TENANT = "teste-renato-01";
const report = {
  at: new Date().toISOString(),
  sprint: "26.8-10",
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

async function shot(page, name) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  report.shots.push(name);
  console.log("saved", name);
}

async function gotoReady(page, path, sel) {
  await page.goto(`${BASE_URL}/${TENANT}/${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  try {
    await page.waitForSelector(sel, { timeout: 60000 });
    return true;
  } catch {
    return false;
  }
}

try {
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text());
  });
  await page.setViewportSize({ width: 1440, height: 900 });

  const routes = [
    ["tributario", "[data-tributario-hub]", "hub"],
    ["tributario/regras", "[data-tax-rules-page]", "regras"],
    ["tributario/regras/nova", "[data-tax-rule-create-page]", "editor"],
    ["tributario/versoes", "[data-tax-versions-page]", "versoes"],
    ["tributario/obrigacoes", "[data-tax-obligations-page]", "obrigacoes"],
    ["tributario/auditoria", "[data-tax-audit-page]", "auditoria"],
    ["tributario/configuracoes", "[data-tax-config-page]", "configuracoes"],
    ["tributario/simulador", "[data-tax-simulator-page]", "simulador"],
    ["tributario/simulador/comparar", "[data-tax-regime-compare-page]", "comparacao"],
    ["tributario/executivo", "[data-tax-executive-page]", "cockpit"],
  ];

  for (const [path, sel, name] of routes) {
    push(await gotoReady(page, path, sel), `${name} page`);
    await shot(page, name);
  }

  // Persistência: aceita pending (migration não aplicada) ou ready (já aplicada)
  await gotoReady(page, "tributario", "[data-tributario-hub]");
  const readyAttr = await page
    .locator("[data-tax-persistence-ready]")
    .first()
    .getAttribute("data-tax-persistence-ready");
  push(
    readyAttr === "0" || readyAttr === "1",
    `hub persistence status explícito (ready=${readyAttr})`,
  );
  if (readyAttr === "0") {
    push(
      (await page.locator("[data-migration-pending]").count()) > 0,
      "hub shows migration pending",
    );
  } else {
    push(
      (await page.getByText(/Schema tributário Enterprise pronto|pronto/i).count()) >
        0,
      "hub shows schema ready",
    );
  }
  await shot(page, "hub-persistence-status");

  for (const [w, h, name] of [
    [1440, 900, "desktop"],
    [1280, 800, "notebook"],
    [834, 1112, "tablet"],
    [390, 844, "mobile"],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(300);
    await shot(page, `viewport-${name}`);
  }

  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
  });
  await shot(page, "theme-dark");
  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
  });
  await shot(page, "theme-light");

  const fails = report.checks.filter((c) => !c.ok).length;
  report.summary = {
    pass: report.checks.filter((c) => c.ok).length,
    fail: fails,
    shots: report.shots.length,
  };
  writeFileSync(resolve(OUT, "capture-report.json"), JSON.stringify(report, null, 2));
  console.log("\nCapture", report.summary);
  if (fails > 0) process.exitCode = 1;
} catch (e) {
  console.error(e);
  writeFileSync(
    resolve(OUT, "capture-report.json"),
    JSON.stringify({ ...report, fatal: String(e) }, null, 2),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
