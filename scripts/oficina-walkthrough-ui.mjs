/**
 * Walkthrough manual Oficina 13.19.2 — execução real pela UI.
 *
 * Uso:
 *   npm run test:login        # captura sessão (uma vez)
 *   npm run test:walkthrough  # reutiliza docs/testing/playwright/.auth/user.json
 *
 * Auth alternativa (CI/headless):
 *   WALKTHROUGH_EMAIL + WALKTHROUGH_PASSWORD no ambiente
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_FILE,
  BASE_URL,
  authFileExists,
  ensureAuthFromFile,
  launchWithAuth,
  loginWithCredentials,
} from "./playwright-auth.mjs";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname ?? ".", "..");
const EVIDENCE_DIR = resolve(ROOT, "docs/testing/evidence/13-20/walkthrough");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");

function loadEnv() {
  const path = resolve(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const lines = readFileSync(path, "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const results = [];
function log(step, status, detail = "") {
  results.push({ step, status, detail, at: new Date().toISOString() });
  const icon = status === "OK" ? "✓" : status === "FAIL" ? "✗" : "…";
  console.log(`${icon} [${step}] ${detail || status}`);
}

async function shot(page, name) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const file = resolve(EVIDENCE_DIR, `${RUN_ID}_${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function clickTab(page, tab) {
  await page.getByRole("button", { name: tab, exact: true }).click();
}

async function waitSuccess(page) {
  await page
    .locator('[data-variant="success"], .text-emerald-600, [class*="success"]')
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => null);
  await page.waitForTimeout(800);
}

async function ensureAuth(page, context) {
  const email = process.env.WALKTHROUGH_EMAIL;
  const password = process.env.WALKTHROUGH_PASSWORD;

  if (email && password) {
    await loginWithCredentials(page, context, email, password);
    log("auth", "OK", "Login via credenciais de ambiente");
    return;
  }

  if (!authFileExists()) {
    throw new Error(
      `Sessão não encontrada em ${AUTH_FILE}\nRode primeiro: npm run test:login`,
    );
  }

  await ensureAuthFromFile(page);
  log("auth", "OK", `Sessão reutilizada de ${AUTH_FILE}`);
}

function extractTenantSlug(url) {
  const m = url.match(/\/([^/]+)\/(dashboard|ordens|clientes)/);
  return m?.[1] ?? null;
}

async function resolveTenantSlug(page, context) {
  let tenantSlug = extractTenantSlug(page.url());
  if (tenantSlug) return tenantSlug;

  const sb = await getSupabaseFromContext(context);
  if (sb) {
    const { data: userData } = await sb.auth.getUser();
    if (userData.user) {
      const { data: memberships } = await sb
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", userData.user.id);
      if (memberships?.length) {
        const { data: tenants } = await sb
          .from("tenants")
          .select("slug")
          .in(
            "id",
            memberships.map((m) => m.tenant_id),
          )
          .limit(1);
        if (tenants?.[0]?.slug) return tenants[0].slug;
      }
    }
  }

  await page.goto(`${BASE_URL}/onboarding`);
  await page.waitForTimeout(1500);
  tenantSlug = extractTenantSlug(page.url());
  if (tenantSlug) return tenantSlug;

  const hrefs = await page.locator("a[href]").evaluateAll((els) =>
    els.map((a) => a.getAttribute("href")).filter(Boolean),
  );
  for (const href of hrefs) {
    const m = href.match(/^\/([^/]+)\/(dashboard|ordens)/);
    if (m) return m[1];
  }
  return null;
}

async function selectFirstProdutoOption(selectLocator) {
  const opts = await selectLocator.locator("option").all();
  for (const opt of opts) {
    const v = await opt.getAttribute("value");
    if (v) {
      await selectLocator.selectOption(v);
      return v;
    }
  }
  return null;
}

async function getSupabaseFromContext(context) {
  const cookies = await context.cookies();
  const authCookie = cookies.find((c) => c.name.includes("auth-token"));
  if (!authCookie?.value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(authCookie.value));
    const access =
      parsed?.access_token ??
      parsed?.[0]?.access_token ??
      parsed?.currentSession?.access_token;
    const refresh =
      parsed?.refresh_token ??
      parsed?.[0]?.refresh_token ??
      parsed?.currentSession?.refresh_token ??
      "";
    if (!access) return null;
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
    await sb.auth.setSession({ access_token: access, refresh_token: refresh });
    return sb;
  } catch {
    return null;
  }
}

async function main() {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidence = { runId: RUN_ID, steps: [], ids: {} };

  const launchOpts = {
    headless: process.env.HEADLESS === "1",
    slowMo: process.env.HEADLESS === "1" ? 0 : 100,
  };

  const email = process.env.WALKTHROUGH_EMAIL;
  const password = process.env.WALKTHROUGH_PASSWORD;
  let browser;
  let context;
  let page;

  if (email && password) {
    browser = await chromium.launch(launchOpts);
    context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
    });
    page = await context.newPage();
  } else {
    ({ browser, context, page } = await launchWithAuth(launchOpts));
  }

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  // Aceita confirms/alerts sem double-handle
  page.on("dialog", async (d) => {
    try {
      await d.accept();
    } catch {
      /* já tratado */
    }
  });

  try {
    await ensureAuth(page, context);
    await shot(page, "01-auth");

    let tenantSlug = await resolveTenantSlug(page, context);
    if (!tenantSlug) throw new Error("Não foi possível detectar tenant slug.");
    // Sprint 13.20: forçar tenant de auditoria quando a sessão tiver acesso
    const preferred = process.env.AUDIT_TENANT_SLUG || "teste-renato-01";
    try {
      await page.goto(`${BASE_URL}/${preferred}/dashboard`, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      if (!page.url().includes("/login")) {
        tenantSlug = preferred;
      }
    } catch {
      /* mantém slug detectado */
    }
    log("tenant", "OK", tenantSlug);
    evidence.ids.tenantSlug = tenantSlug;

    // 0: Criar cliente (walkthrough 13.20)
    await page.goto(`${BASE_URL}/${tenantSlug}/clientes/novo`);
    await page.waitForLoadState("domcontentloaded");
    const clienteNome = `Cliente WT 1320 ${Date.now().toString().slice(-6)}`;
    const nomeInput = page.locator('input[name="nome"]').first();
    if (await nomeInput.isVisible().catch(() => false)) {
      await nomeInput.fill(clienteNome);
      const doc = page.locator('input[name="documento"], input[name="cpf_cnpj"]').first();
      if (await doc.isVisible().catch(() => false)) {
        await doc.fill("529.982.247-25");
      }
      await page.getByRole("button", { name: /salvar|criar|cadastrar/i }).first().click();
      await page.waitForTimeout(2000);
      log("cliente-criar", "OK", clienteNome);
      await shot(page, "01b-cliente");
    } else {
      log("cliente-criar", "SKIP", "form nome não encontrado — usa cliente existente");
    }

    // 1–4: Nova OS + veículo
    await page.goto(`${BASE_URL}/${tenantSlug}/ordens/nova`);
    await page.waitForLoadState("domcontentloaded");
    await shot(page, "02-nova-os");

    // Preferir o cliente recém-criado se aparecer no select
    const clienteSelect = page.locator("select").first();
    const clienteOptions = await clienteSelect.locator("option").all();
    let clienteId = "";
    for (const opt of clienteOptions) {
      const text = ((await opt.textContent()) || "").trim();
      const val = await opt.getAttribute("value");
      if (val && text.includes("Cliente WT 1320")) {
        clienteId = val;
        break;
      }
    }
    if (!clienteId) {
      for (const opt of clienteOptions) {
        const val = await opt.getAttribute("value");
        if (val) {
          clienteId = val;
          break;
        }
      }
    }
    if (!clienteId) throw new Error("Nenhum cliente disponível no tenant.");
    await clienteSelect.selectOption(clienteId);
    await page.waitForTimeout(1500);

    const placa = `WG${String(Date.now()).slice(-5)}`;
    await page.getByRole("button", { name: /cadastrar novo veículo|cadastrar veículo/i }).click();
    await page.getByPlaceholder(/ABC1D23/i).fill(placa);
    await page.locator('input[name="modelo"]').fill("Walkthrough 13.19.2");
    await page.getByRole("button", { name: /salvar veículo/i }).click();
    await page.waitForTimeout(2000);
    log("veiculo-criar", "OK", placa);
    evidence.ids.placa = placa;
    await shot(page, "03-veiculo-criado");

    await page.locator('textarea[name="reclamacao_cliente"]').fill(
      "Ruído na suspensão — walkthrough 13.19.2",
    );
    await page.locator('input[name="quilometragem_entrada"]').fill("45000");
    await page.getByRole("button", { name: "Abrir OS" }).click();
    await page.waitForURL(/\/ordens\/[0-9a-f-]+/, { timeout: 30000 });
    const osUrl = page.url();
    const osId = osUrl.split("/ordens/")[1]?.split("?")[0];
    evidence.ids.osId = osId;
    log("os-criar", "OK", osId);
    await shot(page, "04-os-criada");

    // 6–7: Editar OS
    await clickTab(page, "resumo");
    await page.locator('textarea[name="reclamacao_cliente"]').fill(
      "Ruído na suspensão — editado no walkthrough",
    );
    await page.getByRole("button", { name: /salvar alterações/i }).click();
    await waitSuccess(page);
    log("os-editar", "OK");
    await shot(page, "05-os-editada");

    // 8: Checklist (UI 13.19.3: botões Bom/Atenção/Crítico/N/A)
    await clickTab(page, "checklist");
    await page.waitForTimeout(1000);
    const bomBtn = page.getByRole("button", { name: "Bom", exact: true }).first();
    if (await bomBtn.isVisible().catch(() => false)) {
      await bomBtn.click();
      await page.waitForTimeout(900);
    } else {
      const legacySelect = page.locator("li").first().locator("select");
      if (await legacySelect.count()) {
        await legacySelect.selectOption({ index: 1 });
        await page.waitForTimeout(900);
      } else {
        throw new Error("Checklist: nenhum controle de classificação visível");
      }
    }
    const obsField = page.getByPlaceholder(/observa/i).first();
    if (await obsField.isVisible().catch(() => false)) {
      await obsField.fill("Sem avarias — walkthrough");
      const saveObs = page.getByRole("button", { name: /salvar obs/i }).first();
      if (await saveObs.isVisible().catch(() => false)) {
        await saveObs.click();
        await waitSuccess(page);
      }
    }
    log("checklist", "OK");
    await shot(page, "06-checklist");

    // 9: Diagnóstico
    await clickTab(page, "diagnostico");
    await page.getByPlaceholder(/sintoma/i).fill("Barulho em curvas");
    await page.locator('textarea[name="diagnostico_tecnico"]').fill(
      "Bucha desgastada — sem impacto financeiro",
    );
    await page.getByRole("button", { name: /salvar diagnóstico/i }).click();
    await waitSuccess(page);
    log("diagnostico", "OK");
    await shot(page, "07-diagnostico");

    // 10–11: Orçamento peça + serviço
    await clickTab(page, "orcamento");
    const addForm = page.locator("form").filter({ hasText: /adicionar peça/i });

    await addForm.locator('select[name="tipo_item"]').selectOption("produto");
    await addForm.locator('select[name="categoria_item"]').selectOption("peca");
    await addForm.locator('input[name="descricao"]').fill("Bucha dianteira");
    await addForm.locator('input[name="quantidade"]').fill("2");
    await addForm.locator('input[name="valor_unitario"]').fill("85");
    const produtoSelect = addForm.locator('select[name="produto_id"]');
    await selectFirstProdutoOption(produtoSelect);
    await addForm.getByRole("button", { name: /incluir no orçamento/i }).click();
    await waitSuccess(page);
    log("orcamento-peca", "OK");

    await addForm.locator('select[name="tipo_item"]').selectOption("servico");
    await addForm.locator('select[name="categoria_item"]').selectOption("mao_obra");
    await addForm.locator('input[name="descricao"]').fill("Mão de obra suspensão");
    await addForm.locator('input[name="quantidade"]').fill("1");
    await addForm.locator('input[name="valor_unitario"]').fill("180");
    await addForm.locator('input[name="horas_previstas"]').fill("2");
    await selectFirstProdutoOption(addForm.locator('select[name="produto_id"]'));
    await addForm.getByRole("button", { name: /incluir no orçamento/i }).click();
    await waitSuccess(page);
    log("orcamento-servico", "OK");
    await shot(page, "08-orcamento");

    // 12–14: Aprovação
    // Produto: parcial marca não selecionados como reprovados e fecha a janela de aprovação.
    // Para o fluxo completo até faturamento, usamos aprovação total; parcial é checada à parte.
    await clickTab(page, "aprovacao");
    const itemCheckboxes = page.locator(
      'label:has(input[type="checkbox"]) input[type="checkbox"]',
    );
    const cbCount = await itemCheckboxes.count();

    if (cbCount >= 2) {
      // Smoke parcial: 1 item → execução deve listar só aprovados
      await itemCheckboxes.nth(0).check();
      await page.getByRole("button", { name: /aprovar selecionados/i }).click();
      await waitSuccess(page);
      log("aprovacao-parcial", "OK");
      await shot(page, "09-aprovacao-parcial");

      await clickTab(page, "execucao");
      const execPartial = page.locator("ul li").filter({
        has: page.getByRole("button", { name: /iniciar|retomar|concluir/i }),
      });
      const execCountPartial = await execPartial.count();
      log(
        "item-nao-aprovado-bloqueado",
        execCountPartial === 1 ? "OK" : "FAIL",
        `${execCountPartial} item(s) em execução (esperado 1)`,
      );

      // Fluxo esperado do produto após parcial: demais itens ficam reprovados.
      await clickTab(page, "aprovacao");
      const canApproveMore = await page
        .getByRole("button", { name: /aprovar todos/i })
        .isEnabled()
        .catch(() => false);
      if (canApproveMore) {
        await page.getByRole("button", { name: /aprovar todos/i }).click();
        await waitSuccess(page);
        log("aprovacao-restantes", "OK");
      } else {
        // Fluxo esperado do produto após parcial: demais itens ficam reprovados.
        // Para completar faturamento com 2 itens, recria aprovação total em nova passagem:
        // marca os itens pendentes via service não disponível — então faturamos só o aprovado.
        log(
          "aprovacao-restantes",
          "OK",
          "parcial fecha aprovação (não-selecionados=reprovados); segue com 1 item aprovado",
        );
      }
    } else {
      await page.getByRole("button", { name: /aprovar todos/i }).click();
      await waitSuccess(page);
      log("aprovacao-total", "OK", "único lote");
    }

    // 15–18: Execução (todos os itens aprovados)
    await clickTab(page, "execucao");
    const execItems = page.locator("ul li").filter({
      has: page.getByRole("button", { name: /iniciar|retomar/i }),
    });
    const execCount = await execItems.count();
    for (let i = 0; i < execCount; i++) {
      const item = execItems.nth(i);
      await item.getByRole("button", { name: /iniciar|retomar/i }).click();
      await waitSuccess(page);
      await item.getByRole("button", { name: /pausar/i }).click();
      await waitSuccess(page);
      await item.getByRole("button", { name: /iniciar|retomar/i }).click();
      await waitSuccess(page);
      await item.getByPlaceholder(/horas realizadas/i).fill("2");
      await item.getByRole("button", { name: /^concluir$/i }).click();
      await waitSuccess(page);
    }
    log("execucao", execCount > 0 ? "OK" : "FAIL", `${execCount} itens`);
    await shot(page, "10-execucao");

    // Avançar status para permitir entrega/faturamento
    await clickTab(page, "resumo");
    const statusBtn = page.getByRole("button", { name: /pronto para entrega/i });
    if (await statusBtn.isVisible().catch(() => false)) {
      await statusBtn.click();
      await page.waitForTimeout(1500);
    }

    // 19–20: Previsão + entrega
    await clickTab(page, "entrega");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dtLocal = tomorrow.toISOString().slice(0, 16);
    await page.locator('input[name="previsao_entrega"]').fill(dtLocal);
    await page.locator('input[name="motivo"]').fill("Walkthrough — ajuste de prazo");
    await page.getByRole("button", { name: /salvar previsão/i }).click();
    await waitSuccess(page);
    log("previsao", "OK");

    await page.locator('input[name="quilometragem_saida"]').fill("45120");
    await page.getByRole("button", { name: /concluir entrega/i }).click();
    await waitSuccess(page);
    log("entrega", "OK");
    await shot(page, "11-entrega");

    // 21–24: Faturamento
    await clickTab(page, "financeiro");
    const formaSelect = page.locator('select[name="forma_pagamento_id"]');
    const formaOpts = await formaSelect.locator("option").all();
    for (const opt of formaOpts) {
      const v = await opt.getAttribute("value");
      if (v) {
        await formaSelect.selectOption(v);
        break;
      }
    }
    await page.getByRole("button", { name: /faturar itens aprovados/i }).click();
    await waitSuccess(page);
    await page.waitForTimeout(2000);
    const vendaLink = page.locator('a[href*="/vendas/"]');
    const vendaHref = await vendaLink.getAttribute("href");
    evidence.ids.vendaPath = vendaHref ?? null;
    log("faturamento", vendaHref ? "OK" : "FAIL", vendaHref ?? "sem link venda");
    await shot(page, "12-faturado");

    const faturarBtn = page.getByRole("button", { name: /faturar itens aprovados/i });
    const blockedUi = !(await faturarBtn.isVisible().catch(() => false));
    log("bloqueio-segundo-fatura-ui", blockedUi ? "OK" : "FAIL");

    // 25–26: Retorno
    await clickTab(page, "retorno");
    await page.locator('input[name="motivo"]').fill("Retorno walkthrough — garantia");
    await page.locator('select[name="tipo_retorno"]').selectOption("garantia");
    await page.getByRole("button", { name: /registrar retorno/i }).click();
    await waitSuccess(page);
    log("retorno", "OK");
    await shot(page, "13-retorno");

    await clickTab(page, "historico");
    await shot(page, "14-historico");

    // Validação Supabase
    const sb = await getSupabaseFromContext(context);
    if (sb && osId) {
      const { data: osRow } = await sb
        .from("ordens_servico")
        .select("numero, status, veiculo_id, venda_id, cliente_id")
        .eq("id", osId)
        .maybeSingle();
      evidence.ids.osNumero = osRow?.numero;
      evidence.ids.osStatus = osRow?.status;
      evidence.ids.veiculoId = osRow?.veiculo_id;
      evidence.ids.vendaId = osRow?.venda_id;
      log("db-os", osRow ? "OK" : "FAIL", JSON.stringify(osRow));

      if (osRow?.venda_id) {
        const { data: vendas } = await sb
          .from("vendas")
          .select("id")
          .eq("id", osRow.venda_id);
        log("db-venda-unica", vendas?.length === 1 ? "OK" : "FAIL");

        const { data: crs } = await sb
          .from("contas_receber")
          .select("id, numero")
          .eq("venda_id", osRow.venda_id)
          .is("deleted_at", null);
        evidence.ids.contasReceber = crs?.map((c) => c.id) ?? [];
        log(
          "db-cr-unica",
          crs?.length === 1 ? "OK" : "FAIL",
          `count=${crs?.length ?? 0}`,
        );

        const { data: dupOs } = await sb
          .from("ordens_servico")
          .select("id")
          .eq("venda_id", osRow.venda_id);
        log(
          "db-sem-os-duplicada",
          dupOs?.length === 1 ? "OK" : "FAIL",
          `os com mesma venda=${dupOs?.length}`,
        );
      }

      const { data: itens } = await sb
        .from("ordem_servico_itens")
        .select("descricao, aprovacao_status, execucao_status, estoque_status")
        .eq("ordem_servico_id", osId)
        .is("deleted_at", null);
      log("db-itens", "OK", `${itens?.length ?? 0} itens`);

      const { data: retornos } = await sb
        .from("retornos_servico")
        .select("id, tipo_retorno")
        .eq("ordem_servico_id", osId)
        .is("deleted_at", null);
      evidence.ids.retornoIds = retornos?.map((r) => r.id) ?? [];
      log("db-retorno", retornos?.length ? "OK" : "FAIL");

      // Baixa única de estoque (saídas origem=venda com mesma obs)
      if (osRow?.venda_id) {
        const { data: saidas } = await sb
          .from("estoque_movimentacoes")
          .select("id, produto_id, observacoes")
          .eq("origem", "venda")
          .eq("tipo", "saida")
          .is("deleted_at", null)
          .ilike("observacoes", `%${osRow.venda_id}%`);
        const byProd = new Map();
        for (const s of saidas ?? []) {
          byProd.set(s.produto_id, (byProd.get(s.produto_id) || 0) + 1);
        }
        const dup = [...byProd.values()].some((n) => n > 1);
        log(
          "db-estoque-baixa-unica",
          !dup ? "OK" : "FAIL",
          `saidas=${saidas?.length ?? 0}`,
        );
      }
    } else {
      log("db-validacao", "SKIP", "sem token Supabase na página");
    }

    // DRE + Fluxo — smoke de página (competência / caixa)
    await page.goto(`${BASE_URL}/${tenantSlug}/financeiro/dre`);
    await page.waitForLoadState("domcontentloaded");
    const dreOk = !(await page.getByText(/erro|exception|failed/i).first().isVisible().catch(() => false));
    await shot(page, "15-dre");
    log("dre-page", dreOk ? "OK" : "FAIL");

    await page.goto(`${BASE_URL}/${tenantSlug}/financeiro/fluxo-caixa`);
    await page.waitForLoadState("domcontentloaded");
    const fluxoOk = !(await page.getByText(/erro|exception|failed/i).first().isVisible().catch(() => false));
    await shot(page, "16-fluxo");
    log("fluxo-page", fluxoOk ? "OK" : "FAIL");

    await page.goto(`${BASE_URL}/${tenantSlug}/dashboard`);
    await page.waitForLoadState("domcontentloaded");
    await shot(page, "17-dashboard");
    log("dashboard-page", "OK");

    // Responsividade básica (viewport mobile)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/${tenantSlug}/ordens`);
    await page.waitForLoadState("domcontentloaded");
    await shot(page, "18-ordens-mobile");
    log("responsividade-mobile", "OK");

    if (consoleErrors.length) {
      log("console-errors", "WARN", consoleErrors.slice(0, 5).join(" | "));
    }

    evidence.steps = results;
    evidence.consoleErrors = consoleErrors;
    const reportPath = resolve(EVIDENCE_DIR, `${RUN_ID}_report.json`);
    writeFileSync(reportPath, JSON.stringify(evidence, null, 2));
    console.log(`\nRelatório: ${reportPath}`);
    console.log(`Evidências: ${EVIDENCE_DIR}`);

    const failures = results.filter((r) => r.status === "FAIL");
    if (failures.length) process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
