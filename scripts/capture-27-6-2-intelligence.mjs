/**
 * Sprint 27.6.2 — Etapa B: captura browser pós-migration + prova de restart.
 * Não executa SQL, commit, push ou deploy.
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

const CANONICAL = [
  ["Quanto tenho em caixa?", "q-caixa"],
  ["Quanto vendemos este mês?", "q-vendas"],
  ["Quantos clientes ativos tenho?", "q-clientes"],
  ["Quantas OS estão abertas?", "q-os"],
  ["Quais produtos estão abaixo do mínimo?", "q-estoque-min"],
  ["Como está meu estoque?", "q-estoque"],
  ["Qual é meu principal risco?", "q-risco"],
  ["O que devo priorizar hoje?", "q-prioridade"],
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "notebook", width: 1280, height: 800 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
];

const report = {
  at: new Date().toISOString(),
  baseUrl: BASE_URL,
  tenant: TENANT,
  sprint: "27.6.2",
  stage: "B_POST_MIGRATION",
  shots: [],
  checks: [],
  consoleErrors: [],
  sessionId: null,
  restart: { attempted: false, preserved: null },
  crossModule: [],
};

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

function push(ok, detail) {
  report.checks.push({ ok, detail });
  console.log(ok ? "PASS" : "FAIL", detail);
}

async function shot(page, name) {
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  report.shots.push(name);
  console.log("saved", name);
}

async function gotoReady(page, path, selectors) {
  await page.goto(`${BASE_URL}/${TENANT}/${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  for (const sel of selectors) {
    try {
      await page.waitForSelector(sel, { timeout: 60000 });
      if ((await page.locator(sel).count()) > 0) return true;
    } catch {
      /* next */
    }
  }
  await page.waitForTimeout(800);
  return false;
}

async function ask(page, question) {
  const input = page.locator("[data-gf-intelligence-input]");
  await input.fill(question);
  await page.getByRole("button", { name: /Perguntar/i }).click();
  await page.waitForSelector("[data-copilot-response]", { timeout: 90000 });
  await page.waitForTimeout(800);
}

try {
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    colorScheme: "light",
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text());
  });
  await page.setViewportSize(VIEWPORTS[0]);

  // Warm dashboard
  await gotoReady(page, "dashboard", ["[data-gf-kpi-cockpit]", "main"]);

  // 1) Config — persistence READY + provider OFF
  push(
    await gotoReady(page, "inteligencia/configuracoes", [
      "[data-intelligence-config-page]",
    ]),
    "config page",
  );
  push(
    (await page.locator('[data-persistence-status][data-ready="1"]').count()) >
      0,
    "persistence ready (post-migration)",
  );
  push(
    (await page.getByText(/Provider externo|external: OFF|unavailable|não configurado/i).count()) >
      0,
    "provider OFF visible",
  );
  await shot(page, "config-provider-off-persistence-ready");
  await shot(page, "provider-off");

  // 2) Copiloto + perguntas canônicas
  push(
    await gotoReady(page, "inteligencia/copiloto", [
      "[data-gf-executive-copilot]",
    ]),
    "copilot mounted",
  );
  await shot(page, "copiloto-deterministic");

  let firstAskOk = false;
  for (const [q, name] of CANONICAL) {
    await ask(page, q);
    const hasResponse =
      (await page.locator("[data-copilot-response]").count()) > 0;
    const hasConf =
      (await page.getByText(/Confiança|confiança|alta|média|media|baixa/i).count()) >
      0;
    const persisted =
      (await page.locator('[data-persistence-ready="1"]').count()) > 0 ||
      (await page.getByText(/Persistência:\s*gravada/i).count()) > 0;
    const hasEvidence =
      (await page.locator("[data-gf-evidence-drawer]").count()) > 0 ||
      (await page.getByText(/Evidênc|origem|deep/i).count()) > 0;
    push(hasResponse && hasConf, `${name} resposta+confiança`);
    push(persisted, `${name} persistência gravada`);
    if (!firstAskOk && hasResponse) firstAskOk = true;
    await shot(page, name);
    if (name === "q-caixa") {
      const evid = page.locator("[data-gf-evidence-drawer]");
      if (await evid.count()) {
        await evid.first().click().catch(() => null);
        await page.waitForTimeout(400);
        await shot(page, "evidencia");
        await shot(page, "confianca");
      }
      // Feedback
      const fb = page.locator("[data-gf-feedback-control] button").first();
      if (await fb.count()) {
        await fb.click();
        await page.waitForTimeout(500);
        await shot(page, "feedback");
      }
      // Action plan if present
      if ((await page.locator("[data-gf-action-plan]").count()) > 0) {
        await shot(page, "plano-acao");
      }
    }
  }
  push(firstAskOk, "ao menos uma pergunta canônica respondida");

  // 3) Histórico — sessão persistida
  push(
    await gotoReady(page, "inteligencia/historico", [
      "[data-intelligence-history-page]",
    ]),
    "historico page",
  );
  push(
    (await page.locator('[data-persistence-ready="1"]').count()) > 0 ||
      (await page.getByText(/persistência\s*ativa/i).count()) > 0,
    "historico persistence ativa",
  );
  const sessions = page.locator("[data-intelligence-session]");
  const sessionCount = await sessions.count();
  push(sessionCount > 0, `historico tem sessões (${sessionCount})`);
  await shot(page, "historico");

  if (sessionCount > 0) {
    const sid = await sessions.first().getAttribute("data-session-id");
    report.sessionId = sid;
    await page.goto(
      `${BASE_URL}/${TENANT}/inteligencia/historico?session=${sid}`,
      { waitUntil: "domcontentloaded", timeout: 120000 },
    );
    try {
      await page.waitForSelector("[data-session-detail]", { timeout: 60000 });
    } catch {
      /* checked below */
    }
    await page.waitForTimeout(800);
    const detailOk =
      (await page.locator("[data-session-detail]").count()) > 0;
    const msgsOk =
      (await page.locator("[data-message-role]").count()) > 0;
    push(detailOk && msgsOk, "sessão reaberta com mensagens");
    await shot(page, "sessao-reaberta");
  }

  // 4) Auditoria
  push(
    await gotoReady(page, "inteligencia/auditoria", [
      "[data-intelligence-audit-page]",
    ]),
    "auditoria page",
  );
  push(
    (await page.locator("[data-intelligence-audit-row]").count()) > 0 ||
      (await page.getByText(/copilot\.ask|correlation/i).count()) > 0,
    "auditoria com eventos persistidos",
  );
  await shot(page, "auditoria");

  // 5) Cross-module spot checks (caixa / vendas / OS labels present somewhere)
  for (const [path, sel, label] of [
    ["financeiro/caixa", "main", "financeiro caixa"],
    ["vendas", "main", "vendas"],
    ["clientes", "main", "crm clientes"],
    ["ordens", "main", "operacoes OS"],
    ["estoque", "main", "estoque"],
  ]) {
    const ok = await gotoReady(page, path, [sel]);
    push(ok, `módulo acessível: ${label}`);
    report.crossModule.push({ path, ok });
  }

  // 6) Viewports + themes on copiloto
  await gotoReady(page, "inteligencia/copiloto", [
    "[data-gf-executive-copilot]",
  ]);
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(400);
    await shot(page, `viewport-${vp.name}-light`);
  }
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await page.setViewportSize(VIEWPORTS[0]);
  await page.waitForTimeout(400);
  await shot(page, "theme-dark");
  await page.emulateMedia({ colorScheme: "light" });
  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
  });
  await shot(page, "theme-light");

  // Persist session id for restart proof
  writeFileSync(
    resolve(OUT, "restart-session.json"),
    JSON.stringify(
      { sessionId: report.sessionId, at: new Date().toISOString() },
      null,
      2,
    ),
  );

  const fails = report.checks.filter((c) => !c.ok).length;
  report.summary = {
    pass: report.checks.filter((c) => c.ok).length,
    fail: fails,
    shots: report.shots.length,
  };
  writeFileSync(resolve(OUT, "capture-report.json"), JSON.stringify(report, null, 2));
  console.log("\nCapture summary", report.summary);
  if (fails > 0) process.exitCode = 1;
} catch (err) {
  console.error(err);
  writeFileSync(
    resolve(OUT, "capture-report.json"),
    JSON.stringify({ ...report, fatal: String(err) }, null, 2),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
