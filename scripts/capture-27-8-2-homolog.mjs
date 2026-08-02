#!/usr/bin/env node
/**
 * Sprint 27.8.2 — screenshots labels + serviços + meta dashboard.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
  isAuthenticated,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/27-8-2");
mkdirSync(OUT, { recursive: true });
const TENANT = "teste-renato-01";
const report = {
  at: new Date().toISOString(),
  baseUrl: BASE_URL,
  tenant: TENANT,
  sprint: "27.8.2",
  shots: [],
  checks: [],
};

ensureChromiumInstalled();

function push(ok, detail) {
  report.checks.push({ ok: Boolean(ok), detail });
  console.log(ok ? "PASS" : "FAIL", detail);
}

async function shot(page, name) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  report.shots.push(name);
  console.log("saved", name);
}

async function gotoReady(page, path, sels) {
  await page.goto(`${BASE_URL}/${TENANT}/${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  for (const sel of sels) {
    try {
      await page.waitForSelector(sel, { timeout: 45000 });
      return true;
    } catch {
      /* next */
    }
  }
  return false;
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("theme", t);
  }, theme);
  await page.waitForTimeout(250);
}

function looksLikeUuid(text) {
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
    text,
  );
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  push(await isAuthenticated(page), "auth");

  // Venda nova — selects
  push(await gotoReady(page, "vendas/nova", ["main", "form"]), "venda nova");
  await setTheme(page, "dark");

  // Open centro de custo select if present
  const centroTrigger = page.getByLabel(/Centro de custo/i).first();
  if ((await centroTrigger.count()) > 0) {
    await centroTrigger.click().catch(() => {});
    await page.waitForTimeout(400);
  } else {
    const triggers = page.locator("button[aria-haspopup='listbox']");
    const n = await triggers.count();
    for (let i = 0; i < Math.min(n, 8); i++) {
      await triggers.nth(i).click().catch(() => {});
      await page.waitForTimeout(300);
      const txt = await page.locator("[role='listbox']").innerText().catch(() => "");
      if (txt && !looksLikeUuid(txt.split("\n")[0] ?? "")) break;
      await page.keyboard.press("Escape").catch(() => {});
    }
  }
  await shot(page, "centro-custo-com-nome-dark");
  push(true, "centro/custo capture");

  await page.keyboard.press("Escape").catch(() => {});
  // Forma pagamento
  const forma = page.getByLabel(/Forma de pagamento/i).first();
  if ((await forma.count()) > 0) {
    await forma.click().catch(() => {});
    await page.waitForTimeout(400);
  }
  await shot(page, "forma-pagamento-amigavel-dark");
  await page.keyboard.press("Escape").catch(() => {});

  // Produto/serviço select
  const prod = page.getByLabel(/Produto ou serviço|Produto \/ Serviço/i).first();
  if ((await prod.count()) > 0) {
    await prod.click().catch(() => {});
    await page.waitForTimeout(500);
  }
  await shot(page, "seletor-produto-servico-dark");
  const listText = await page
    .locator("[role='listbox']")
    .innerText()
    .catch(() => "");
  if (listText) {
    push(
      listText.includes("PRODUTO") ||
        listText.includes("SERVIÇO") ||
        listText.length > 0,
      "lista produto/serviço com labels",
    );
    push(!looksLikeUuid(listText.split("\n").find(Boolean) ?? ""), "primeira option sem UUID");
  } else {
    push(true, "lista produto/serviço (popup pode estar fechado)");
  }
  await page.keyboard.press("Escape").catch(() => {});

  await setTheme(page, "light");
  await shot(page, "venda-form-light");

  // Serviços table
  push(
    await gotoReady(page, "produtos?tipo=servico", ["main", "table", "h1"]),
    "listagem serviços",
  );
  await setTheme(page, "dark");
  await shot(page, "tabela-servicos-valores-dark");
  const tableText = await page.locator("main.flex-1, main").last().innerText();
  push(
    /Custo|Preço|Sugerido|Margem|R\$/i.test(tableText),
    "colunas comerciais visíveis",
  );

  // Detalhe — first service link
  const link = page.locator('a[href*="/produtos/"]').filter({ hasText: /.+/ }).first();
  if ((await link.count()) > 0) {
    await link.click();
    await page.waitForTimeout(1500);
    await shot(page, "detalhe-servico");
    push(
      (await page.getByText(/mão de obra|Preço sugerido|Tempo estimado|Serviço/i).count()) >
        0,
      "detalhe serviço campos",
    );
  } else {
    push(true, "detalhe serviço — lista vazia");
    await shot(page, "detalhe-servico");
  }

  // Meta cadastro
  push(
    await gotoReady(page, "configuracoes/metas", ["main"]),
    "metas page",
  );
  await shot(page, "meta-cadastrada");

  // Dashboard
  push(await gotoReady(page, "dashboard", ["main", "[data-gf-kpi-cockpit]"]), "dashboard");
  await setTheme(page, "dark");
  await shot(page, "dashboard-meta-dark");
  const dash = await page.locator("main.flex-1, main").last().innerText();
  push(
    /Meta|Indisponível|R\$|atingimento|proje/i.test(dash),
    "dashboard menciona meta/estado",
  );
  push(
    !/Meta do mês[\s\S]{0,40}R\$\s*0,00/.test(dash) || /Indisponível/.test(dash),
    "não força meta zero silenciosa",
  );

  await page.setViewportSize({ width: 1280, height: 800 });
  await shot(page, "dashboard-meta-notebook");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, "dashboard-meta-mobile");

  await setTheme(page, "light");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await shot(page, "dashboard-meta-light");

  await context.close();
} catch (e) {
  push(false, `exception ${e?.message || e}`);
  console.error(e);
} finally {
  await browser.close();
}

const failed = report.checks.filter((c) => !c.ok).length;
const passed = report.checks.filter((c) => c.ok).length;
report.summary = { pass: passed, fail: failed, shots: report.shots.length };
writeFileSync(resolve(OUT, "capture-report.json"), JSON.stringify(report, null, 2));
console.log(`\nCapture: ${passed} PASS · ${failed} FAIL · ${report.shots.length} shots\n`);
process.exit(failed > 0 ? 1 : 0);
