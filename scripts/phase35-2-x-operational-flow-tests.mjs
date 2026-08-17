#!/usr/bin/env node
/**
 * Hotfix 35.2.x — ciclo operacional Agenda → Atendimento/OS + formas de pagamento.
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

const MIG = "supabase/migrations/20260905_hotfix_352x_agenda_operation.sql";
const ENGINE = { segmentVersion: 1 };

describe("35.2.x source of truth / evidência", () => {
  it("não cria quarto catálogo de pagamento; reusa formas_pagamento", () => {
    assert.ok(existsSync(join(root, MIG)));
    assert.ok(
      existsSync(join(root, "lib/financeiro/formas-pagamento-ensure.ts")),
    );
    const ensure = read("lib/financeiro/formas-pagamento-ensure.ts");
    assert.match(ensure, /formas_pagamento/);
    assert.match(ensure, /ensureFormasPagamentoCatalog/);
    assert.match(ensure, /listActiveFormasPagamento/);
    assert.doesNotMatch(ensure, /payment_methods/);
    const payload = ensure.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(payload, /adquirente/);
    assert.doesNotMatch(payload, /taxa_percent/);
    assert.match(read("lib/vendas/venda-service.ts"), /listActiveFormasPagamento/);
    assert.match(
      read("lib/financeiro/conta-receber-service.ts"),
      /listActiveFormasPagamento/,
    );
    assert.match(
      read("lib/financeiro/conta-pagar-service.ts"),
      /ensureFormasPagamentoCatalog/,
    );
  });

  it("migration aditiva sem DELETE/DROP", () => {
    const sql = read(MIG).replace(/--.*$/gm, "");
    assert.match(sql, /veiculo_id/);
    assert.match(sql, /agenda_eventos/);
    assert.doesNotMatch(sql, /\bDELETE FROM\b/);
    assert.doesNotMatch(sql, /\bDROP TABLE\b/);
  });
});

describe("1-8 catálogo pagamento mínimo + isolamento", () => {
  it("1-7 catálogo mínimo inclui PIX/dinheiro/débito/crédito/boleto/transferência", async () => {
    const {
      CONTAS_PAGAR_FORMAS_CATALOG,
      missingContasPagarFormas,
    } = await load("lib/financeiro/formas-pagamento-catalog.ts");
    const nomes = CONTAS_PAGAR_FORMAS_CATALOG.map((c) => c.nome);
    for (const need of [
      "PIX",
      "Dinheiro",
      "Cartão de débito",
      "Cartão de crédito",
      "Boleto",
      "Transferência bancária",
    ]) {
      assert.ok(nomes.includes(need), need);
    }
    assert.ok(nomes.includes("Débito em conta"));
    assert.ok(nomes.includes("Guia / código de barras"));
    const missing = missingContasPagarFormas([]);
    assert.equal(missing.length, CONTAS_PAGAR_FORMAS_CATALOG.length);
    const afterPix = missingContasPagarFormas([
      { id: "1", nome: "PIX", tipo: "pix" },
    ]);
    assert.ok(!afterPix.some((m) => m.key === "pix"));
  });

  it("8 tenant isolation no ensure e nas listagens", () => {
    const ensure = read("lib/financeiro/formas-pagamento-ensure.ts");
    assert.match(ensure, /\.eq\("tenant_id", tenantId\)/);
    assert.match(ensure, /tenant_id: tenantId/);
    assert.match(read("lib/vendas/venda-service.ts"), /\.eq\("tenant_id"/);
  });
});

describe("select vazio / parcelas", () => {
  it("nunca mostra Nenhuma opção no pagamento; CTA só se autorizado", () => {
    const venda = read("components/vendas/venda-form.tsx");
    assert.match(venda, /PAYMENT_METHODS_EMPTY_TEXT/);
    assert.match(venda, /FormasPagamentoEmptyHint/);
    assert.match(venda, /canConfigureFormas/);
    assert.doesNotMatch(venda, /Cadastre formas de pagamento em Financeiro/);
    const hint = read("components/financeiro/formas-pagamento-empty-hint.tsx");
    assert.match(hint, /PAYMENT_METHODS_EMPTY_TEXT/);
    assert.match(read("lib/financeiro/formas-pagamento-catalog.ts"), /Configure as formas de pagamento/);
    assert.match(hint, /financeiro\/formas-pagamento/);
    assert.match(hint, /canConfigure/);
    const gf = read("components/gf/gf-select.tsx");
    assert.match(gf, /Nenhuma opção/);
    assert.match(read("app/(app)/[tenant]/vendas/nova/page.tsx"), /financeiro\.editar/);
  });

  it("parcelamento só no crédito/crediário", async () => {
    const { allowsInstallmentsForFormaTipo } = await load(
      "lib/financeiro/formas-pagamento-catalog.ts",
    );
    assert.equal(allowsInstallmentsForFormaTipo("pix"), false);
    assert.equal(allowsInstallmentsForFormaTipo("dinheiro"), false);
    assert.equal(allowsInstallmentsForFormaTipo("cartao_debito"), false);
    assert.equal(allowsInstallmentsForFormaTipo("boleto"), false);
    assert.equal(allowsInstallmentsForFormaTipo("transferencia"), false);
    assert.equal(allowsInstallmentsForFormaTipo("cartao_credito"), true);
  });
});

describe("9-14 agenda não cria OS; iniciar é idempotente e reaproveita contexto", () => {
  it("9 criar agendamento não cria OS", () => {
    const create = read("lib/agenda/actions.ts");
    assert.match(create, /createAgendaEventAction/);
    assert.doesNotMatch(create, /createOrdemServicoService/);
    assert.doesNotMatch(create, /agendaToOs/);
    const insert = read("lib/agenda/agenda-service.ts");
    assert.match(insert, /status: "agendado"/);
    assert.doesNotMatch(insert, /createOrdemServicoService/);
  });

  it("10-11 iniciar cria/reusa entidade; clique duplo idempotente", () => {
    const conv = read("lib/crm/phase28/conversion-service.ts");
    assert.match(conv, /AGENDA_OS_MARKER/);
    assert.match(conv, /ordem_servico_id/);
    assert.match(conv, /idempotent/);
    assert.match(conv, /attachScheduledCatalogItem/);
    const acts = read("lib/crm/phase28/conversion-actions.ts");
    assert.match(acts, /startAttendanceFromAgendaAction/);
    assert.match(acts, /os\.criar/);
  });

  it("12-14 cliente/serviço/profissional reaproveitados", () => {
    const conv = read("lib/crm/phase28/conversion-service.ts");
    assert.match(conv, /cliente_id: ev.cliente_id/);
    assert.match(conv, /extra.servico_id/);
    assert.match(conv, /mecanico_id: ev.responsavel_id/);
    assert.match(conv, /origem_atendimento: "agenda"/);
  });
});

describe("LAVA 15-20", () => {
  it("15-16 veículo e placa do agendamento", async () => {
    const { pickScheduledVehicle } = await load(
      "lib/agenda/operational-start.ts",
    );
    const one = pickScheduledVehicle({
      vehiclesRequired: true,
      eventVeiculoId: null,
      clientVehicleIds: ["v1"],
    });
    assert.equal(one.ok, true);
    assert.equal(one.ok ? one.veiculoId : null, "v1");
    const many = pickScheduledVehicle({
      vehiclesRequired: true,
      eventVeiculoId: null,
      clientVehicleIds: ["v1", "v2"],
    });
    assert.equal(many.ok, false);
    const chosen = pickScheduledVehicle({
      vehiclesRequired: true,
      eventVeiculoId: "v2",
      clientVehicleIds: ["v1", "v2"],
    });
    assert.equal(chosen.ok, true);
    assert.equal(chosen.ok ? chosen.veiculoId : null, "v2");
    const create = read("components/agenda/agenda-event-create-form.tsx");
    assert.match(create, /OsVeiculoPicker/);
    assert.match(create, /veiculo_id/);
    assert.match(create, /compactCreate/);
    const picker = read("components/ordens/os-veiculo-picker.tsx");
    assert.match(picker, /Nenhum veículo cadastrado para este cliente/);
    const dialog = read("components/ordens/os-veiculo-quick-dialog.tsx");
    assert.match(dialog, /Salvar e usar/);
    assert.doesNotMatch(dialog, /desta OS/);
    assert.doesNotMatch(create, /if \(segment ===/);
  });

  it("17-18 checklist lava disponível sem diagnóstico mecânico", async () => {
    const { getOsChecklistTemplate } = await load("lib/ordens/os-status.ts");
    const lava = getOsChecklistTemplate("lava_rapido");
    const codes = lava.map((i) => i.codigo).join(" ");
    const labels = lava.map((i) => i.label).join(" ");
    assert.match(labels, /Riscos/);
    assert.match(labels, /Objetos/);
    assert.match(labels, /Fotos/);
    assert.doesNotMatch(labels, /Diagn[oó]stico/);
    assert.doesNotMatch(labels, /Peças mecânicas/);
    assert.doesNotMatch(labels, /Defeito t[ée]cnico/);
    assert.match(codes, /combustivel/);
    const conv = read("lib/crm/phase28/conversion-service.ts");
    assert.match(conv, /checklistKind: lava \? "lava_rapido"/);
    const copy = read("lib/segments/copy.ts");
    assert.match(copy, /automotiveWorkflow: false/);
  });

  it("19-20 finalizar e service ready preservados", () => {
    const workspace = read("components/ordens/os-workspace.tsx");
    assert.match(workspace, /ServiceReadyPanel/);
    assert.match(workspace, /finalizeAndNotifyLabel/);
    assert.match(read("lib/retention/service-ready.ts"), /serviceReadyAllowed/);
    assert.doesNotMatch(
      read("lib/crm/phase28/conversion-service.ts"),
      /COMMUNICATION_MODE=live/,
    );
  });
});

describe("OFICINA 21-24 e outros segmentos 25", () => {
  it("21-24 oficina: OS, veículo, diagnóstico, mecânico", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const ui = getSegmentUiCopy({ segment: "oficina", ...ENGINE });
    assert.equal(ui.startAttendanceLabel, "Iniciar OS");
    assert.equal(ui.workOrderShort, "OS");
    assert.equal(ui.professional, "Mecânico");
    assert.equal(ui.automotiveWorkflow, true);
    assert.equal(ui.createsWorkOrderFromAgenda, true);
  });

  it("25 copy sem OS indevida noutros segmentos", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    for (const segment of [
      "barbearia",
      "lava_rapido",
      "consultoria",
      "clinica_estetica",
      "consultorio_odontologico",
    ]) {
      const ui = getSegmentUiCopy({ segment, ...ENGINE });
      assert.doesNotMatch(ui.startAttendanceLabel, /\bOS\b/);
      assert.doesNotMatch(ui.workOrder, /Ordem de Serviço/);
    }
    const list = read("components/agenda/agenda-event-list-actions.tsx");
    assert.doesNotMatch(list, /→ OS/);
    assert.match(list, /startAttendanceLabel/);
    assert.doesNotMatch(list, /segment ===/);
  });
});

describe("VENDA 26-30", () => {
  it("26-29 atendimento → venda reusa cliente/itens/preço real", () => {
    const fat = read("lib/ordens/ordem-servico-service.ts");
    assert.match(fat, /async faturar\(/);
    assert.match(fat, /createVendaService/);
    assert.match(fat, /aprovados/);
    assert.match(read("lib/ordens/ordem-servico-service.ts"), /preco_venda/);
    const attach = read("lib/ordens/ordem-servico-service.ts");
    assert.match(attach, /attachScheduledCatalogItem/);
    assert.match(attach, /eq\("tenant_id", this.tenantId\)/);
  });

  it("30 forma de pagamento disponível na finalização", () => {
    const ws = read("components/ordens/os-workspace.tsx");
    assert.match(ws, /Forma de pagamento/);
    assert.match(ws, /PAYMENT_METHODS_EMPTY_TEXT/);
    assert.match(
      read("app/(app)/[tenant]/ordens/[id]/page.tsx"),
      /listActiveFormasPagamento/,
    );
  });
});

describe("SEGURANÇA 31-33", () => {
  it("31 cross-tenant nas entidades do hotfix", () => {
    const conv = read("lib/crm/phase28/conversion-service.ts");
    assert.match(conv, /\.eq\("tenant_id", this.tenantId\)/);
    assert.match(conv, /\.eq\("tenant_id", this.tenantId\)[\s\S]*veiculos|from\("veiculos"\)[\s\S]*tenant_id/);
    const agenda = read("lib/agenda/agenda-service.ts");
    assert.match(agenda, /\.eq\("tenant_id", this.tenantId\)/);
    const prod = read("lib/ordens/ordem-servico-service.ts");
    assert.match(prod, /eq\("id", produtoId\)[\s\S]*eq\("tenant_id", this.tenantId\)/);
  });

  it("32 RBAC agenda ≠ faturamento", () => {
    const acts = read("lib/crm/phase28/conversion-actions.ts");
    assert.match(acts, /os\.criar/);
    assert.match(acts, /agenda\.editar/);
    assert.doesNotMatch(acts, /vendas\.criar/);
    assert.doesNotMatch(acts, /financeiro\.editar/);
    const hint = read("components/financeiro/formas-pagamento-empty-hint.tsx");
    assert.match(hint, /canConfigure/);
  });

  it("33 formas inativas não entram no select de venda", () => {
    const ensure = read("lib/financeiro/formas-pagamento-ensure.ts");
    assert.match(ensure, /\.eq\("ativo", true\)/);
  });
});

describe("mobile / billing freeze", () => {
  it("botões da agenda usam min-h-11", () => {
    assert.match(
      read("components/agenda/agenda-event-list-actions.tsx"),
      /min-h-11/,
    );
  });

  it("não toca billing, live WhatsApp nem cron production", () => {
    const env = read(".env.example");
    assert.match(env, /COMMUNICATION_MODE=test/);
    assert.doesNotMatch(env, /COMMUNICATION_MODE=live/);
    assert.match(
      read("app/api/cron/retention/route.ts"),
      /production: "DISABLED"/,
    );
  });
});
