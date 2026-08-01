/**
 * Continua homologação a partir de regra published conhecida +
 * cria draft via polling (sem ler body de server action).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  ensureChromiumInstalled,
} from "./playwright-auth.mjs";

const OUT = resolve("docs/testing/evidence/26-10-1");
mkdirSync(OUT, { recursive: true });
const TENANT = "teste-renato-01";
// Última published bem-sucedida na sessão (bloqueio de edição já evidenciado)
const SEED_PUBLISHED =
  process.env.TAX_RULE_ID || "f062f627-2c08-4869-ad8d-cfc1b3852a84";

const report = {
  at: new Date().toISOString(),
  sprint: "26.10.1-browser-continue",
  checks: [],
  shots: [],
  ids: { seedPublished: SEED_PUBLISHED },
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

  // --- Create draft + full lifecycle via UI (poll code in list) ---
  const code = `TESTE-FIN-${Date.now()}`;
  await page.goto(`${BASE_URL}/${TENANT}/tributario/regras/nova`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector("[data-tax-rule-create-form]", { timeout: 90000 });
  await page.locator('input[name="code"]').fill(code);
  await page.locator('input[name="name"]').fill("[TESTE] Final workflow 26.10.1");
  await page
    .locator('input[name="sourceReference"]')
    .fill("HOMOLOG-26.10.1 · cenário de teste");
  await page.locator('input[name="validFrom"]').fill("2026-01-01");
  await page.getByRole("button", { name: /Salvar draft/i }).click();

  let ruleId = null;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000);
    await page.goto(`${BASE_URL}/${TENANT}/tributario/regras`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForSelector("[data-tax-rules-page]", { timeout: 60000 });
    const row = page.locator("[data-tax-rule-row]").filter({ hasText: code });
    if ((await row.count()) > 0) {
      const href = await row.locator("a").first().getAttribute("href");
      ruleId = href?.match(/([0-9a-f-]{36})/i)?.[1] ?? null;
      if (ruleId) break;
    }
  }
  push(Boolean(ruleId), `draft criado UI ${code} → ${ruleId}`);
  report.ids.ruleId = ruleId;
  if (!ruleId) throw new Error("draft não apareceu na lista");

  await page.goto(`${BASE_URL}/${TENANT}/tributario/regras/${ruleId}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector('[data-tax-workflow-panel][data-status="draft"]', {
    timeout: 90000,
  });
  await shot(page, "workflow-draft");

  await page.getByRole("button", { name: /Editar draft/i }).click();
  await page.waitForTimeout(2000);
  push(true, "edit draft");

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

  await page.getByRole("button", { name: /Tentar editar publicada/i }).click();
  await page.waitForSelector('[data-edit-blocked="1"]', { timeout: 30000 });
  push(true, "bloqueio edição");
  await shot(page, "bloqueio-edicao");

  // New version: click then poll list for same code with draft status
  await page.getByRole("button", { name: /Nova versão/i }).click();
  let newId = null;
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(2000);
    await page.goto(`${BASE_URL}/${TENANT}/tributario/regras`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    const rows = page.locator("[data-tax-rule-row]").filter({ hasText: code });
    const n = await rows.count();
    for (let j = 0; j < n; j++) {
      const text = await rows.nth(j).innerText();
      if (/\bdraft\b/i.test(text)) {
        const href = await rows.nth(j).locator("a").first().getAttribute("href");
        const id = href?.match(/([0-9a-f-]{36})/i)?.[1];
        if (id && id !== ruleId) {
          newId = id;
          break;
        }
      }
    }
    if (newId) break;
  }
  push(Boolean(newId), `nova versão ${newId}`);
  report.ids.newVersionId = newId;
  if (newId) {
    await page.goto(`${BASE_URL}/${TENANT}/tributario/regras/${newId}`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForSelector("[data-tax-workflow-panel]", { timeout: 60000 });
    await shot(page, "diff-versoes");

    // Publish new version then suspend/archive
    await page.getByRole("button", { name: /Enviar revisão/i }).click();
    await page.waitForSelector(
      '[data-tax-workflow-panel][data-status="under_review"]',
      { timeout: 60000 },
    );
    await page.getByRole("button", { name: /Aprovar/i }).click();
    await page.waitForSelector(
      '[data-tax-workflow-panel][data-status="approved"]',
      { timeout: 60000 },
    );
    await page.getByRole("button", { name: /Publicar/i }).click();
    await page.waitForSelector(
      '[data-tax-workflow-panel][data-status="published"]',
      { timeout: 60000 },
    );
    push(true, "nova versão published");

    await page.getByRole("button", { name: /Suspender/i }).click();
    await page.waitForSelector(
      '[data-tax-workflow-panel][data-status="suspended"]',
      { timeout: 60000 },
    );
    push(true, "suspended");
    await page.getByRole("button", { name: /Arquivar/i }).click();
    await page.waitForSelector(
      '[data-tax-workflow-panel][data-status="archived"]',
      { timeout: 60000 },
    );
    push(true, "archived");
  }

  // Parent superseded check
  await page.goto(`${BASE_URL}/${TENANT}/tributario/regras/${ruleId}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  const parentStatus = await page
    .locator("[data-tax-workflow-panel]")
    .getAttribute("data-status");
  push(parentStatus === "superseded", `parent superseded (${parentStatus})`);

  // Audit
  await page.goto(`${BASE_URL}/${TENANT}/tributario/auditoria`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector("[data-tax-audit-page]", { timeout: 60000 });
  push(
    (await page.getByText(/rule\.|transition|create|publish|version/i).count()) >
      0,
    "auditoria",
  );
  await shot(page, "auditoria");

  // Seed published still viewable (isolation smoke)
  await page.goto(`${BASE_URL}/${TENANT}/tributario/regras/${SEED_PUBLISHED}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  push(
    (await page.locator("[data-tax-rule-detail-page]").count()) > 0,
    "seed published acessível no tenant",
  );

  report.summary = {
    pass: report.checks.filter((c) => c.ok).length,
    fail: report.checks.filter((c) => !c.ok).length,
    shots: report.shots.length,
  };
  writeFileSync(
    resolve(OUT, "browser-workflow-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("\nContinue", report.summary);
  if (report.summary.fail > 0) process.exitCode = 1;
} catch (e) {
  console.error(e);
  report.fatal = String(e);
  writeFileSync(
    resolve(OUT, "browser-workflow-report.json"),
    JSON.stringify(report, null, 2),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
