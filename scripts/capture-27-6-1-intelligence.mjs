/**
 * Sprint 27.6.1 — Etapa A (antes da migration): captura browser deterministic + schema pending.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/27-6-1");
mkdirSync(OUT, { recursive: true });
const TENANT = "teste-renato-01";
const report = {
  at: new Date().toISOString(),
  baseUrl: BASE_URL,
  tenant: TENANT,
  sprint: "27.6.1",
  stage: "A_BEFORE_MIGRATION",
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

async function gotoReady(page, path, selectors) {
  await page.goto(`${BASE_URL}/${TENANT}/${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  for (const sel of selectors) {
    try {
      await page.waitForSelector(sel, { timeout: 60000 });
      if ((await page.locator(sel).count()) > 0) return true;
    } catch {
      /* next */
    }
  }
  await page.waitForTimeout(800);
  return false;
}

try {
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text());
  });
  await page.setViewportSize({ width: 1440, height: 900 });

  await gotoReady(page, "dashboard", ["[data-gf-kpi-cockpit]"]);

  // Config — provider OFF + persistence pending
  push(
    await gotoReady(page, "inteligencia/configuracoes", [
      "[data-intelligence-config-page]",
    ]),
    "config page",
  );
  push(
    (await page.locator('[data-persistence-status][data-ready="0"]').count()) >
      0 ||
      (await page.locator("[data-persistence-pending]").count()) > 0 ||
      (await page.getByText(/MIGRATION PENDENTE|Persistência|migration/i).count()) >
        0,
    "schema pending visible",
  );
  push(
    (await page.getByText(/Provider externo|external: OFF|unavailable/i).count()) >
      0,
    "provider OFF visible",
  );
  await shot(page, "config-provider-off-schema-pending");

  // Histórico pending
  push(
    await gotoReady(page, "inteligencia/historico", [
      "[data-intelligence-history-page]",
    ]),
    "historico page",
  );
  push(
    (await page.locator("[data-persistence-pending]").count()) > 0 ||
      (await page.getByText(/migration|pendente|indisponível/i).count()) > 0,
    "historico pending",
  );
  await shot(page, "historico-pending");

  // Auditoria pending
  push(
    await gotoReady(page, "inteligencia/auditoria", [
      "[data-intelligence-audit-page]",
    ]),
    "auditoria page",
  );
  await shot(page, "auditoria-pending");

  // Copiloto deterministic + live ask
  push(
    await gotoReady(page, "inteligencia/copiloto", [
      "[data-gf-executive-copilot]",
    ]),
    "copilot mounted",
  );
  await shot(page, "copiloto-deterministic-vazio");

  const input = page.locator("[data-gf-intelligence-input]");
  if (await input.count()) {
    await input.fill("Como está meu caixa?");
    await page.getByRole("button", { name: /Perguntar/i }).click();
    await page.waitForTimeout(8000);
    push(
      (await page.getByText(/deterministic|Determinístico|Confiança/i).count()) >
        0,
      "copilot response deterministic",
    );
    await shot(page, "copiloto-caixa-live");

    // Evidence
    const evid = page.locator("[data-gf-evidence-drawer]");
    if (await evid.count()) {
      await evid.first().click().catch(() => null);
      await page.waitForTimeout(500);
      await shot(page, "evidencias-live");
    }

    // Other questions
    for (const [q, name] of [
      ["Quanto vendemos este mês?", "copiloto-vendas"],
      ["Quais produtos estão abaixo do mínimo?", "copiloto-estoque"],
      ["Quantas OS estão atrasadas?", "copiloto-os"],
    ]) {
      await input.fill(q);
      await page.getByRole("button", { name: /Perguntar/i }).click();
      await page.waitForTimeout(6000);
      await shot(page, name);
    }
  }

  const fails = report.checks.filter((c) => !c.ok).length;
  report.summary = {
    pass: report.checks.filter((c) => c.ok).length,
    fail: fails,
    shots: report.shots.length,
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
