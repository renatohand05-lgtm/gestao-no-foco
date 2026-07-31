/**
 * Sprint 25.7.5 — Runtime CRM no navegador (Owner).
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/25-7-5");
mkdirSync(OUT, { recursive: true });
const TENANT = "teste-renato-01";

const report = {
  at: new Date().toISOString(),
  baseUrl: BASE_URL,
  tenant: TENANT,
  checks: [],
  consoleErrors: [],
  fatal: false,
  shots: [],
};

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

async function shot(page, name) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  report.shots.push(path);
  console.log("saved", name);
}

function push(check) {
  report.checks.push(check);
  console.log(check.ok ? "PASS" : "FAIL", check.page, check.detail ?? "");
}

async function openCrm(page, path, name) {
  const url = `${BASE_URL}/${TENANT}${path}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await Promise.race([
    page
      .waitForSelector(
        "text=/CRM Enterprise|Pipeline comercial|Agenda comercial|Indicadores|Sem permissão|Erro na área/i",
        { timeout: 90000 },
      )
      .catch(() => null),
    page.waitForTimeout(12000),
  ]);
  await page.waitForTimeout(1200);
  const body = await page.locator("body").innerText();
  const boundary = /Erro na área da empresa|Não foi possível carregar este módulo/i.test(
    body,
  );
  const deniedPerm = /Sem permissão crm\.visualizar/i.test(body);
  const okUi =
    /CRM Enterprise|Pipeline comercial|Agenda comercial|Indicadores CRM|CRM/i.test(
      body,
    );
  push({
    page: name,
    url: page.url(),
    ok: !boundary && (okUi || deniedPerm === false),
    boundary,
    deniedPerm,
    detail: boundary
      ? "error boundary ativo"
      : deniedPerm
        ? "bloqueio crm.visualizar"
        : "CRM carregou",
  });
  await shot(page, name);
}

if (!existsSync(AUTH_FILE)) {
  report.fatal = true;
  push({ page: "auth", ok: false, error: "auth missing" });
} else {
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (!/manifest|favicon|Download the React DevTools/i.test(t)) {
        report.consoleErrors.push(t.slice(0, 400));
      }
    }
  });
  await page.setViewportSize({ width: 1440, height: 900 });

  await openCrm(page, "/crm", "crm-hub");
  await openCrm(page, "/crm/executivo", "crm-executivo");
  await openCrm(page, "/crm/pipeline", "crm-pipeline");
  await openCrm(page, "/crm/agenda", "crm-agenda");
  await openCrm(page, "/crm/indicadores", "crm-indicadores");

  // theme toggle if present
  const toggle = page.locator("[data-theme-toggle]").first();
  if (await toggle.count()) {
    await toggle.click().catch(() => null);
    await page.waitForTimeout(600);
    await shot(page, "crm-theme-toggled");
  }

  await context.close();
}

await browser.close();

const fails = report.checks.filter((c) => c.ok === false);
report.summary = {
  pass: report.checks.length - fails.length,
  fail: fails.length,
  consoleErrors: report.consoleErrors.length,
};
writeFileSync(resolve(OUT, "runtime-report.json"), JSON.stringify(report, null, 2));
console.log(`\nResultado: ${report.summary.pass} PASS · ${report.summary.fail} FAIL`);
process.exit(report.fatal || fails.length ? 1 : 0);
