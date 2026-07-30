/**
 * Sprint 25.7.3 — Runtime: Owner acessa Dashboard Executivo (sem bloqueio RBAC).
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/25-7-3");
mkdirSync(OUT, { recursive: true });

const REQUIRED_DENIED =
  /Sem permissão:\s*analytics\.visualizar\s*\|\s*analytics\.executivo\s*\|\s*dashboard\.executivo/i;

const report = {
  at: new Date().toISOString(),
  baseUrl: BASE_URL,
  tenant: "teste-renato-01",
  checks: [],
  consoleErrors: [],
  fatal: false,
  shots: [],
  tree: null,
};

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

async function shot(page, name) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  report.shots.push(path);
  console.log("saved", name);
}

function pushCheck(check) {
  report.checks.push(check);
  const ok = check.ok !== false && !check.error && !check.denied;
  console.log(ok ? "PASS" : "FAIL", check.page, check.detail ?? "");
}

{
  if (!existsSync(AUTH_FILE)) {
    report.fatal = true;
    pushCheck({ page: "auth", ok: false, error: "auth missing" });
  } else {
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        report.consoleErrors.push(msg.text().slice(0, 400));
      }
    });
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto(`${BASE_URL}/teste-renato-01/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForTimeout(1500);
    const dashBody = await page.locator("body").innerText();
    pushCheck({
      page: "dashboard",
      url: page.url(),
      ok: !REQUIRED_DENIED.test(dashBody),
      denied: REQUIRED_DENIED.test(dashBody),
      detail: REQUIRED_DENIED.test(dashBody)
        ? "bloqueio RBAC presente"
        : "sem bloqueio executivo",
    });
    await shot(page, "dashboard");

    await page.goto(`${BASE_URL}/teste-renato-01/analytics`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await Promise.race([
      page.waitForSelector('[role="alert"]', { timeout: 90000 }).catch(() => null),
      page
        .waitForSelector("text=/Indicadores executivos|Sem permissão|Analytics Enterprise/i", {
          timeout: 90000,
        })
        .catch(() => null),
      page.waitForTimeout(12000),
    ]);
    await page.waitForTimeout(1500);
    const analyticsUrl = page.url();
    const analyticsBody = await page.locator("body").innerText();
    const denied = REQUIRED_DENIED.test(analyticsBody);
    const hasAlert =
      (await page.locator('[role="alert"]').filter({ hasText: /Sem permissão/i }).count()) >
      0;
    const hasExecUi =
      (await page.locator("text=/Indicadores executivos|Analytics Enterprise|Dashboard executivo/i").count()) >
      0;

    pushCheck({
      page: "analytics-redirect",
      url: analyticsUrl,
      ok: !denied && !hasAlert,
      denied,
      hasAlert,
      hasExecUi,
      detail: denied
        ? "Owner ainda bloqueado nas 3 permissões"
        : hasAlert
          ? "alerta Sem permissão visível"
          : "dashboard executivo carregou sem bloqueio RBAC",
    });
    await shot(page, "analytics-executivo");

    await page.goto(`${BASE_URL}/teste-renato-01/analytics/executivo`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await Promise.race([
      page
        .waitForSelector("text=/Indicadores executivos|Sem permissão|Analytics Enterprise/i", {
          timeout: 90000,
        })
        .catch(() => null),
      page.waitForTimeout(12000),
    ]);
    await page.waitForTimeout(1500);
    const execBody = await page.locator("body").innerText();
    const execDenied = REQUIRED_DENIED.test(execBody);
    const execAlert =
      (await page.locator('[role="alert"]').filter({ hasText: /Sem permissão/i }).count()) >
      0;
    const execUi =
      (await page.locator("text=/Indicadores executivos|Analytics Enterprise/i").count()) > 0;
    pushCheck({
      page: "analytics-executivo",
      url: page.url(),
      ok: !execDenied && !execAlert && execUi,
      denied: execDenied,
      hasAlert: execAlert,
      hasExecUi: execUi,
      detail:
        !execDenied && !execAlert && execUi
          ? "acesso liberado para Owner"
          : execDenied || execAlert
            ? "bloqueio RBAC ainda ativo"
            : "UI executiva não renderizou (possível splash)",
    });
    await shot(page, "analytics-executivo-direct");

    report.tree = {
      user: "authenticated (playwright .auth/user.json)",
      membership: "tenant_members.role → owner (esperado)",
      enterpriseRole: "owner → proprietario (compat)",
      required: [
        "analytics.visualizar",
        "analytics.executivo",
        "dashboard.executivo",
      ],
      outcome:
        !denied && !execDenied && !hasAlert && !execAlert
          ? "ALLOW (compat Owner)"
          : "DENY",
    };

    await context.close();
  }
}

await browser.close();

const fails = report.checks.filter((c) => c.ok === false || c.denied || c.error);
report.summary = {
  pass: report.checks.length - fails.length,
  fail: fails.length,
  fatal: report.fatal,
};

writeFileSync(resolve(OUT, "runtime-report.json"), JSON.stringify(report, null, 2));
console.log("\nReport →", resolve(OUT, "runtime-report.json"));
console.log(`Resultado: ${report.summary.pass} PASS · ${report.summary.fail} FAIL`);
process.exit(report.fatal || fails.length > 0 ? 1 : 0);
