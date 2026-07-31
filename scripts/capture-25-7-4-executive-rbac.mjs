/**
 * Sprint 25.7.4 — Runtime: Owner acessa Dashboard Executivo (gate final).
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/25-7-4");
mkdirSync(OUT, { recursive: true });

const DENIED =
  /Sem permissão:\s*(analytics\.(visualizar|executivo)|dashboard\.executivo)/i;

const report = {
  at: new Date().toISOString(),
  baseUrl: BASE_URL,
  tenant: "teste-renato-01",
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

if (!existsSync(AUTH_FILE)) {
  report.fatal = true;
  push({ page: "auth", ok: false, error: "auth missing" });
} else {
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text().slice(0, 400));
  });
  await page.setViewportSize({ width: 1440, height: 900 });

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
    page.waitForTimeout(15000),
  ]);
  await page.waitForTimeout(1500);

  const body = await page.locator("body").innerText();
  const denied = DENIED.test(body);
  const alert =
    (await page.locator('[role="alert"]').filter({ hasText: /Sem permissão/i }).count()) >
    0;
  const ui =
    (await page.locator("text=/Indicadores executivos|Analytics Enterprise/i").count()) >
    0;
  const ownerBadge =
    (await page.locator("text=/Owner/i").count()) > 0;

  push({
    page: "owner-executive",
    url: page.url(),
    ok: !denied && !alert && ui,
    denied,
    hasAlert: alert,
    hasExecUi: ui,
    ownerBadge,
    detail:
      !denied && !alert && ui
        ? "Owner com Dashboard Executivo liberado"
        : "bloqueio ou UI ausente",
  });
  await shot(page, "owner-executive");
  await context.close();
}

await browser.close();

const fails = report.checks.filter((c) => !c.ok);
report.summary = { pass: report.checks.length - fails.length, fail: fails.length };
writeFileSync(resolve(OUT, "runtime-report.json"), JSON.stringify(report, null, 2));
console.log(`\nResultado: ${report.summary.pass} PASS · ${report.summary.fail} FAIL`);
process.exit(report.fatal || fails.length ? 1 : 0);
