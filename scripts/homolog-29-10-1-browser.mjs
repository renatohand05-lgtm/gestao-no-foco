#!/usr/bin/env node
/**
 * Sprint 29.10.1 — Browser smoke pós-migration CRM + Compras.
 * Pré-requisito: npm run dev (ou next start) + auth storageState.
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

const OUT = resolve("docs/testing/evidence/29-10-1");
const TENANT = "teste-renato-01";
mkdirSync(OUT, { recursive: true });
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "29.10.1",
  baseUrl: BASE_URL,
  tenant: TENANT,
  auth: false,
  checks: [],
  consoleErrors: [],
  httpIssues: [],
  uuidHits: [],
  shots: [],
};

function push(ok, detail) {
  report.checks.push({ ok: Boolean(ok), detail });
  console.log(ok ? "  PASS" : "  FAIL", detail);
}

async function shot(page, name) {
  const rel = `screenshots/${name}.png`;
  await page.screenshot({ path: resolve(OUT, rel), fullPage: false });
  report.shots.push(rel);
}

async function visit(page, path, name) {
  const url = `${BASE_URL}/${TENANT}${path.startsWith("/") ? path : `/${path}`}`;
  const consoleBuf = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") consoleBuf.push(msg.text());
  };
  page.on("console", onConsole);
  let status = 0;
  let body = "";
  let finalUrl = "";
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    status = res?.status() ?? 0;
    await page.waitForTimeout(1200);
    finalUrl = page.url();
    body = await page.locator("body").innerText().catch(() => "");
  } catch (err) {
    push(false, `${path}: nav error ${err instanceof Error ? err.message : err}`);
    page.off("console", onConsole);
    return;
  }
  page.off("console", onConsole);

  const onLogin = finalUrl.includes("/login");
  const has404 =
    status === 404 || /página não encontrada|not found|\b404\b/i.test(body.slice(0, 800));
  const has500 =
    status >= 500 || /erro interno|internal server error/i.test(body.slice(0, 800));
  const schemaErr =
    /coluna ausente|schema pendente|does not exist|schema cache|temporariamente desatualizado/i.test(
      body.slice(0, 4000),
    );
  const uuid =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
      body.slice(0, 5000),
    );
  if (uuid) report.uuidHits.push(path);
  for (const e of consoleBuf.slice(0, 5)) {
    report.consoleErrors.push({ route: path, text: e.slice(0, 300) });
  }
  if (has500 || status >= 500) report.httpIssues.push({ path, status });

  await shot(page, name);
  const ok = !onLogin && !has404 && !has500 && status > 0 && status < 500 && !schemaErr;
  push(
    ok,
    `${path} status=${status} login=${onLogin} schemaErr=${schemaErr} console=${consoleBuf.length}`,
  );
  return { body, status, schemaErr };
}

if (!existsSync(AUTH_FILE)) {
  console.error("AUTH ausente:", AUTH_FILE);
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
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const authed = await isAuthenticated(page);
  report.auth = authed;
  push(authed, "sessão autenticada");
  if (!authed) {
    writeFileSync(resolve(OUT, "browser-report.json"), JSON.stringify(report, null, 2));
    process.exit(2);
  }

  await visit(page, "/crm", "crm-hub");
  await visit(page, "/crm/leads", "crm-leads");
  await visit(page, "/crm/oportunidades", "crm-oportunidades");
  await visit(page, "/crm/pipeline", "crm-pipeline");
  await visit(page, "/crm/follow-ups", "crm-follow-ups");
  await visit(page, "/clientes", "clientes");
  await visit(page, "/clientes/funil", "kanban");
  await visit(page, "/clientes/novo", "cliente-novo");
  await visit(page, "/compras", "compras-hub");
  const ped = await visit(page, "/compras/pedidos", "compras-pedidos");
  if (ped?.body) {
    push(!/Schema pendente/i.test(ped.body), "compras/pedidos sem 'Schema pendente'");
  }
  await visit(page, "/compras/cotacoes", "compras-cotacoes");
  await visit(page, "/estoque", "estoque");

  const blockingConsole = report.consoleErrors.filter(
    (e) => !/favicon|React DevTools|hydrat/i.test(e.text),
  );
  push(report.httpIssues.length === 0, `HTTP 500 count=${report.httpIssues.length}`);
  push(blockingConsole.length === 0, `console.error bloqueantes=${blockingConsole.length}`);
  push(report.uuidHits.length === 0, `UUID hits=${report.uuidHits.length}`);

  const pass = report.checks.filter((c) => c.ok).length;
  const fail = report.checks.filter((c) => !c.ok).length;
  report.summary = { pass, fail, shots: report.shots.length };
  writeFileSync(resolve(OUT, "browser-report.json"), JSON.stringify(report, null, 2));
  console.log(`\nBrowser 29.10.1: ${pass} PASS · ${fail} FAIL\n`);
  process.exit(fail > 0 ? 1 : 0);
} finally {
  await browser.close();
}
