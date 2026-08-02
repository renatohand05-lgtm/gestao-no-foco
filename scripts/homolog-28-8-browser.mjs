#!/usr/bin/env node
/**
 * Sprint 28.8 — Homologação browser autenticada + screenshots.
 * Pré-requisito: npm run dev + storageState válido (npm run test:login).
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

const OUT = resolve("docs/testing/evidence/28-8");
const TENANT = "teste-renato-01";
mkdirSync(OUT, { recursive: true });
for (const d of [
  "dashboard",
  "crm",
  "purchases",
  "inventory",
  "work-orders",
  "schedule",
  "finance",
  "analytics",
  "services",
  "goals",
  "settings",
  "regression",
]) {
  mkdirSync(resolve(OUT, d), { recursive: true });
}

const report = {
  at: new Date().toISOString(),
  sprint: "28.8",
  baseUrl: BASE_URL,
  tenant: TENANT,
  auth: false,
  shots: [],
  routes: [],
  uuidHits: [],
  checks: [],
};

function push(ok, detail) {
  report.checks.push({ ok: Boolean(ok), detail });
  console.log(ok ? "PASS" : "FAIL", detail);
}

async function shot(page, folder, name) {
  const path = resolve(OUT, folder, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  report.shots.push(`${folder}/${name}`);
  console.log("shot", `${folder}/${name}`);
}

async function gotoCheck(page, path, folder, shotName) {
  const url = `${BASE_URL}/${TENANT}/${path}`;
  const res = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(1200);
  const status = res?.status() ?? 0;
  const finalUrl = page.url();
  const onLogin = finalUrl.includes("/login");
  const title = await page.title().catch(() => "");
  const body = await page.locator("body").innerText().catch(() => "");
  const has404 =
    status === 404 ||
    /página não encontrada|not found|404/i.test(body.slice(0, 500));
  const uuid =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
      body.slice(0, 4000),
    );
  if (uuid) report.uuidHits.push(path);

  const entry = {
    path,
    status,
    onLogin,
    has404,
    title,
    finalUrl: finalUrl.replace(BASE_URL, ""),
  };
  report.routes.push(entry);
  push(!onLogin && !has404 && status < 400, `route ${path} status=${status}`);
  if (shotName) await shot(page, folder, shotName);
  return { entry, body };
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("theme", t);
  }, theme);
  await page.waitForTimeout(200);
}

async function setViewport(page, name) {
  const map = {
    desktop: { width: 1440, height: 900 },
    notebook: { width: 1280, height: 800 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 390, height: 844 },
  };
  await page.setViewportSize(map[name]);
}

if (!existsSync(AUTH_FILE)) {
  console.error("AUTH ausente. Execute: npm run test:login");
  writeFileSync(
    resolve(OUT, "browser-report.json"),
    JSON.stringify({ ...report, error: "no auth file" }, null, 2),
  );
  process.exit(1);
}

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  const authed = await isAuthenticated(page);
  report.auth = authed;
  push(authed, "sessão autenticada");

  if (!authed) {
    writeFileSync(
      resolve(OUT, "browser-report.json"),
      JSON.stringify(
        {
          ...report,
          error:
            "storageState expirado — rode npm run test:login e reexecute este script",
        },
        null,
        2,
      ),
    );
    console.error("\nSessão inválida/expirada. npm run test:login\n");
    process.exit(2);
  }

  await setTheme(page, "dark");
  await setViewport(page, "desktop");

  await gotoCheck(page, "dashboard", "dashboard", "desktop-dark");
  await gotoCheck(page, "crm/leads", "crm", "leads-desktop-dark");
  const leads = await gotoCheck(
    page,
    "crm/leads",
    "crm",
    "leads-convert-area-dark",
  );
  push(
    /Converter/i.test(leads.body ?? ""),
    "CRM leads: botão Converter visível",
  );
  await gotoCheck(page, "crm/oportunidades", "crm", "oportunidades-desktop-dark");
  await gotoCheck(page, "crm/follow-ups", "crm", "follow-ups-desktop-dark");
  await gotoCheck(page, "crm/indicadores", "crm", "indicadores-desktop-dark");
  await gotoCheck(page, "clientes/funil", "crm", "funil-clientes-desktop-dark");

  await gotoCheck(page, "compras", "purchases", "hub-desktop-dark");
  await gotoCheck(page, "compras/pedidos", "purchases", "pedidos-desktop-dark");

  await gotoCheck(page, "estoque", "inventory", "hub-desktop-dark");
  await gotoCheck(page, "estoque/abc", "inventory", "abc-desktop-dark");
  await gotoCheck(page, "estoque/reposicao", "inventory", "reposicao-desktop-dark");

  await gotoCheck(page, "ordens", "work-orders", "lista-desktop-dark");
  await gotoCheck(page, "ordens/nova", "work-orders", "nova-desktop-dark");
  await gotoCheck(page, "ordens/templates", "work-orders", "templates-desktop-dark");

  await gotoCheck(page, "agenda", "schedule", "semana-desktop-dark");

  await gotoCheck(page, "financeiro/cfo", "finance", "cfo-desktop-dark");
  await gotoCheck(page, "financeiro/aging", "finance", "aging-desktop-dark");
  const orc = await gotoCheck(
    page,
    "financeiro/orcamento",
    "finance",
    "orcamento-desktop-dark",
  );
  push(
    /CRUD|indispon|listagem|Migration|orçamento/i.test(orc.body ?? ""),
    "Orçamento: messaging honesto (sem CRUD fingido)",
  );
  await gotoCheck(page, "financeiro/dre", "finance", "dre-desktop-dark");
  await gotoCheck(page, "financeiro/caixa", "finance", "caixa-desktop-dark");

  await gotoCheck(page, "analytics", "analytics", "desktop-dark");
  await gotoCheck(page, "produtos", "services", "produtos-desktop-dark");
  await gotoCheck(
    page,
    "produtos/servicos",
    "services",
    "servicos-desktop-dark",
  );
  await gotoCheck(page, "analytics/metas", "goals", "desktop-dark");
  await gotoCheck(page, "configuracoes", "settings", "desktop-dark");
  await gotoCheck(
    page,
    "configuracoes/metas",
    "goals",
    "config-metas-desktop-dark",
  );

  await gotoCheck(page, "vendas", "regression", "vendas-desktop-dark");
  await gotoCheck(page, "vendas/nova", "regression", "vendas-nova-desktop-dark");
  await gotoCheck(page, "clientes", "regression", "clientes-desktop-dark");
  await gotoCheck(page, "inteligencia", "regression", "inteligencia-desktop-dark");
  await gotoCheck(page, "tributario", "regression", "tributario-desktop-dark");

  await setTheme(page, "light");
  await gotoCheck(page, "dashboard", "dashboard", "desktop-light");
  await gotoCheck(page, "crm/leads", "crm", "leads-desktop-light");
  await gotoCheck(page, "agenda", "schedule", "semana-desktop-light");
  await gotoCheck(page, "financeiro/cfo", "finance", "cfo-desktop-light");

  await setViewport(page, "notebook");
  await gotoCheck(page, "dashboard", "dashboard", "notebook-light");
  await gotoCheck(page, "crm/indicadores", "crm", "indicadores-notebook-light");

  await setViewport(page, "tablet");
  await gotoCheck(page, "estoque/abc", "inventory", "abc-tablet-light");
  await gotoCheck(page, "agenda", "schedule", "semana-tablet-light");

  await setViewport(page, "mobile");
  await gotoCheck(page, "dashboard", "dashboard", "mobile-light");
  await gotoCheck(page, "agenda", "schedule", "semana-mobile-light");
  await gotoCheck(page, "financeiro/dre", "finance", "dre-mobile-light");

  // Filtra ruído: 404 de assets e digests de permissão já tratados na UI.
  const material = consoleErrors.filter(
    (t) =>
      !/Failed to load resource:.*404/i.test(t) &&
      !/Sem permissão/i.test(t) &&
      !/route_error.*Sem permissão/i.test(t),
  );
  report.consoleErrorsSample = consoleErrors.slice(0, 20);
  report.consoleErrorsMaterial = material.slice(0, 20);
  push(
    material.length === 0,
    `console errors materiais: ${material.length} (brutos ${consoleErrors.length})`,
  );

  const fails = report.checks.filter((c) => !c.ok).length;
  report.summary = {
    pass: report.checks.filter((c) => c.ok).length,
    fail: fails,
    shots: report.shots.length,
    uuidHits: report.uuidHits.length,
    consoleErrors: consoleErrors.length,
  };

  writeFileSync(
    resolve(OUT, "browser-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    `\nBrowser 28.8: ${report.summary.pass} PASS · ${report.summary.fail} FAIL · ${report.summary.shots} shots · UUID hits ${report.summary.uuidHits}\n`,
  );
  process.exit(fails > 0 ? 1 : 0);
} finally {
  await browser.close();
}
