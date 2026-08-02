#!/usr/bin/env node
/**
 * Fase 29.11 — Browser QA de release (local autenticado).
 * Pré-requisito: npm run dev + docs/testing/playwright/.auth/user.json
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

const OUT = resolve("docs/testing/evidence/release-v29");
const TENANT = "teste-renato-01";
mkdirSync(OUT, { recursive: true });
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "29.11",
  baseUrl: BASE_URL,
  tenant: TENANT,
  auth: false,
  checks: [],
  consoleErrors: [],
  pageErrors: [],
  httpIssues: [],
  uuidHits: [],
  hydrationHits: [],
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

async function visit(page, path, name, { expectTheme } = {}) {
  const url = `${BASE_URL}/${TENANT}${path.startsWith("/") ? path : `/${path}`}`;
  const consoleBuf = [];
  const pageErrBuf = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") consoleBuf.push(msg.text());
  };
  const onPageError = (err) => pageErrBuf.push(String(err));
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  let status = 0;
  let body = "";
  let finalUrl = "";
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    status = res?.status() ?? 0;
    await page.waitForTimeout(1100);
    finalUrl = page.url();
    body = await page.locator("body").innerText().catch(() => "");
  } catch (err) {
    push(false, `${path}: nav error ${err instanceof Error ? err.message : err}`);
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    return;
  }
  page.off("console", onConsole);
  page.off("pageerror", onPageError);

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
  const hydration = consoleBuf.some((t) => /hydrat/i.test(t));
  if (uuid) report.uuidHits.push(path);
  if (hydration) report.hydrationHits.push(path);
  for (const e of consoleBuf.slice(0, 5)) {
    report.consoleErrors.push({ route: path, text: e.slice(0, 300) });
  }
  for (const e of pageErrBuf.slice(0, 3)) {
    report.pageErrors.push({ route: path, text: e.slice(0, 300) });
  }
  if (has500 || status >= 500) report.httpIssues.push({ path, status });

  if (expectTheme) {
    const htmlClass = await page.locator("html").getAttribute("class").catch(() => "");
    const dataTheme = await page
      .locator("html")
      .getAttribute("data-gof-theme")
      .catch(() => "");
    const dark =
      dataTheme === "dark" ||
      (dataTheme !== "light" && /\bdark\b/.test(htmlClass ?? ""));
    push(
      expectTheme === "dark" ? dark : !dark,
      `tema ${expectTheme} em ${path} (data-gof-theme=${dataTheme} html.dark=${/\bdark\b/.test(htmlClass ?? "")})`,
    );
  }

  await shot(page, name);
  const ok =
    !onLogin &&
    !has404 &&
    !has500 &&
    status > 0 &&
    status < 500 &&
    !schemaErr &&
    pageErrBuf.length === 0;
  push(
    ok,
    `${path} status=${status} login=${onLogin} schemaErr=${schemaErr} pageErr=${pageErrBuf.length} console=${consoleBuf.length}`,
  );
}

async function setViewport(page, w, h, label) {
  await page.setViewportSize({ width: w, height: h });
  push(true, `viewport ${label} ${w}x${h}`);
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

  // Desktop
  await setViewport(page, 1440, 900, "desktop");
  await visit(page, "/dashboard", "dashboard");
  await visit(page, "/financeiro", "financeiro");
  await visit(page, "/financeiro/dre", "dre");
  await visit(page, "/financeiro/fluxo-caixa", "fluxo-caixa");
  await visit(page, "/financeiro/contas-pagar", "contas-pagar");
  await visit(page, "/financeiro/contas-receber", "contas-receber");
  await visit(page, "/crm", "crm");
  await visit(page, "/clientes/funil", "kanban");
  await visit(page, "/agenda", "agenda");
  await visit(page, "/compras", "compras");
  await visit(page, "/compras/pedidos", "pedidos");
  await visit(page, "/estoque", "estoque");
  await visit(page, "/financeiro/centros-custo", "centros-custo");
  await visit(page, "/inteligencia", "inteligencia");
  await visit(page, "/analytics", "analytics");
  await visit(page, "/configuracoes", "configuracoes");
  // RBAC surface: papel do usuário em Configurações (rota /permissoes não existe)
  await visit(page, "/configuracoes/metas", "permissoes-metas");

  // Themes — contrato oficial: gof-theme-preference + data-gof-theme
  await page.evaluate(() => {
    localStorage.setItem("gof-theme-preference", "dark");
    document.documentElement.setAttribute("data-gof-theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  });
  await visit(page, "/dashboard", "dashboard-dark", { expectTheme: "dark" });
  await page.evaluate(() => {
    localStorage.setItem("gof-theme-preference", "light");
    document.documentElement.setAttribute("data-gof-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  });
  await visit(page, "/dashboard", "dashboard-light", { expectTheme: "light" });

  // Tablet / Mobile
  await setViewport(page, 768, 1024, "tablet");
  await visit(page, "/dashboard", "dashboard-tablet");
  await setViewport(page, 390, 844, "mobile");
  await visit(page, "/dashboard", "dashboard-mobile");
  await setViewport(page, 1440, 900, "desktop-restore");

  const blockingConsole = report.consoleErrors.filter(
    (e) => !/favicon|React DevTools|hydrat/i.test(e.text),
  );
  push(report.httpIssues.length === 0, `HTTP 500 count=${report.httpIssues.length}`);
  push(report.pageErrors.length === 0, `PageError count=${report.pageErrors.length}`);
  push(blockingConsole.length === 0, `console.error bloqueantes=${blockingConsole.length}`);
  push(report.uuidHits.length === 0, `UUID hits=${report.uuidHits.length}`);
  push(report.hydrationHits.length === 0, `Hydration hits=${report.hydrationHits.length}`);

  const pass = report.checks.filter((c) => c.ok).length;
  const fail = report.checks.filter((c) => !c.ok).length;
  report.summary = { pass, fail, shots: report.shots.length };
  writeFileSync(resolve(OUT, "browser-report.json"), JSON.stringify(report, null, 2));
  console.log(`\nBrowser 29.11 release: ${pass} PASS · ${fail} FAIL\n`);
  process.exit(fail > 0 ? 1 : 0);
} finally {
  await browser.close();
}
