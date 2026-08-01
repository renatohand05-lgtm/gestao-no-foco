/**
 * Sprint 27.6.2 — Prova de restart: reabre sessão gravada e confirma mensagens/evidências.
 * Pré-requisito: capture-27-6-2 gerou restart-session.json e o servidor foi reiniciado.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/27-6-2");
mkdirSync(OUT, { recursive: true });
const TENANT = "teste-renato-01";
const marker = resolve(OUT, "restart-session.json");

const report = {
  at: new Date().toISOString(),
  sprint: "27.6.2",
  checks: [],
  sessionId: null,
};

function push(ok, detail) {
  report.checks.push({ ok, detail });
  console.log(ok ? "PASS" : "FAIL", detail);
}

if (!existsSync(marker)) {
  console.error("restart-session.json ausente — rode capture-27-6-2 primeiro.");
  process.exit(1);
}

const { sessionId } = JSON.parse(readFileSync(marker, "utf8"));
report.sessionId = sessionId;
if (!sessionId) {
  console.error("sessionId vazio no marker.");
  process.exit(1);
}

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(
    `${BASE_URL}/${TENANT}/inteligencia/historico?session=${sessionId}`,
    { waitUntil: "domcontentloaded", timeout: 120000 },
  );
  await page.waitForTimeout(2500);

  push(
    (await page.locator("[data-intelligence-history-page]").count()) > 0,
    "historico carregou pós-restart",
  );
  push(
    (await page.locator(`[data-session-id="${sessionId}"]`).count()) > 0 ||
      page.url().includes(sessionId),
    "sessão alvo presente na URL/lista",
  );
  push(
    (await page.locator("[data-session-detail]").count()) > 0,
    "detalhe da sessão renderizado",
  );
  const hasMsgs =
    (await page.locator("[data-message-role]").count()) > 0 ||
    (await page.getByText(/assistant|user|Quanto|caixa/i).count()) > 0;
  push(hasMsgs, "mensagens preservadas após restart");
  const hasEvid =
    (await page.locator("[data-session-evidence]").count()) > 0 ||
    (await page.getByText(/Evidênc|origem/i).count()) > 0;
  push(hasEvid, "evidências preservadas após restart");

  await page.screenshot({
    path: resolve(OUT, "restart-sessao-preservada.png"),
    fullPage: true,
  });
  report.shots = ["restart-sessao-preservada"];

  report.summary = {
    pass: report.checks.filter((c) => c.ok).length,
    fail: report.checks.filter((c) => !c.ok).length,
  };
  writeFileSync(
    resolve(OUT, "restart-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("\nRestart summary", report.summary);
  if (report.summary.fail > 0) process.exitCode = 1;
} catch (e) {
  console.error(e);
  writeFileSync(
    resolve(OUT, "restart-report.json"),
    JSON.stringify({ ...report, fatal: String(e) }, null, 2),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
