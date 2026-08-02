#!/usr/bin/env node
/**
 * Sprint 28.9 — Homologação browser autenticada + screenshots.
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

const OUT = resolve("docs/testing/evidence/28-9");
const TENANT = "teste-renato-01";
mkdirSync(OUT, { recursive: true });
for (const d of [
  "budget",
  "schedule",
  "crm",
  "sales",
  "finance",
  "dashboard",
  "regression",
]) {
  mkdirSync(resolve(OUT, d), { recursive: true });
}

const report = {
  at: new Date().toISOString(),
  sprint: "28.9",
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
}

async function gotoCheck(page, path, folder, shotName) {
  const url = `${BASE_URL}/${TENANT}/${path}`;
  const res = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(1000);
  const status = res?.status() ?? 0;
  const finalUrl = page.url();
  const onLogin = finalUrl.includes("/login");
  const body = await page.locator("body").innerText().catch(() => "");
  const has404 =
    status === 404 ||
    /página não encontrada|not found|404/i.test(body.slice(0, 500));
  const uuid =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
      body.slice(0, 4000),
    );
  if (uuid) report.uuidHits.push(path);
  report.routes.push({ path, status, onLogin, has404 });
  push(!onLogin && !has404 && status < 400, `route ${path} status=${status}`);
  if (shotName) await shot(page, folder, shotName);
  return { body, status };
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("theme", t);
  }, theme);
  await page.waitForTimeout(150);
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
  console.error("AUTH ausente. npm run test:login");
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
  const authed = await isAuthenticated(page);
  report.auth = authed;
  push(authed, "sessão autenticada");
  if (!authed) process.exit(2);

  await setTheme(page, "dark");
  await setViewport(page, "desktop");

  await gotoCheck(page, "dashboard", "dashboard", "desktop-dark");
  await gotoCheck(
    page,
    "financeiro/orcamento",
    "budget",
    "lista-desktop-dark",
  );
  const novo = await gotoCheck(
    page,
    "financeiro/orcamento/novo",
    "budget",
    "criar-desktop-dark",
  );
  push(/Criar orçamento|Nome/i.test(novo.body ?? ""), "form criar orçamento");

  await gotoCheck(page, "agenda", "schedule", "semana-desktop-dark");
  await gotoCheck(page, "agenda?view=dia", "schedule", "dia-desktop-dark");
  await gotoCheck(page, "agenda?view=mes", "schedule", "mes-desktop-dark");
  await gotoCheck(page, "agenda?view=lista", "schedule", "lista-desktop-dark");
  const agendaBody = await gotoCheck(
    page,
    "agenda",
    "schedule",
    "create-form-dark",
  );
  push(/Novo evento|Criar evento/i.test(agendaBody.body ?? ""), "agenda CRUD form");

  await gotoCheck(page, "crm/oportunidades", "crm", "opp-desktop-dark");
  await gotoCheck(page, "crm/leads", "crm", "leads-desktop-dark");
  await gotoCheck(page, "vendas?status=orcamento", "sales", "orcamentos-dark");
  await gotoCheck(page, "financeiro/dre", "finance", "dre-desktop-dark");
  await gotoCheck(page, "financeiro/cfo", "finance", "cfo-desktop-dark");
  await gotoCheck(page, "compras", "regression", "compras-dark");
  await gotoCheck(page, "estoque", "regression", "estoque-dark");
  await gotoCheck(page, "analytics", "regression", "analytics-dark");
  await gotoCheck(page, "analytics/metas", "regression", "metas-dark");

  await setTheme(page, "light");
  await gotoCheck(page, "financeiro/orcamento", "budget", "lista-desktop-light");
  await gotoCheck(page, "agenda", "schedule", "semana-desktop-light");

  await setViewport(page, "notebook");
  await gotoCheck(page, "agenda", "schedule", "semana-notebook-light");
  await setViewport(page, "tablet");
  await gotoCheck(page, "financeiro/orcamento", "budget", "lista-tablet-light");
  await setViewport(page, "mobile");
  await gotoCheck(page, "agenda", "schedule", "semana-mobile-light");
  await gotoCheck(
    page,
    "financeiro/orcamento/novo",
    "budget",
    "criar-mobile-light",
  );

  const fails = report.checks.filter((c) => !c.ok).length;
  report.summary = {
    pass: report.checks.filter((c) => c.ok).length,
    fail: fails,
    shots: report.shots.length,
    uuidHits: report.uuidHits.length,
  };
  writeFileSync(resolve(OUT, "browser-report.json"), JSON.stringify(report, null, 2));
  console.log(
    `\nBrowser 28.9: ${report.summary.pass} PASS · ${report.summary.fail} FAIL · ${report.summary.shots} shots\n`,
  );
  process.exit(fails > 0 ? 1 : 0);
} finally {
  await browser.close();
}
