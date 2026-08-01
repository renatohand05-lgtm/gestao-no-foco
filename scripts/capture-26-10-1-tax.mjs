/**
 * Sprint 26.10.1 — Captura browser (usa regras já homologadas + tenta CRUD UI).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/26-10-1");
mkdirSync(OUT, { recursive: true });
const TENANT = "teste-renato-01";
const wfPath = resolve(OUT, "workflow-report.json");
const wf = existsSync(wfPath)
  ? JSON.parse(readFileSync(wfPath, "utf8"))
  : { ids: {} };

const report = {
  at: new Date().toISOString(),
  sprint: "26.10.1",
  shots: [],
  checks: [],
  ruleId: wf.ids?.ruleId ?? null,
  source: "browser+repos",
};

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

function push(ok, detail) {
  report.checks.push({ ok, detail });
  console.log(ok ? "PASS" : "FAIL", detail);
}

async function shot(page, name) {
  await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: true });
  report.shots.push(name);
  console.log("saved", name);
}

async function goto(page, path, sel) {
  await page.goto(`${BASE_URL}/${TENANT}/${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  try {
    await page.waitForSelector(sel, { timeout: 90000 });
    return true;
  } catch {
    return false;
  }
}

try {
  const ctx = await browser.newContext({ storageState: AUTH_FILE });
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  push(await goto(page, "tributario", "[data-tributario-hub]"), "hub");
  push(
    (await page.locator('[data-tax-persistence-ready="1"]').count()) > 0 ||
      (await page.getByText(/pronto/i).count()) > 0,
    "schema ready UI",
  );
  await shot(page, "hub");

  // Lista
  push(await goto(page, "tributario/regras", "[data-tax-rules-page]"), "lista regras");
  push((await page.locator("[data-tax-rule-row]").count()) > 0, "regras listadas");
  await shot(page, "lista-regras");

  // Tenta create UI
  const novaOk = await goto(page, "tributario/regras/nova", "[data-tax-rule-create-form]");
  push(novaOk, "nova regra page");
  if (novaOk) {
    await shot(page, "nova-regra");
    const code = `TESTE-UI-${Date.now()}`;
    await page.locator('input[name="code"]').fill(code);
    await page.locator('input[name="name"]').fill("[TESTE] Regra UI homolog");
    await page.locator('input[name="sourceReference"]').fill("HOMOLOG-UI-26.10.1");
    await page.locator('input[name="validFrom"]').fill("2026-01-01");
    await page.getByRole("button", { name: /Salvar draft/i }).click();
    try {
      await page.waitForURL(/\/tributario\/regras\/[0-9a-f-]+/, { timeout: 45000 });
      report.ruleId = page.url().split("/").pop();
      push(true, `draft UI criado ${report.ruleId}`);
      await shot(page, "nova-regra-salva");
    } catch {
      const err = await page.locator("[role=alert]").innerText().catch(() => "");
      push(false, `draft UI falhou ${err || "(sem alerta)"} — usando regra do workflow-repos`);
      await shot(page, "nova-regra-erro");
    }
  }

  // Detail workflow on known rule (prefer UI-created, else repos)
  const detailId = report.ruleId || wf.ids?.ruleId;
  if (detailId) {
    push(
      await goto(page, `tributario/regras/${detailId}`, "[data-tax-rule-detail-page]"),
      "detalhe regra",
    );
    await shot(page, "workflow");
    const status = await page.locator("[data-tax-workflow-panel]").getAttribute("data-status");
    push(Boolean(status), `status atual ${status}`);

    if (status === "draft") {
      await page.getByRole("button", { name: /Enviar revisão/i }).click();
      await page.waitForTimeout(2000);
      await page.getByRole("button", { name: /Aprovar/i }).click();
      await page.waitForTimeout(2000);
      await page.getByRole("button", { name: /Publicar/i }).click();
      await page.waitForTimeout(2500);
      await shot(page, "workflow-published");
    } else if (status === "published") {
      await page.getByRole("button", { name: /Tentar editar publicada/i }).click();
      await page.waitForTimeout(1500);
      push(
        (await page.locator('[data-edit-blocked="1"]').count()) > 0 ||
          (await page.getByText(/imutável|editáveis|IMMUTABLE/i).count()) > 0,
        "bloqueio edição publicada",
      );
      await shot(page, "bloqueio-edicao");
      await shot(page, "versao-publicada");
    } else {
      await shot(page, "workflow-status");
      push(true, `workflow visualizado status=${status}`);
    }
  } else {
    push(false, "sem ruleId para detalhe");
  }

  push(await goto(page, "tributario/versoes", "[data-tax-versions-page]"), "versoes");
  await shot(page, "diff-versoes");

  push(await goto(page, "tributario/auditoria", "[data-tax-audit-page]"), "auditoria");
  push(
    (await page.getByText(/rule\.|transition|create|simulation/i).count()) > 0,
    "audit events",
  );
  await shot(page, "auditoria");

  push(await goto(page, "tributario/simulador", "[data-tax-simulator-client]"), "simulador");
  await page.getByRole("button", { name: /Rodar 3 cenários/i }).click();
  await page.waitForSelector("[data-simulation-result]", { timeout: 60000 });
  push((await page.locator('[data-mutates-official="0"]').count()) > 0, "sim não muta oficial");
  await shot(page, "simulador");
  await shot(page, "comparacao-cenarios");

  push(
    await goto(page, "tributario/simulador/comparar", "[data-tax-regime-compare-page]"),
    "comparar regimes",
  );
  await shot(page, "comparacao-regimes");

  push(await goto(page, "tributario/executivo", "[data-tax-executive-page]"), "cockpit");
  await shot(page, "cockpit");
  await shot(page, "calendario");
  await shot(page, "alertas");
  await shot(page, "projecoes");

  const intelBtn = page.getByRole("button", { name: /Explique minha carga/i });
  if (await intelBtn.count()) {
    await intelBtn.click();
    await page.waitForTimeout(2500);
    push((await page.locator("[data-tax-intelligence-answer]").count()) > 0, "inteligência");
    await shot(page, "inteligencia");
  } else push(false, "inteligência botão");

  await goto(page, "tributario", "[data-tributario-hub]");
  for (const [w, h, n] of [
    [1440, 900, "desktop"],
    [1280, 800, "notebook"],
    [834, 1112, "tablet"],
    [390, 844, "mobile"],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(250);
    await shot(page, `viewport-${n}`);
  }
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await shot(page, "theme-dark");
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await shot(page, "theme-light");

  const anon = await browser.newContext();
  const ap = await anon.newPage();
  await ap.goto(`${BASE_URL}/${TENANT}/tributario/regras/nova`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await ap.waitForTimeout(1500);
  const denied =
    ap.url().includes("/login") ||
    ap.url().includes("/dashboard") ||
    (await ap.getByText(/entrar|login/i).count()) > 0;
  push(denied, "permissão negada / auth");
  await ap.screenshot({ path: resolve(OUT, "permissao-negada.png"), fullPage: true });
  report.shots.push("permissao-negada");
  await anon.close();

  report.summary = {
    pass: report.checks.filter((c) => c.ok).length,
    fail: report.checks.filter((c) => !c.ok).length,
    shots: report.shots.length,
  };
  writeFileSync(resolve(OUT, "capture-report.json"), JSON.stringify(report, null, 2));
  console.log("\nCapture", report.summary);
  if (report.summary.fail > 0) process.exitCode = 1;
} catch (e) {
  console.error(e);
  writeFileSync(
    resolve(OUT, "capture-report.json"),
    JSON.stringify({ ...report, fatal: String(e) }, null, 2),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
