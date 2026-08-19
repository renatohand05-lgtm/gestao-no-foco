#!/usr/bin/env node
/**
 * Sprint 35.2.1 — Fast Input UX / cadastro rápido.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const load = (rel) =>
  import(pathToFileURL(join(root, rel)).href + `?t=${Date.now()}`);

const ENGINE = { segmentVersion: 1 };

describe("35.2.1 evidência, segurança e regressão", () => {
  it("padrão de disclosure e pós-salvação existem", () => {
    assert.ok(existsSync(join(root, "components/ui/more-details.tsx")));
    assert.ok(existsSync(join(root, "components/ui/post-save-actions.tsx")));
    assert.ok(existsSync(join(root, "lib/ux/fast-input.ts")));
    assert.ok(existsSync(join(root, "components/retention/return-quick-create.tsx")));
    assert.match(read("components/ui/more-details.tsx"), /data-fast-input="more-details"/);
    assert.match(read("components/ui/more-details.tsx"), /sticky/);
    assert.match(read("components/ui/post-save-actions.tsx"), /data-fast-input="post-save"/);
  });

  it("não toca billing nem ativa WhatsApp/cron/e-mail real", () => {
    for (const f of [
      "lib/ux/fast-input.ts",
      "components/retention/return-quick-create.tsx",
      "components/clientes/cliente-form.tsx",
      "components/agenda/agenda-event-create-form.tsx",
      "lib/retention/actions.ts",
      "app/api/cron/retention/route.ts",
    ]) {
      const src = read(f);
      assert.doesNotMatch(src, /asaas/i);
      assert.doesNotMatch(src, /stripe/i);
      assert.doesNotMatch(src, /graph\.facebook/i);
      assert.doesNotMatch(src, /twilio\.com/i);
    }
    const cron = read("app/api/cron/retention/route.ts");
    assert.match(cron, /DISABLED/);
    assert.match(read("lib/retention/process.ts"), /dry_run/);
  });

  it("regressão 35.2 e 35.1 permanece no repositório", () => {
    assert.ok(existsSync(join(root, "scripts/phase35-2-agenda-retention-tests.mjs")));
    assert.ok(existsSync(join(root, "scripts/phase35-1-segment-presets-tests.mjs")));
    assert.ok(existsSync(join(root, "docs/testing/evidence/35-2/REPORT.md")));
    assert.ok(existsSync(join(root, "docs/testing/evidence/35-1/REPORT.md")));
  });
});

describe("35.2.1 cliente / serviço / profissional mínimos", () => {
  it("cliente mínimo: só nome; completo continua opcional", () => {
    const schema = read("lib/clientes/validations.ts");
    assert.match(schema, /nome: z\.string\(\)\.trim\(\)\.min\(2/);
    assert.match(schema, /documento: optionalText/);
    assert.match(schema, /telefone: optionalText/);
    assert.match(schema, /whatsapp: optionalText/);
    assert.match(schema, /email: optionalEmail/);
    assert.doesNotMatch(schema, /documento: z\.string\(\)\.trim\(\)\.min/);
    const form = read("components/clientes/cliente-form.tsx");
    assert.match(form, /Salvar cliente/);
    assert.match(form, /WhatsApp \/ telefone/);
    assert.match(form, /Cliente criado/);
  });

  it("serviço mínimo: nome sem inventar preço", () => {
    const schema = read("lib/produtos/validations.ts");
    assert.match(schema, /nome: z\.string\(\)\.trim\(\)\.min\(2/);
    assert.match(schema, /preco_venda: nullableNumber/);
    assert.match(schema, /custo: nullableNumber/);
    const form = read("components/produtos/produto-form.tsx");
    assert.match(form, /Salvar serviço/);
    assert.match(form, /Duração \(minutos\)/);
    assert.doesNotMatch(form, /preco_venda: 0/);
    assert.match(
      read("lib/segments/library-adopt.ts"),
      /preco_venda: extras\?\.preco_venda \?\? null/,
    );
  });

  it("biblioteca de serviço reusa metadados e nunca inventa preço", async () => {
    const { libraryItemToCreateInput } = await load(
      "lib/segments/library-adopt.ts",
    );
    const created = libraryItemToCreateInput({
      id: "barbearia-corte",
      segment: "barbearia",
      category: "Cortes",
      name: "Corte masculino",
      description: "Corte",
      defaultDurationMinutes: 40,
      suggestedUnit: "UN",
      itemType: "servico",
      tags: ["cortes"],
      requiredCapabilities: ["catalog"],
      recommended: true,
      active: true,
    });
    assert.equal(created.nome, "Corte masculino");
    assert.equal(created.categoria, "Cortes");
    assert.equal(created.tempo_estimado_minutos, 40);
    assert.equal(created.preco_venda, null);
    assert.equal(created.custo, null);
  });

  it("UI de profissional mínimo e especialidade livre (35.1)", () => {
    const src = read("components/mecanicos/mecanicos-manager.tsx");
    assert.match(src, /data-fast-input="essentials"/);
    assert.match(src, /ProfessionalSpecialtyField/);
    assert.match(src, /Mais informações/);
    assert.match(src, /Adicionar outro/);
    assert.doesNotMatch(src, /if \(segment ===/);
  });
});

describe("35.2.1 agendamento, smart defaults e negócio sem cliente", () => {
  it("atendimento exige cliente; negócio/interno não", () => {
    const schema = read("lib/agenda/validations.ts");
    assert.match(
      schema,
      /natureza === "cliente" && !v\.cliente_id/,
    );
    assert.match(schema, /Cliente é obrigatório no agendamento de atendimento/);
    assert.match(schema, /natureza: z\.enum\(\["cliente", "negocio", "interno"\]\)/);
    const form = read("components/agenda/agenda-event-create-form.tsx");
    assert.match(form, /natureRequiresCliente/);
    assert.match(form, /\(opcional\)/);
    assert.match(form, /Agendar/);
  });

  it("smart defaults reusam contexto da navegação sem inventar dados", async () => {
    const {
      parseAgendaCreateContext,
      agendaHref,
      contactFromQuickPhone,
    } = await load("lib/ux/fast-input.ts");
    const ctx = parseAgendaCreateContext({
      cliente_id: "11111111-1111-4111-8111-111111111111",
      servico_id: "22222222-2222-4222-8222-222222222222",
      inicio: "2026-08-20T09:00",
    });
    assert.equal(ctx.natureza, "cliente");
    assert.equal(ctx.clienteId, "11111111-1111-4111-8111-111111111111");
    assert.equal(ctx.servicoId, "22222222-2222-4222-8222-222222222222");
    assert.equal(ctx.inicioLocal, "2026-08-20T09:00");
    const href = agendaHref("acme", ctx);
    assert.match(href, /cliente_id=/);
    assert.match(href, /inicio=/);
    const phone = contactFromQuickPhone("11988887777");
    assert.equal(phone.whatsapp, "+5511988887777");
    assert.equal(phone.telefone, "+5511988887777");
    assert.equal(contactFromQuickPhone("").whatsapp, "");
  });

  it("natureza exige cliente só no atendimento", async () => {
    const { natureRequiresCliente } = await load("lib/retention/natures.ts");
    assert.equal(natureRequiresCliente("cliente"), true);
    assert.equal(natureRequiresCliente("negocio"), false);
    assert.equal(natureRequiresCliente("interno"), false);
  });
});

describe("35.2.1 retorno rápido, retorno→agenda e oficina data/km", () => {
  it("presets rápidos e 30 dias / 3 meses", async () => {
    const { FAST_RETURN_PRESETS, intervalFromFastPreset } = await load(
      "lib/ux/fast-input.ts",
    );
    assert.deepEqual(
      FAST_RETURN_PRESETS.map((p) => p.label),
      ["15 dias", "30 dias", "3 meses", "6 meses", "1 ano"],
    );
    assert.deepEqual(intervalFromFastPreset("30d"), {
      presetDays: 30,
      intervalMonths: null,
    });
    assert.deepEqual(intervalFromFastPreset("3m"), {
      presetDays: null,
      intervalMonths: 3,
    });
  });

  it("retorno → agendar reaproveita contexto", async () => {
    const { agendaHref } = await load("lib/ux/fast-input.ts");
    const href = agendaHref("acme", {
      natureza: "cliente",
      clienteId: "11111111-1111-4111-8111-111111111111",
      servicoId: "22222222-2222-4222-8222-222222222222",
      profissionalId: "33333333-3333-4333-8333-333333333333",
      returnId: "44444444-4444-4444-8444-444444444444",
    });
    assert.match(href, /return_id=/);
    assert.match(href, /servico_id=/);
    assert.match(href, /profissional_id=/);
    const panel = read("components/retention/returns-panel.tsx");
    assert.match(panel, /returnId: row.id/);
    const quick = read("components/retention/return-quick-create.tsx");
    assert.match(quick, /Criar retorno/);
    assert.match(quick, /Agendar agora/);
    assert.doesNotMatch(quick, /10000/);
  });

  it("oficina data OU km, sem obrigar os dois", async () => {
    const { computeDueDate, computeNextKm } = await load(
      "lib/retention/returns.ts",
    );
    const onlyDate = computeDueDate({
      fromCivilDate: "2026-08-16",
      rule: { intervalDays: 30, intervalMonths: null },
    });
    assert.equal(onlyDate, "2026-09-15");
    assert.equal(computeNextKm(null, 10000), null);
    assert.equal(computeNextKm(50000, null), null);
    assert.equal(computeNextKm(50000, 10000), 60000);
    const quick = read("components/retention/return-quick-create.tsx");
    assert.match(quick, /Km atual/);
    assert.match(quick, /Intervalo km/);
  });
});

describe("35.2.1 progressive disclosure, campos avançados e segmentos", () => {
  it("campos avançados continuam no formulário", () => {
    const cliente = read("components/clientes/cliente-form.tsx");
    assert.match(cliente, /Mais informações/);
    assert.match(cliente, /documento/);
    assert.match(cliente, /observacoes/);
    assert.match(cliente, /classificacao/);
    const produto = read("components/produtos/produto-form.tsx");
    assert.match(produto, /Mais informações/);
    assert.match(produto, /categoria/);
    assert.match(produto, /codigo_interno/);
    assert.match(produto, /ncm/);
    const agenda = read("components/agenda/agenda-event-create-form.tsx");
    assert.match(agenda, /Mais opções/);
    assert.match(agenda, /override_justificativa|Justificativa do override/);
    assert.match(agenda, /Lembrete personalizado/);
  });

  it("visibilidade de campos por form-config, sem if de segmento nas páginas rápidas", async () => {
    const { getSegmentFormConfig, isCatalogFieldHidden } = await load(
      "lib/segments/form-config.ts",
    );
    const { resolveSegmentContext } = await load("lib/segments/resolve.ts");
    const barbearia = getSegmentFormConfig(
      resolveSegmentContext({ segment: "barbearia", ...ENGINE }),
    );
    assert.equal(isCatalogFieldHidden(barbearia, "diagnostico_mecanico"), true);
    assert.equal(isCatalogFieldHidden(barbearia, "placa"), true);
    const oficina = getSegmentFormConfig(
      resolveSegmentContext({ segment: "oficina", ...ENGINE }),
    );
    assert.equal(isCatalogFieldHidden(oficina, "diagnostico_mecanico"), false);
    for (const f of [
      "components/clientes/cliente-form.tsx",
      "components/agenda/agenda-event-create-form.tsx",
      "components/produtos/produto-form.tsx",
      "components/mecanicos/mecanicos-manager.tsx",
      "components/retention/returns-panel.tsx",
      "components/retention/return-quick-create.tsx",
    ]) {
      assert.doesNotMatch(read(f), /if \(segment ===/);
    }
  });

  it("consultoria/estética/odonto não recebem copy automotiva indevida", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const { resolveSegmentContext, hasCapability } = await load(
      "lib/segments/resolve.ts",
    );
    const consultoria = getSegmentUiCopy({ segment: "consultoria", ...ENGINE });
    assert.equal(consultoria.showVehicles, false);
    assert.equal(consultoria.automotiveWorkflow, false);
    const barbearia = getSegmentUiCopy({ segment: "barbearia", ...ENGINE });
    assert.equal(barbearia.showVehicles, false);
    const estetica = getSegmentUiCopy({
      segment: "clinica_estetica",
      ...ENGINE,
    });
    assert.equal(estetica.automotiveWorkflow, false);
    const odonto = resolveSegmentContext({
      segment: "consultorio_odontologico",
      ...ENGINE,
    });
    assert.equal(hasCapability(odonto, "vehicles"), false);
  });
});

describe("35.2.1 mobile, RBAC e tenant isolation", () => {
  it("mobile gate: CTA sticky e campos essenciais primeiro", () => {
    const cta = read("components/ui/more-details.tsx");
    assert.match(cta, /sticky bottom-0/);
    assert.match(cta, /data-fast-input="cta"/);
    for (const f of [
      "components/clientes/cliente-form.tsx",
      "components/produtos/produto-form.tsx",
      "components/agenda/agenda-event-create-form.tsx",
      "components/mecanicos/mecanicos-manager.tsx",
      "components/retention/return-quick-create.tsx",
    ]) {
      const src = read(f);
      assert.match(src, /data-fast-input="essentials"/);
      assert.match(src, /data-fast-input="cta"|FastInputCtaBar/);
    }
  });

  it("RBAC de criação continua declarado", () => {
    const perms = read("lib/rbac/permissions.ts");
    assert.match(perms, /agenda\.criar/);
    assert.match(perms, /crm\.retornos\.criar/);
    assert.match(read("lib/retention/actions.ts"), /requireTenantMutationPermission/);
    assert.match(read("lib/retention/actions.ts"), /crm\.retornos\.criar/);
  });

  it("serviços 35.2 continuam isolados por tenant_id", () => {
    for (const f of [
      "lib/retention/return-service.ts",
      "lib/retention/outbox-service.ts",
      "lib/retention/prefs-service.ts",
      "lib/retention/rule-service.ts",
      "lib/agenda/agenda-service.ts",
    ]) {
      assert.match(read(f), /\.eq\("tenant_id"/);
    }
  });

  it("slot da agenda e from=agenda não pedem contexto de novo", () => {
    assert.match(read("components/agenda/agenda-week-board.tsx"), /data-fast-input="agenda-slot"/);
    assert.match(read("components/clientes/cliente-form.tsx"), /shouldReturnToAgenda/);
    assert.match(read("app/(app)/[tenant]/clientes/novo/page.tsx"), /from/);
    assert.match(
      read("components/agenda/agenda-event-create-form.tsx"),
      /novoClienteFromAgendaHref/,
    );
  });
});
