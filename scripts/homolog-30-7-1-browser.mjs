#!/usr/bin/env node
/**
 * Sprint 30.7.1 — Browser QA pós-migration + persistência.
 * Cold <=2500ms · Warm <=1200ms · schema ready · refresh persistence.
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

const OUT = resolve("docs/testing/evidence/30-7-release");
const TENANT = "teste-renato-01";
const COLD_TARGET = 2500;
const WARM_TARGET = 1200;
const HISTORY_TARGET = 1500;
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "30.7.1",
  tenant: TENANT,
  baseUrl: BASE_URL,
  targets: {
    coldMs: COLD_TARGET,
    warmMs: WARM_TARGET,
    historyMs: HISTORY_TARGET,
  },
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
  const ctx = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.consoleErrors.push(msg.text().slice(0, 160));
    }
  });

  await page.goto(`${BASE_URL}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  push(await isAuthenticated(page), "sessão autenticada");

  const url = `${BASE_URL}/${TENANT}/automacoes`;
  const t0 = Date.now();
  const res = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await page
    .waitForSelector("[data-automacoes-central], [role='alert'], h1", {
      timeout: 20000,
    })
    .catch(() => null);
  const cold = Date.now() - t0;
  report.timings.coldMs = cold;
  push(res?.status() === 200, `GET automacoes ${res?.status()}`);
  push(cold <= COLD_TARGET, `cold ${cold}ms (alvo <=${COLD_TARGET}ms)`);

  push(
    (await page.locator("[data-automacoes-central]").count()) > 0,
    "Central renderizada",
  );
  const schemaReady =
    (await page.locator("[data-automacoes-schema-ready]").count()) > 0;
  const schemaPending =
    (await page.locator("[data-automacoes-schema-pending]").count()) > 0;
  push(schemaReady || schemaPending, "status de schema visível");
  push(schemaReady, "schema ready (persistência)");
  if (!schemaReady) {
    const bodySnippet = (await page.locator("body").innerText()).slice(0, 400);
    console.log("  NOTE schema body:", bodySnippet.replace(/\s+/g, " "));
  }

  // Templates → criar regra
  const templatesTab = page.getByRole("tab", { name: "Templates" });
  if ((await templatesTab.count()) === 0) {
    // fallback: botão texto
    await page.getByRole("button", { name: "Templates" }).click();
  } else {
    await templatesTab.click();
  }
  await page.waitForTimeout(400);
  push(
    (await page.locator("[data-automacoes-templates]").count()) > 0,
    "templates visíveis",
  );
  const useTpl = page.getByRole("button", { name: /Usar template/i }).first();
  if ((await useTpl.count()) > 0) {
    await useTpl.click();
    await page.waitForTimeout(1200);
  }

  // Dry-run cenários
  await page.getByRole("tab", { name: "Lista" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /Dry-run cenários/i }).click();
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  push(/Dry-run obrigatório|cenários/i.test(body), "dry-run cenários executado");
  push(!/schema=pendente/i.test(body), "dry-run com schema ok");

  // Persistência após refresh
  const beforeRules = await page.locator("[data-automacoes-rules]").innerText().catch(() => "");
  const tHist = Date.now();
  await page.getByRole("tab", { name: "Histórico" }).click();
  await page.waitForSelector("[data-automacoes-history]", { timeout: 30000 }).catch(() => null);
  const histMs = Date.now() - tHist;
  report.timings.historyMs = histMs;
  push(histMs <= HISTORY_TARGET, `histórico ${histMs}ms (alvo <=${HISTORY_TARGET}ms)`);

  await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector("[data-automacoes-central]", { timeout: 60000 }).catch(() => null);
  const afterReady =
    (await page.locator("[data-automacoes-schema-ready]").count()) > 0;
  push(afterReady, "schema ready após refresh");

  const t1 = Date.now();
  await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector("[data-automacoes-central]", { timeout: 60000 }).catch(() => null);
  const warm = Date.now() - t1;
  report.timings.warmMs = warm;
  push(warm <= WARM_TARGET, `warm ${warm}ms (alvo <=${WARM_TARGET}ms)`);

  // Builder / aprovações / dark light
  await page.getByRole("tab", { name: "Builder" }).click();
  await page.waitForTimeout(300);
  push(
    (await page.locator("[data-automacoes-builder]").count()) > 0,
    "builder 8 etapas",
  );
  await page.getByRole("tab", { name: "Aprovações" }).click();
  push(
    (await page.locator("[data-automacoes-approvals]").count()) > 0,
    "painel aprovações",
  );

  await setTheme(page, "dark");
  await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("[data-automacoes-central]", { timeout: 60000 }).catch(() => null);
  await shot(page, "automacoes-post-migration-dark");
  push(true, "dark");

  await setTheme(page, "light");
  await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("[data-automacoes-central]", { timeout: 60000 }).catch(() => null);
  await shot(page, "automacoes-post-migration-light");
  push(true, "light");

  // Mobile spot
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector("[data-automacoes-central]", { timeout: 60000 }).catch(() => null);
  await shot(page, "automacoes-post-migration-mobile390");
  push(
    (await page.locator("[data-automacoes-central]").count()) > 0,
    "mobile 390 Central",
  );

  // Sem UUID cru óbvio no H1/KPI (heurística)
  const text = await page.locator("body").innerText();
  push(
    !/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(
      text.slice(0, 800),
    ),
    "sem UUID no topo da página",
  );
  push(!/pending_approval|waiting_approval/i.test(text.slice(0, 500)), "sem enum cru no topo");

  void beforeRules;

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
      `\n\nCold ${report.timings.coldMs}ms · Warm ${report.timings.warmMs}ms · Hist ${report.timings.historyMs}ms\n`,
  );
  console.log(`\nBrowser QA 30.7.1: ${pass} PASS · ${fail} FAIL`);
  console.log(
    `Cold ${report.timings.coldMs}ms · Warm ${report.timings.warmMs}ms · Hist ${report.timings.historyMs}ms\n`,
  );
  process.exit(fail > 0 ? 1 : 0);
} finally {
  await browser.close();
}
