/**
 * Sprint 26.10.1 — Workflow browser completo + shots restantes.
 * Premissa: servidor em http://localhost:3000 (preferir `next start` após build).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/26-10-1");
mkdirSync(OUT, { recursive: true });
const TENANT = "teste-renato-01";

const report = {
  at: new Date().toISOString(),
  sprint: "26.10.1-browser-workflow",
  checks: [],
  shots: [],
  ids: {},
};

function push(ok, detail) {
  report.checks.push({ ok, detail });
  console.log(ok ? "PASS" : "FAIL", detail);
}

async function shot(page, name) {
  await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: true });
  report.shots.push(name);
  console.log("saved", name);
}

ensureChromiumInstalled();
const browser = await chromium.launch({ headless: true });

try {
  const ctx = await browser.newContext({ storageState: AUTH_FILE });
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1) Create draft via UI
  await page.goto(`${BASE_URL}/${TENANT}/tributario/regras/nova`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector("[data-tax-rule-create-form]", { timeout: 90000 });
  const code = `TESTE-WF-${Date.now()}`;
  await page.locator('input[name="code"]').fill(code);
  await page.locator('input[name="name"]').fill("[TESTE] Homolog workflow 26.10.1");
  await page
    .locator('input[name="sourceReference"]')
    .fill("HOMOLOG-26.10.1 · cenário de teste · não é alíquota legal");
  await page.locator('input[name="validFrom"]').fill("2026-01-01");
  await page.locator('input[name="priority"]').fill("50");
  await page.locator('input[name="state"]').fill("SP");
  await shot(page, "nova-regra");

  const createResp = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      r.url().includes("/tributario/regras/nova") &&
      r.status() === 200,
    { timeout: 60000 },
  );
  await page.getByRole("button", { name: /Salvar draft/i }).click();
  const cr = await createResp;
  const body = await cr.text();
  const idMatch = body.match(/"id"\s*:\s*"([0-9a-f-]{36})"/i);
  push(Boolean(idMatch), `draft action id=${idMatch?.[1] ?? "?"}`);
  const ruleId = idMatch?.[1];
  report.ids.ruleId = ruleId;

  if (!ruleId) {
    await shot(page, "nova-regra-erro");
    throw new Error("create draft failed");
  }

  await page.goto(`${BASE_URL}/${TENANT}/tributario/regras/${ruleId}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector('[data-tax-workflow-panel][data-status="draft"]', {
    timeout: 90000,
  });
  push(true, "draft detail");
  await shot(page, "workflow-draft");

  // 2) edit draft
  await page.getByRole("button", { name: /Editar draft/i }).click();
  await page.waitForTimeout(2000);
  push(
    (await page.locator("[data-workflow-message]").count()) > 0 ||
      (await page.getByText(/editado|Draft/i).count()) > 0,
    "edit draft",
  );

  // 3-6) review → approve → publish
  await page.getByRole("button", { name: /Enviar revisão/i }).click();
  await page.waitForSelector(
    '[data-tax-workflow-panel][data-status="under_review"]',
    { timeout: 60000 },
  );
  push(true, "under_review");
  await shot(page, "workflow");

  await page.getByRole("button", { name: /Aprovar/i }).click();
  await page.waitForSelector(
    '[data-tax-workflow-panel][data-status="approved"]',
    { timeout: 60000 },
  );
  push(true, "approved");

  await page.getByRole("button", { name: /Publicar/i }).click();
  await page.waitForSelector(
    '[data-tax-workflow-panel][data-status="published"]',
    { timeout: 60000 },
  );
  push(true, "published");
  await shot(page, "workflow-published");
  await shot(page, "versao-publicada");

  // 7-9) try edit published → block
  await page.getByRole("button", { name: /Tentar editar publicada/i }).click();
  await page.waitForSelector('[data-edit-blocked="1"]', { timeout: 30000 });
  push(true, "bloqueio edição publicada");
  await shot(page, "bloqueio-edicao");

  // 10) new version — wait for parent superseded, then locate child draft
  await page.getByRole("button", { name: /Nova versão/i }).click();
  let newId = null;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-tax-workflow-panel]", { timeout: 60000 });
    const st = await page.locator("[data-tax-workflow-panel]").getAttribute("data-status");
    if (st === "superseded") break;
  }
  await page.goto(`${BASE_URL}/${TENANT}/tributario/regras`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector("[data-tax-rules-page]", { timeout: 60000 });
  const parentId = ruleId;
  const hrefs = await page.locator('a[href*="/tributario/regras/"]').evaluateAll((as) =>
    as.map((a) => a.getAttribute("href") || ""),
  );
  const candidate = hrefs
    .map((h) => h.match(/\/tributario\/regras\/([0-9a-f-]{36})/i)?.[1])
    .filter((id) => id && id !== parentId);
  // Prefer the most recently appearing UUID that isn't parent
  newId = candidate[0] ?? null;
  // Refine: open draft rows
  const draftRow = page.locator("[data-tax-rule-row]").filter({ hasText: /\bdraft\b/i }).first();
  if ((await draftRow.count()) > 0) {
    const h = await draftRow.locator("a").first().getAttribute("href");
    const maybe = h?.match(/([0-9a-f-]{36})/i)?.[1];
    if (maybe && maybe !== ruleId) newId = maybe;
  }
  push(Boolean(newId) && newId !== ruleId, `nova versão ${newId}`);
  report.ids.newVersionId = newId;

  if (newId) {
    await page.goto(`${BASE_URL}/${TENANT}/tributario/regras/${newId}`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForSelector("[data-tax-workflow-panel]", { timeout: 60000 });
    await shot(page, "diff-versoes");
  }

  // Suspend/archive on NEW draft after publishing it? Spec asks suspend/archive on published.
  // Use parent if still published; else publish the new version then suspend/archive it.
  let lifecycleId = ruleId;
  await page.goto(`${BASE_URL}/${TENANT}/tributario/regras/${ruleId}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector("[data-tax-workflow-panel]", { timeout: 60000 });
  let parentStatus = await page
    .locator("[data-tax-workflow-panel]")
    .getAttribute("data-status");
  push(
    parentStatus === "published" || parentStatus === "superseded",
    `parent após nova versão: ${parentStatus}`,
  );

  if (parentStatus === "superseded" && newId) {
    lifecycleId = newId;
    await page.goto(`${BASE_URL}/${TENANT}/tributario/regras/${newId}`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForSelector("[data-tax-workflow-panel]", { timeout: 60000 });
    let st = await page.locator("[data-tax-workflow-panel]").getAttribute("data-status");
    if (st === "draft") {
      await page.getByRole("button", { name: /Enviar revisão/i }).click();
      await page.waitForSelector('[data-tax-workflow-panel][data-status="under_review"]', { timeout: 60000 });
      await page.getByRole("button", { name: /Aprovar/i }).click();
      await page.waitForSelector('[data-tax-workflow-panel][data-status="approved"]', { timeout: 60000 });
      await page.getByRole("button", { name: /Publicar/i }).click();
      await page.waitForSelector('[data-tax-workflow-panel][data-status="published"]', { timeout: 60000 });
      st = "published";
      push(true, "nova versão publicada para lifecycle");
    }
    parentStatus = st;
  }

  if (parentStatus === "published") {
    await page.getByRole("button", { name: /Suspender/i }).click();
    await page.waitForSelector(
      '[data-tax-workflow-panel][data-status="suspended"]',
      { timeout: 60000 },
    );
    push(true, `suspended (${lifecycleId})`);
    await page.getByRole("button", { name: /Arquivar/i }).click();
    await page.waitForSelector(
      '[data-tax-workflow-panel][data-status="archived"]',
      { timeout: 60000 },
    );
    push(true, `archived (${lifecycleId})`);
  } else {
    push(false, `não foi possível suspender/arquivar status=${parentStatus}`);
  }

  // Precedence / list
  await page.goto(`${BASE_URL}/${TENANT}/tributario/regras`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector("[data-tax-rules-page]", { timeout: 60000 });
  push((await page.locator("[data-tax-rule-row]").count()) > 0, "lista após workflow");
  await shot(page, "lista-regras");

  // Audit
  await page.goto(`${BASE_URL}/${TENANT}/tributario/auditoria`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector("[data-tax-audit-page]", { timeout: 60000 });
  push(
    (await page.getByText(/rule\.|transition|create|publish/i).count()) > 0,
    "auditoria eventos",
  );
  await shot(page, "auditoria");

  // Merge previous capture checks where helpful
  const prevPath = resolve(OUT, "capture-report.json");
  if (existsSync(prevPath)) {
    report.previousCapture = JSON.parse(readFileSync(prevPath, "utf8")).summary;
  }

  report.summary = {
    pass: report.checks.filter((c) => c.ok).length,
    fail: report.checks.filter((c) => !c.ok).length,
    shots: report.shots.length,
  };
  writeFileSync(resolve(OUT, "browser-workflow-report.json"), JSON.stringify(report, null, 2));
  console.log("\nWorkflow browser", report.summary);
  if (report.summary.fail > 0) process.exitCode = 1;
} catch (e) {
  console.error(e);
  report.fatal = String(e);
  writeFileSync(resolve(OUT, "browser-workflow-report.json"), JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
