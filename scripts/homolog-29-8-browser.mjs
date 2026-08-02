#!/usr/bin/env node
/**
 * Sprint 29.8 — Browser QA autenticado (Playwright).
 * Pré-requisito: npm run dev + docs/testing/playwright/.auth/user.json (npm run test:login)
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

const OUT = resolve("docs/testing/evidence/29-8");
const TENANT = "teste-renato-01";
const SHOTS = resolve(OUT, "screenshots");

mkdirSync(OUT, { recursive: true });
mkdirSync(SHOTS, { recursive: true });

const report = {
  at: new Date().toISOString(),
  sprint: "29.8",
  baseUrl: BASE_URL,
  tenant: TENANT,
  auth: false,
  matrix: [],
  consoleErrors: [],
  failedRequests: [],
  uuidHits: [],
  checks: [],
};

function push(ok, detail) {
  report.checks.push({ ok: Boolean(ok), detail });
  console.log(ok ? "  PASS" : "  FAIL", detail);
}

async function shot(page, name) {
  const path = resolve(SHOTS, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return `screenshots/${name}.png`;
}

async function visit(page, routePath, meta) {
  const url =
    routePath === "/"
      ? `${BASE_URL}/`
      : routePath.startsWith("http")
        ? routePath
        : routePath.startsWith("/login") || routePath.startsWith("/register")
          ? `${BASE_URL}${routePath}`
          : `${BASE_URL}/${TENANT}${routePath.startsWith("/") ? "" : "/"}${routePath}`;

  const consoleBuf = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") consoleBuf.push(msg.text());
  };
  const onFail = (req) => {
    report.failedRequests.push({
      url: req.url(),
      route: routePath,
    });
  };
  page.on("console", onConsole);
  page.on("requestfailed", onFail);

  let status = 0;
  let finalUrl = "";
  let body = "";
  try {
    const res = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    status = res?.status() ?? 0;
    await page.waitForTimeout(1200);
    finalUrl = page.url();
    body = await page.locator("body").innerText().catch(() => "");
  } catch (err) {
    push(false, `${routePath}: navigation error ${err instanceof Error ? err.message : err}`);
    page.off("console", onConsole);
    page.off("requestfailed", onFail);
    return;
  }

  page.off("console", onConsole);
  page.off("requestfailed", onFail);

  const onLogin = finalUrl.includes("/login");
  const has404 =
    status === 404 ||
    /página não encontrada|not found|\b404\b/i.test(body.slice(0, 800));
  const has500 = status >= 500 || /erro interno|internal server error/i.test(body.slice(0, 800));
  const uuid =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
      body.slice(0, 5000),
    );
  if (uuid && meta.auth) report.uuidHits.push(routePath);

  for (const e of consoleBuf.slice(0, 5)) {
    report.consoleErrors.push({ route: routePath, text: e.slice(0, 300) });
  }

  let shotPath = null;
  if (meta.shot) {
    shotPath = await shot(
      page,
      `${meta.shot}-${meta.theme || "dark"}-${meta.viewport || "desktop"}`,
    );
  }

  const ok =
    !has404 &&
    !has500 &&
    status > 0 &&
    status < 500 &&
    (meta.public || !onLogin);

  report.matrix.push({
    route: routePath,
    status,
    finalUrl,
    onLogin,
    has404,
    has500,
    theme: meta.theme || null,
    viewport: meta.viewport || null,
    shot: shotPath,
    consoleErrors: consoleBuf.length,
    ok,
  });

  push(
    ok,
    `${routePath} status=${status} login=${onLogin} 404=${has404} theme=${meta.theme || "-"} vp=${meta.viewport || "-"}`,
  );
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
    desktop: { width: 1920, height: 1080 },
    notebook: { width: 1366, height: 768 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 390, height: 844 },
  };
  await page.setViewportSize(map[name] || map.desktop);
}

const PUBLIC = ["/", "/login"];
const AUTH_ROUTES = [
  { path: "/dashboard", shot: "dashboard" },
  { path: "/clientes", shot: "clientes" },
  { path: "/produtos", shot: "produtos" },
  { path: "/produtos/servicos", shot: "servicos" },
  { path: "/vendas", shot: "vendas" },
  { path: "/vendas/nova", shot: "vendas-nova" },
  { path: "/ordens", shot: "ordens" },
  { path: "/ordens/nova", shot: "ordens-nova" },
  { path: "/crm", shot: "crm" },
  { path: "/crm/leads", shot: "crm-leads" },
  { path: "/crm/oportunidades", shot: "crm-oportunidades" },
  { path: "/compras", shot: "compras" },
  { path: "/estoque", shot: "estoque" },
  { path: "/agenda", shot: "agenda" },
  { path: "/financeiro", shot: "financeiro" },
  { path: "/financeiro/orcamento", shot: "orcamento" },
  { path: "/financeiro/dre", shot: "dre" },
  { path: "/financeiro/cfo", shot: "cfo" },
  { path: "/analytics", shot: "analytics" },
  { path: "/inteligencia", shot: "inteligencia" },
  { path: "/tributario", shot: "tributario" },
  { path: "/configuracoes/metas", shot: "metas" },
  { path: "/configuracoes", shot: "configuracoes" },
];

if (!existsSync(AUTH_FILE)) {
  console.error("AUTH ausente:", AUTH_FILE);
  console.error("Execute: npm run test:login (com npm run dev ativo)");
  writeFileSync(
    resolve(OUT, "browser-report.json"),
    JSON.stringify({ ...report, error: "AUTH_MISSING" }, null, 2),
  );
  process.exit(2);
}

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  // Public
  for (const p of PUBLIC) {
    await visit(page, p, { public: true, shot: p === "/" ? "home" : "login", theme: "light", viewport: "desktop" });
  }

  const authed = await isAuthenticated(page);
  report.auth = authed;
  push(authed, "sessão autenticada (storageState)");
  if (!authed) {
    writeFileSync(resolve(OUT, "browser-report.json"), JSON.stringify(report, null, 2));
    process.exit(2);
  }

  // Dark desktop — rotas autenticadas
  await setTheme(page, "dark");
  await setViewport(page, "desktop");
  for (const r of AUTH_ROUTES) {
    await visit(page, r.path, {
      auth: true,
      shot: r.shot,
      theme: "dark",
      viewport: "desktop",
    });
  }

  // Light sample
  await setTheme(page, "light");
  for (const r of [
    { path: "/dashboard", shot: "dashboard" },
    { path: "/financeiro/dre", shot: "dre" },
    { path: "/crm", shot: "crm" },
    { path: "/inteligencia", shot: "inteligencia" },
  ]) {
    await visit(page, r.path, {
      auth: true,
      shot: r.shot,
      theme: "light",
      viewport: "desktop",
    });
  }

  // Responsiveness samples
  await setTheme(page, "dark");
  for (const vp of ["notebook", "tablet", "mobile"]) {
    await setViewport(page, vp);
    await visit(page, "/dashboard", {
      auth: true,
      shot: "dashboard",
      theme: "dark",
      viewport: vp,
    });
    await visit(page, "/financeiro/dre", {
      auth: true,
      shot: "dre",
      theme: "dark",
      viewport: vp,
    });
  }

  const pass = report.checks.filter((c) => c.ok).length;
  const fail = report.checks.filter((c) => !c.ok).length;
  report.summary = {
    pass,
    fail,
    routes: report.matrix.length,
    shots: report.matrix.filter((m) => m.shot).length,
    consoleErrors: report.consoleErrors.length,
    failedRequests: report.failedRequests.length,
    uuidHits: report.uuidHits.length,
  };

  writeFileSync(resolve(OUT, "browser-report.json"), JSON.stringify(report, null, 2));

  const matrixMd = [
    "# Browser QA Matrix — Sprint 29.8",
    "",
    `| Campo | Valor |`,
    `|-------|--------|`,
    `| Tenant | ${TENANT} |`,
    `| Auth | ${report.auth} |`,
    `| PASS | ${pass} |`,
    `| FAIL | ${fail} |`,
    `| Shots | ${report.summary.shots} |`,
    `| Console errors capturados | ${report.summary.consoleErrors} |`,
    `| UUID hits (amostra body) | ${report.summary.uuidHits} |`,
    "",
    "| Rota | Status | Theme | Viewport | Login? | 404? | OK | Shot |",
    "|------|--------|-------|----------|--------|------|----|------|",
    ...report.matrix.map(
      (m) =>
        `| ${m.route} | ${m.status} | ${m.theme || "-"} | ${m.viewport || "-"} | ${m.onLogin} | ${m.has404} | ${m.ok ? "PASS" : "FAIL"} | ${m.shot || "-"} |`,
    ),
    "",
  ].join("\n");

  writeFileSync(resolve(OUT, "BROWSER_QA_MATRIX.md"), matrixMd);

  console.log(`\nBrowser 29.8: ${pass} PASS · ${fail} FAIL · shots=${report.summary.shots}\n`);
  process.exit(fail > 0 ? 1 : 0);
} finally {
  await browser.close();
}
