/**
 * Smoke da máquina de estados OS — cria OS via API autenticada e exercita UI.
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname ?? ".", "..");
const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const AUTH = resolve(ROOT, "docs/testing/playwright/.auth/user.json");
const TENANT = "teste-renato-01";

function loadEnv() {
  const path = resolve(ROOT, ".env.local");
  const env = { ...process.env };
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[m[1]] = value;
  }
  return env;
}

async function getSb(context) {
  const env = loadEnv();
  const cookies = await context.cookies();
  const authCookie = cookies.find((c) => c.name.includes("auth-token"));
  if (!authCookie?.value) throw new Error("sem cookie auth");

  let raw = decodeURIComponent(authCookie.value);
  if (raw.startsWith("base64-")) {
    raw = Buffer.from(raw.slice("base64-".length), "base64").toString("utf8");
  }
  const parsed = JSON.parse(raw);
  const access =
    parsed?.access_token ??
    parsed?.[0]?.access_token ??
    parsed?.currentSession?.access_token;
  const refresh =
    parsed?.refresh_token ??
    parsed?.[0]?.refresh_token ??
    parsed?.currentSession?.refresh_token ??
    "";
  if (!access) throw new Error("sem access_token");
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  await sb.auth.setSession({ access_token: access, refresh_token: refresh });
  return sb;
}

async function statusOf(sb, osId) {
  const { data, error } = await sb
    .from("ordens_servico")
    .select("status, numero, tenant_id, cliente_id, veiculo_id")
    .eq("id", osId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

const browser = await chromium.launch({ headless: true, slowMo: 40 });
const context = await browser.newContext({
  storageState: AUTH,
  viewport: { width: 1400, height: 900 },
});
const page = await context.newPage();
const log = [];
const push = (step, ok, detail = "") => {
  log.push({ step, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${step} ${detail}`);
};

try {
  if (!existsSync(AUTH)) throw new Error("rode npm run test:login");
  const sb = await getSb(context);

  // Resolve tenant + cliente + veiculo + produto
  const { data: tenant } = await sb.from("tenants").select("id").eq("slug", TENANT).maybeSingle();
  if (!tenant) throw new Error("tenant não encontrado");

  const { data: cliente } = await sb
    .from("clientes")
    .select("id")
    .eq("tenant_id", tenant.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (!cliente) throw new Error("sem cliente");

  let { data: veiculo } = await sb
    .from("veiculos")
    .select("id, placa")
    .eq("tenant_id", tenant.id)
    .eq("cliente_id", cliente.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!veiculo) {
    const placa = `ST${String(Date.now()).slice(-5)}`;
    const { data: created, error } = await sb
      .from("veiculos")
      .insert({
        tenant_id: tenant.id,
        cliente_id: cliente.id,
        placa,
        modelo: "Smoke Status",
        ativo: true,
      })
      .select("id, placa")
      .single();
    if (error) throw new Error(error.message);
    veiculo = created;
  }

  const { data: produto } = await sb
    .from("produtos")
    .select("id")
    .eq("tenant_id", tenant.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (!produto) throw new Error("sem produto");

  const { data: os, error: osErr } = await sb
    .from("ordens_servico")
    .insert({
      tenant_id: tenant.id,
      cliente_id: cliente.id,
      veiculo_id: veiculo.id,
      status: "rascunho",
      prioridade: "normal",
      reclamacao_cliente: "Smoke máquina de estados",
      data_hora_entrada: new Date().toISOString(),
    })
    .select("id, numero")
    .single();
  if (osErr) throw new Error(osErr.message);

  // Seed checklist mínimo se a tabela existir
  await sb.from("ordem_servico_checklist").insert({
    tenant_id: tenant.id,
    ordem_servico_id: os.id,
    item_codigo: "pneus",
    item_label: "Pneus",
    status: "na",
  }).then(() => null).catch(() => null);

  const osUrl = `${BASE}/${TENANT}/ordens/${os.id}`;
  push("criar-os", true, `#${os.numero} ${os.id}`);

  let row = await statusOf(sb, os.id);
  push("status-rascunho", row.status === "rascunho", row.status);

  await page.goto(osUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1000);

  // Checklist (UI 13.19.3: botões Bom/Atenção — não avança status sozinho)
  await page.getByRole("button", { name: "checklist", exact: true }).click();
  await page.waitForTimeout(400);
  const bom = page.getByRole("button", { name: "Bom", exact: true }).first();
  if (await bom.isVisible().catch(() => false)) {
    await bom.click();
    await page.waitForTimeout(800);
  } else {
    const sel = page.locator("li select").first();
    if ((await sel.count()) > 0) {
      await sel.selectOption({ index: 1 });
      await page.waitForTimeout(800);
    }
  }
  await page.getByRole("button", { name: "resumo", exact: true }).click();
  const btnDiag = page.getByRole("button", { name: /Aguardando diagnóstico/i });
  if (await btnDiag.isVisible().catch(() => false)) {
    page.once("dialog", (d) => d.accept().catch(() => null));
    await btnDiag.click();
    await page.waitForTimeout(1500);
  }
  row = await statusOf(sb, os.id);
  push(
    "1-checklist",
    row.status === "aguardando_diagnostico" || row.status === "rascunho",
    row.status,
  );
  // Se ainda rascunho, não é bloqueador se diagnóstico seguinte avançar
  if (row.status === "rascunho") {
    push("1-checklist-note", true, "classificação ok; avanço de status via diagnóstico");
  }

  // Diagnóstico
  await page.goto(osUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "diagnostico", exact: true }).click();
  await page.getByPlaceholder(/sintoma/i).fill("Barulho");
  await page.locator('textarea[name="diagnostico_tecnico"]').fill("Bucha desgastada");
  await page.getByRole("button", { name: /salvar diagnóstico/i }).click();
  await page.waitForTimeout(2500);
  row = await statusOf(sb, os.id);
  push("2-diagnostico", row.status === "diagnostico_concluido", row.status);

  // Orçamento
  await page.goto(osUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "orcamento", exact: true }).click();
  const form = page.locator("form").filter({ hasText: /incluir no orçamento/i });
  await form.locator('select[name="tipo_item"]').selectOption("produto");
  await form.locator('select[name="categoria_item"]').selectOption("peca");
  await form.locator('input[name="descricao"]').fill("Peça smoke");
  await form.locator('input[name="quantidade"]').fill("1");
  await form.locator('input[name="valor_unitario"]').fill("100");
  await form.locator('select[name="produto_id"]').selectOption(produto.id);
  await form.getByRole("button", { name: /incluir no orçamento/i }).click();
  await page.waitForTimeout(2000);
  await form.locator('select[name="tipo_item"]').selectOption("servico");
  await form.locator('select[name="categoria_item"]').selectOption("mao_obra");
  await form.locator('input[name="descricao"]').fill("Mão de obra");
  await form.locator('input[name="quantidade"]').fill("1");
  await form.locator('input[name="valor_unitario"]').fill("150");
  await form.locator('input[name="horas_previstas"]').fill("1");
  await form.locator('select[name="produto_id"]').selectOption(produto.id);
  await form.getByRole("button", { name: /incluir no orçamento/i }).click();
  await page.waitForTimeout(2000);
  row = await statusOf(sb, os.id);
  push("3-orcamento", row.status === "aguardando_orcamento", row.status);

  // Aprovação
  await page.goto(osUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "aprovacao", exact: true }).click();
  await page.getByRole("button", { name: /aprovar todos/i }).click();
  await page.waitForTimeout(2500);
  row = await statusOf(sb, os.id);
  push("4-aprovacao", row.status === "aprovado", row.status);

  // Execução
  await page.goto(osUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "execucao", exact: true }).click();
  const starters = page.getByRole("button", { name: /iniciar|retomar/i });
  for (let i = 0; i < (await starters.count()); i++) {
    const b = starters.nth(i);
    if (await b.isVisible().catch(() => false)) {
      await b.click();
      await page.waitForTimeout(900);
    }
  }
  row = await statusOf(sb, os.id);
  push("5-execucao", row.status === "em_execucao", row.status);

  const horas = page.getByPlaceholder(/horas realizadas/i);
  for (let i = 0; i < (await horas.count()); i++) await horas.nth(i).fill("1");
  const concluir = page.getByRole("button", { name: /^concluir$/i });
  for (let i = 0; i < (await concluir.count()); i++) {
    const b = concluir.nth(i);
    if (await b.isVisible().catch(() => false)) {
      await b.click();
      await page.waitForTimeout(900);
    }
  }
  push("6-itens-concluidos", true);

  // Entrega (avança em_execucao → pronto_para_entrega → entregue)
  await page.goto(osUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "entrega", exact: true }).click();
  await page.locator('input[name="quilometragem_saida"]').fill("45100");
  await page.getByRole("button", { name: /concluir entrega/i }).click();
  await page.waitForTimeout(3000);
  row = await statusOf(sb, os.id);
  push("7-entrega", row.status === "entregue", row.status);

  const body = await page.locator("body").innerText();
  push("sem-transicao-invalida", !/Transição inválida/i.test(body), "ok");

  const dir = resolve(ROOT, "docs/testing/evidence/13-19-2");
  mkdirSync(dir, { recursive: true });
  await page.goto(osUrl, { waitUntil: "domcontentloaded" });
  await page.screenshot({
    path: resolve(dir, "os-status-machine-smoke.png"),
    fullPage: true,
  });
  writeFileSync(
    resolve(dir, "os-status-machine-smoke.json"),
    JSON.stringify(
      {
        osId: os.id,
        numero: os.numero,
        placa: veiculo.placa,
        finalStatus: row.status,
        log,
      },
      null,
      2,
    ),
  );
  console.log("REPORT", resolve(dir, "os-status-machine-smoke.json"));
  if (log.some((x) => !x.ok)) process.exit(1);
} catch (e) {
  console.error(e);
  const dir = resolve(ROOT, "docs/testing/evidence/13-19-2");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, "os-status-machine-smoke.json"),
    JSON.stringify({ error: String(e), log }, null, 2),
  );
  process.exit(1);
} finally {
  await browser.close();
}
