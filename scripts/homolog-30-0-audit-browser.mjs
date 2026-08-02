#!/usr/bin/env node
/**
 * Sprint 30.0 — Premium Review browser audit (authenticated, diagnostic only).
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

const OUT = resolve("docs/testing/evidence/30-0");
const TENANT = "teste-renato-01";
mkdirSync(resolve(OUT, "screenshots"), { recursive: true });

const ROUTES = [
  { path: "/dashboard", name: "dashboard", module: "Dashboard" },
  { path: "/clientes", name: "clientes", module: "Clientes" },
  { path: "/clientes/funil", name: "kanban", module: "CRM Kanban" },
  { path: "/crm", name: "crm", module: "CRM" },
  { path: "/crm/pipeline", name: "crm-pipeline", module: "Pipeline" },
  { path: "/crm/oportunidades", name: "crm-oportunidades", module: "Oportunidades" },
  { path: "/vendas", name: "vendas", module: "Vendas" },
  { path: "/ordens", name: "ordens", module: "Ordens" },
  { path: "/produtos", name: "produtos", module: "Produtos" },
  { path: "/estoque", name: "estoque", module: "Estoque" },
  { path: "/compras", name: "compras", module: "Compras" },
  { path: "/compras/pedidos", name: "compras-pedidos", module: "Pedidos" },
  { path: "/agenda", name: "agenda", module: "Agenda" },
  { path: "/financeiro", name: "financeiro", module: "Financeiro" },
  { path: "/financeiro/contas-pagar", name: "contas-pagar", module: "Contas a pagar" },
  { path: "/financeiro/contas-receber", name: "contas-receber", module: "Contas a receber" },
  { path: "/financeiro/fluxo-caixa", name: "fluxo-caixa", module: "Fluxo de Caixa" },
  { path: "/financeiro/dre", name: "dre", module: "DRE" },
  { path: "/analytics", name: "analytics", module: "Analytics" },
  { path: "/inteligencia", name: "inteligencia", module: "Inteligência" },
  { path: "/tributario", name: "tributario", module: "Tributário" },
  { path: "/configuracoes", name: "configuracoes", module: "Configurações" },
  { path: "/configuracoes/metas", name: "metas", module: "Metas" },
  { path: "/centro-operacoes", name: "centro-operacoes", module: "Centro Operações" },
  { path: "/oficina/mecanicos", name: "oficina-mecanicos", module: "Oficina/Mecânicos" },
  { path: "/relatorios", name: "relatorios", module: "Relatórios" },
];

const VIEWPORTS = [
  { w: 1920, h: 1080, label: "1920" },
  { w: 1440, h: 900, label: "1440" },
  { w: 1366, h: 768, label: "1366" },
  { w: 1024, h: 768, label: "1024" },
  { w: 768, h: 1024, label: "768" },
  { w: 430, h: 932, label: "430" },
  { w: 390, h: 844, label: "390" },
  { w: 375, h: 667, label: "375" },
];

const report = {
  at: new Date().toISOString(),
  sprint: "30.0",
  baseUrl: BASE_URL,
  tenant: TENANT,
  auth: false,
  sessionPersist: false,
  checks: [],
  routes: [],
  perf: [],
  viewports: [],
  themes: [],
  consoleErrors: [],
  pageErrors: [],
  httpIssues: [],
  uuidHits: [],
  genericFlags: [],
};

function push(ok, detail) {
  report.checks.push({ ok: Boolean(ok), detail });
  console.log(ok ? "  PASS" : "  FAIL", detail);
}

async function shot(page, name) {
  const rel = `screenshots/${name}.png`;
  await page.screenshot({ path: resolve(OUT, rel), fullPage: false });
  return rel;
}

async function visit(page, route, shotName) {
  const url = `${BASE_URL}/${TENANT}${route.path}`;
  const t0 = Date.now();
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
  let navMs = 0;
  let webVitals = null;
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    status = res?.status() ?? 0;
    await page.waitForTimeout(1400);
    navMs = Date.now() - t0;
    finalUrl = page.url();
    body = await page.locator("body").innerText().catch(() => "");
    webVitals = await page
      .evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        const paints = performance.getEntriesByType("paint");
        const fcp = paints.find((p) => p.name === "first-contentful-paint")?.startTime ?? null;
        return {
          ttfb: nav ? Math.round(nav.responseStart) : null,
          domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
          load: nav ? Math.round(nav.loadEventEnd) : null,
          fcp: fcp != null ? Math.round(fcp) : null,
          transferSize: nav ? nav.transferSize : null,
        };
      })
      .catch(() => null);
  } catch (err) {
    push(false, `${route.path}: ${err instanceof Error ? err.message : err}`);
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    return null;
  }
  page.off("console", onConsole);
  page.off("pageerror", onPageError);

  const onLogin = finalUrl.includes("/login");
  const has404 =
    status === 404 || /página não encontrada|not found|\b404\b/i.test(body.slice(0, 800));
  const has500 =
    status >= 500 || /erro interno|internal server error/i.test(body.slice(0, 800));
  const schemaErr =
    /coluna ausente|schema pendente|does not exist|schema cache/i.test(body.slice(0, 4000));
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
    body.slice(0, 4000),
  );
  const rawEnum = /\b(PENDING|APPROVED|REJECTED|OPEN|CLOSED|DRAFT)\b/.test(body.slice(0, 3000));
  if (uuid) report.uuidHits.push(route.path);
  if (rawEnum) report.genericFlags.push({ path: route.path, kind: "raw_enum" });
  for (const e of consoleBuf.slice(0, 3)) {
    report.consoleErrors.push({ route: route.path, text: e.slice(0, 250) });
  }
  for (const e of pageErrBuf.slice(0, 2)) {
    report.pageErrors.push({ route: route.path, text: e.slice(0, 250) });
  }
  if (has500 || status >= 500) report.httpIssues.push({ path: route.path, status });

  const shotRel = await shot(page, shotName);
  const ok = !onLogin && !has404 && !has500 && status > 0 && status < 500 && !schemaErr;
  push(ok, `${route.module} ${route.path} status=${status} ${navMs}ms`);

  const entry = {
    ...route,
    status,
    navMs,
    onLogin,
    has404,
    has500,
    schemaErr,
    uuid,
    rawEnum,
    console: consoleBuf.length,
    pageErr: pageErrBuf.length,
    shot: shotRel,
    webVitals,
    bodyPreview: body.slice(0, 180).replace(/\s+/g, " "),
  };
  report.routes.push(entry);
  if (webVitals) {
    report.perf.push({
      path: route.path,
      module: route.module,
      navMs,
      ...webVitals,
    });
  }
  return entry;
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
  push(authed, "sessão autenticada (não é redirect-only)");
  if (!authed) {
    writeFileSync(resolve(OUT, "browser-audit.json"), JSON.stringify(report, null, 2));
    process.exit(2);
  }

  // Persistência após refresh
  await page.goto(`${BASE_URL}/${TENANT}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const still = await isAuthenticated(page);
  report.sessionPersist = still;
  push(still && !page.url().includes("/login"), "persistência de sessão após refresh");

  // Deep link / nova aba
  const page2 = await ctx.newPage();
  await page2.goto(`${BASE_URL}/${TENANT}/financeiro/dre`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page2.waitForTimeout(800);
  const deepOk = !page2.url().includes("/login") && (await isAuthenticated(page2));
  push(deepOk, "deep link / nova aba DRE autenticado");
  await page2.close();

  // Rotas principais
  for (const route of ROUTES) {
    await visit(page, route, route.name);
  }

  // Landing + login (fora do tenant)
  for (const [path, name] of [
    ["/", "landing"],
    ["/login", "login"],
  ]) {
    const res = await page.goto(`${BASE_URL}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(700);
    await shot(page, name);
    push((res?.status() ?? 0) === 200, `${name} status=${res?.status()}`);
  }

  // Reautenticar contexto tenant para viewports (storageState ainda válido)
  await page.goto(`${BASE_URL}/${TENANT}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  // Themes
  await page.evaluate(() => {
    localStorage.setItem("gof-theme-preference", "dark");
    document.documentElement.setAttribute("data-gof-theme", "dark");
    document.documentElement.classList.add("dark");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  let theme = await page.locator("html").getAttribute("data-gof-theme");
  report.themes.push({ mode: "dark", attr: theme });
  await shot(page, "dashboard-dark");
  push(theme === "dark", `dark mode data-gof-theme=${theme}`);

  await page.evaluate(() => {
    localStorage.setItem("gof-theme-preference", "light");
    document.documentElement.setAttribute("data-gof-theme", "light");
    document.documentElement.classList.remove("dark");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  theme = await page.locator("html").getAttribute("data-gof-theme");
  report.themes.push({ mode: "light", attr: theme });
  await shot(page, "dashboard-light");
  push(theme === "light", `light mode data-gof-theme=${theme}`);

  // Viewports sample (dashboard + dre + kanban)
  const samplePaths = [
    { path: "/dashboard", prefix: "vp-dash" },
    { path: "/financeiro/dre", prefix: "vp-dre" },
    { path: "/clientes/funil", prefix: "vp-kanban" },
  ];
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    for (const s of samplePaths) {
      const res = await page.goto(`${BASE_URL}/${TENANT}${s.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
      await page.waitForTimeout(700);
      const status = res?.status() ?? 0;
      const shotRel = await shot(page, `${s.prefix}-${vp.label}`);
      const ok = status === 200 && !page.url().includes("/login");
      report.viewports.push({
        viewport: vp.label,
        path: s.path,
        status,
        ok,
        shot: shotRel,
      });
      push(ok, `viewport ${vp.label} ${s.path} status=${status}`);
    }
  }

  // Ranking rotas mais lentas
  report.perfRanking = [...report.perf]
    .sort((a, b) => (b.navMs ?? 0) - (a.navMs ?? 0))
    .slice(0, 10);

  const blockingConsole = report.consoleErrors.filter(
    (e) => !/favicon|React DevTools|hydrat/i.test(e.text),
  );
  push(report.httpIssues.length === 0, `HTTP 500=${report.httpIssues.length}`);
  push(report.pageErrors.length === 0, `PageError=${report.pageErrors.length}`);
  push(blockingConsole.length === 0, `console bloqueante=${blockingConsole.length}`);
  push(report.uuidHits.length === 0, `UUID hits=${report.uuidHits.length}`);

  const pass = report.checks.filter((c) => c.ok).length;
  const fail = report.checks.filter((c) => !c.ok).length;
  report.summary = { pass, fail, routes: report.routes.length };
  writeFileSync(resolve(OUT, "browser-audit.json"), JSON.stringify(report, null, 2));
  console.log(`\nBrowser 30.0 audit: ${pass} PASS · ${fail} FAIL\n`);
  console.log("Top slow routes:");
  for (const r of report.perfRanking) {
    console.log(`  ${r.navMs}ms  ${r.path}  ttfb=${r.ttfb} fcp=${r.fcp}`);
  }
  process.exit(fail > 0 ? 1 : 0);
} finally {
  await browser.close();
}
