#!/usr/bin/env node
/**
 * HOTFIX — FINAL FLOW UNBLOCK
 * Aprovação, execução, SERVICE_READY e entrega separados.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const load = (rel) =>
  import(pathToFileURL(join(root, rel)).href + `?t=${Date.now()}`);

const ENGINE = { segmentVersion: 1 };
const GUARD = [
  "lib/ordens/budget-gate.ts",
  "lib/ordens/os-status.ts",
  "lib/ordens/ordem-servico-service.ts",
  "lib/ordens/orcamento-versao-service.ts",
  "lib/ordens/actions.ts",
  "components/ordens/os-workspace.tsx",
  "lib/retention/actions.ts",
  "lib/crm/phase28/conversion-service.ts",
  "lib/mecanicos/actions.ts",
  "components/retention/service-ready-panel.tsx",
];

describe("canAdvanceToApproval", () => {
  it("1-5 lava: publicado libera; sem publicar bloqueia; sem diagnóstico", async () => {
    const { canAdvanceToApproval, requiresDiagnosisBeforeBudget } = await load(
      "lib/ordens/budget-gate.ts",
    );
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const lava = getSegmentUiCopy({ segment: "lava_rapido", ...ENGINE });
    const oficina = getSegmentUiCopy({ segment: "oficina", ...ENGINE });
    assert.equal(requiresDiagnosisBeforeBudget(lava), false);
    assert.equal(requiresDiagnosisBeforeBudget(oficina), true);

    const lavaBlocked = canAdvanceToApproval({
      workflowConfig: lava,
      budgetPublished: false,
      diagnosisCompleted: false,
      osStatus: "rascunho",
    });
    assert.equal(lavaBlocked.ok, false);
    assert.match(lavaBlocked.reason, /Publique o orçamento/i);

    const lavaOk = canAdvanceToApproval({
      workflowConfig: lava,
      budgetPublished: true,
      diagnosisCompleted: false,
      osStatus: "rascunho",
    });
    assert.equal(lavaOk.ok, true);

    const oficinaNoDx = canAdvanceToApproval({
      workflowConfig: oficina,
      budgetPublished: true,
      diagnosisCompleted: false,
      osStatus: "aguardando_diagnostico",
    });
    assert.equal(oficinaNoDx.ok, false);
    assert.match(oficinaNoDx.reason, /diagnóstico/i);

    const oficinaOk = canAdvanceToApproval({
      workflowConfig: oficina,
      budgetPublished: true,
      diagnosisCompleted: true,
      osStatus: "diagnostico_concluido",
    });
    assert.equal(oficinaOk.ok, true);
  });

  it("gate central sem if(segment ===) na UI/service", () => {
    const ws = read("components/ordens/os-workspace.tsx");
    const svc = read("lib/ordens/ordem-servico-service.ts");
    const gate = read("lib/ordens/budget-gate.ts");
    assert.match(gate, /canAdvanceToApproval/);
    assert.match(ws, /canAdvanceToApproval/);
    assert.doesNotMatch(ws, /if \(segment ===/);
    assert.doesNotMatch(svc, /if \(segment ===/);
    assert.doesNotMatch(ws, /Conclua análise e orçamento primeiro/);
  });
});

describe("publish / item / execution / ready order", () => {
  it("6-10 publicar avança OS; lava não nasce em execução", () => {
    const pub = read("lib/ordens/orcamento-versao-service.ts");
    assert.match(pub, /shouldAdvanceToAguardandoAprovacaoOnPublish/);
    assert.match(pub, /publicado_em/);
    const conv = read("lib/crm/phase28/conversion-service.ts");
    assert.match(conv, /initialStatus: "rascunho"/);
    assert.doesNotMatch(conv, /initialStatus: lava \? "em_execucao"/);
    const status = read("lib/ordens/os-status.ts");
    assert.match(status, /aguardando_aprovacao/);
    assert.match(status, /em_execucao: \[/);
  });

  it("11-15 aprovação persiste; execução filtra aprovado/approved", () => {
    const svc = read("lib/ordens/ordem-servico-service.ts");
    assert.match(svc, /aprovacao_status: "aprovado"/);
    assert.match(svc, /aprovacao_status: "reprovado"/);
    assert.match(svc, /Não foi possível aprovar o item/);
    assert.match(svc, /itemAprovacaoIsApproved/);
    const ws = read("components/ordens/os-workspace.tsx");
    assert.match(ws, /itemAprovacaoIsApproved/);
    assert.match(ws, /Aprovar todos/);
  });

  it("16-21 SERVICE_READY não marca entregue; entrega é etapa separada", () => {
    const svc = read("lib/ordens/ordem-servico-service.ts");
    assert.match(svc, /canMarkAguardandoRetirada/);
    assert.match(
      svc,
      /Finalize os serviços antes de marcar o veículo como pronto/,
    );
    assert.doesNotMatch(svc, /OS já entregue\./);
    assert.match(
      svc,
      /Este atendimento já foi entregue\. A retirada já foi registrada/,
    );
    assert.match(
      svc,
      /Finalize os serviços e marque o veículo como pronto para retirada antes de concluir a entrega/,
    );
    const ws = read("components/ordens/os-workspace.tsx");
    assert.match(ws, /canOpenServiceReady/);
    assert.match(ws, /canShowServiceReadyPanel/);
    assert.match(read("lib/retention/service-ready.ts"), /canMarkAguardandoRetirada/);
    assert.match(ws, /deliveryUiMode/);
    assert.match(ws, /Entrega concluída/);
    assert.match(ws, /não há aceite de retirada/);
    const fin = read("lib/retention/actions.ts");
    assert.match(fin, /marcarAguardandoRetirada/);
    assert.match(fin, /templateCode: "SERVICE_READY"/);
    assert.match(fin, /SERVICE_DELIVERED/);
    const pickup = fin.slice(fin.indexOf("registerOsPickupAction"));
    assert.doesNotMatch(
      pickup.slice(0, pickup.indexOf("notifyServiceReadyAgainAction")),
      /templateCode: "SERVICE_READY"/,
    );
  });

  it("22-25 copy e template lava/oficina", async () => {
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const lava = getSegmentUiCopy({ segment: "lava_rapido", ...ENGINE });
    const oficina = getSegmentUiCopy({ segment: "oficina", ...ENGINE });
    assert.equal(lava.workOrderShort, "Atendimento");
    assert.equal(lava.professional, "Profissional");
    assert.equal(lava.statusLabels.pronto_para_entrega, "Pronto para retirada");
    assert.equal(lava.finalizeOnlyLabel, "Finalizar serviço");
    assert.equal(oficina.workOrderShort, "OS");
    assert.equal(oficina.professional, "Mecânico");
    assert.equal(oficina.diagnosisSectionTitle, "Diagnóstico");
    const { templateFor } = await load("lib/retention/templates.ts");
    const msg = templateFor({ code: "SERVICE_READY", segment: "lava_rapido" });
    assert.match(msg, /veículo está pronto/i);
    assert.match(msg, /pronto para retirada/i);
    assert.match(msg, /realizar a retirada/i);
    assert.doesNotMatch(msg, /entregue/i);
  });

  it("26-35 transições: publish path, execução, cancelar, isolamento", async () => {
    const { findTransitionPath, canTransition, canMarkAguardandoRetirada } =
      await load("lib/ordens/os-status.ts");
    assert.deepEqual(findTransitionPath("rascunho", "aguardando_aprovacao"), [
      "aguardando_aprovacao",
    ]);
    assert.equal(canTransition("em_execucao", "aguardando_aprovacao"), true);
    assert.equal(canTransition("em_execucao", "pronto_para_entrega"), true);
    assert.equal(canTransition("pronto_para_entrega", "entregue"), true);
    assert.equal(canTransition("em_execucao", "entregue"), false);
    assert.equal(canTransition("entregue", "em_execucao"), false);
    assert.equal(canTransition("faturado", "em_execucao"), false);
    assert.equal(canMarkAguardandoRetirada("em_execucao"), true);
    assert.equal(canMarkAguardandoRetirada("entregue"), false);
    assert.equal(canMarkAguardandoRetirada("rascunho"), false);
    const actions = read("lib/ordens/actions.ts");
    assert.match(actions, /requireTenant/);
    const svc = read("lib/ordens/ordem-servico-service.ts");
    assert.match(svc, /eq\("tenant_id", this.tenantId\)/);
  });
});

describe("closeout lifecycle + notify restore", () => {
  it("A-C finalize sem/com aviso não entrega; concluir entrega só em pronto", async () => {
    const {
      canMarkAguardandoRetirada,
      canConcludeDelivery,
      canTransition,
    } = await load("lib/ordens/os-status.ts");
    assert.equal(canMarkAguardandoRetirada("em_execucao"), true);
    assert.equal(canConcludeDelivery("em_execucao"), false);
    assert.equal(canConcludeDelivery("pronto_para_entrega"), true);
    assert.equal(canTransition("em_execucao", "pronto_para_entrega"), true);
    assert.equal(canTransition("pronto_para_entrega", "entregue"), true);
    const fin = read("lib/retention/actions.ts");
    const finalize = fin.slice(
      fin.indexOf("finalizeServiceReadyAction"),
      fin.indexOf("registerOsPickupAction"),
    );
    assert.match(finalize, /marcarAguardandoRetirada/);
    assert.match(finalize, /templateCode: "SERVICE_READY"/);
    assert.doesNotMatch(finalize, /status: "entregue"/);
    assert.match(
      finalize,
      /OS finalizada\. Não foi possível enviar a notificação/,
    );
    const svc = read("lib/ordens/ordem-servico-service.ts");
    assert.match(svc, /canConcludeDelivery/);
  });

  it("D-G entregue/faturado recusam nova entrega e execução", async () => {
    const {
      canMutateOsExecution,
      canConcludeDelivery,
      deliveryUiMode,
      closedOsOperationMessage,
    } = await load("lib/ordens/os-status.ts");
    assert.equal(canMutateOsExecution("entregue"), false);
    assert.equal(canMutateOsExecution("faturado"), false);
    assert.equal(canMutateOsExecution("em_execucao"), true);
    assert.equal(canConcludeDelivery("entregue"), false);
    assert.equal(canConcludeDelivery("faturado"), false);
    assert.equal(deliveryUiMode("pronto_para_entrega", null), "ready");
    assert.equal(deliveryUiMode("entregue", "2026-08-19T12:00:00Z"), "done");
    assert.equal(deliveryUiMode("faturado", "2026-08-19T12:00:00Z"), "billed");
    assert.equal(deliveryUiMode("faturado", null), "legacy_billed");
    assert.match(closedOsOperationMessage("faturado"), /faturada/);
    const svc = read("lib/ordens/ordem-servico-service.ts");
    assert.match(svc, /já está faturada\. A entrega não pode ser registrada novamente/);
    assert.match(svc, /canMutateOsExecution/);
    const apontar = read("lib/mecanicos/actions.ts");
    assert.match(apontar, /canMutateOsExecution/);
    assert.match(apontar, /eq\("tenant_id", g\.tenantId\)/);
    const ws = read("components/ordens/os-workspace.tsx");
    assert.match(ws, /executionLocked/);
    assert.match(ws, /entregaMode === "ready"/);
    assert.match(ws, /canApontarHoras && !executionLocked/);
  });

  it("H-J canais do cliente ≠ provider; falha de notify não entrega", () => {
    const ws = read("components/ordens/os-workspace.tsx");
    const panel = read("components/retention/service-ready-panel.tsx");
    assert.match(ws, /Finalizar e avisar cliente/);
    assert.match(panel, /finalizeAndNotifyLabel/);
    assert.match(panel, /envio não configurado/);
    assert.match(panel, /Cliente sem WhatsApp ou e-mail cadastrado/);
    assert.doesNotMatch(panel, /cliente sem canal disponível/i);
    assert.match(panel, /finalizeOnlyLabel/);
    const page = read("app/(app)/[tenant]/ordens/[id]/page.tsx");
    assert.match(page, /whatsappHealth\(\)\.canSendReal/);
    assert.match(page, /emailHealth\(\)\.canSendReal/);
    const fin = read("lib/retention/actions.ts");
    assert.match(fin, /OS finalizada\. Não foi possível enviar a notificação/);
    assert.match(fin, /status = "pronto_para_entrega"/);
  });

  it("K legado faturado sem aceite não fabrica timestamp", () => {
    const ws = read("components/ordens/os-workspace.tsx");
    assert.match(ws, /legacy_billed/);
    assert.match(ws, /Nenhum aceite será inventado/);
    const svc = read("lib/ordens/ordem-servico-service.ts");
    const concluir = svc
      .split("async concluirEntrega")[1]
      .split("async marcarAguardandoRetirada")[0];
    assert.match(
      concluir,
      /if \(current.status === "faturado"\) \{\s*throw new Error/,
    );
    assert.match(
      concluir,
      /já está faturada\. A entrega não pode ser registrada novamente/,
    );
  });

  it("L-M lava sem diagnóstico; oficina com diagnóstico", async () => {
    const { canAdvanceToApproval, requiresDiagnosisBeforeBudget } = await load(
      "lib/ordens/budget-gate.ts",
    );
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const lava = getSegmentUiCopy({ segment: "lava_rapido", ...ENGINE });
    const oficina = getSegmentUiCopy({ segment: "oficina", ...ENGINE });
    assert.equal(requiresDiagnosisBeforeBudget(lava), false);
    assert.equal(
      canAdvanceToApproval({
        workflowConfig: lava,
        budgetPublished: true,
        diagnosisCompleted: false,
        osStatus: "aguardando_orcamento",
      }).ok,
      true,
    );
    assert.equal(requiresDiagnosisBeforeBudget(oficina), true);
    assert.equal(
      canAdvanceToApproval({
        workflowConfig: oficina,
        budgetPublished: true,
        diagnosisCompleted: true,
        osStatus: "diagnostico_concluido",
      }).ok,
      true,
    );
    const panel = read("components/retention/service-ready-panel.tsx");
    assert.match(panel, /data-phase35="service-ready"/);
  });
});

describe("guards", () => {
  it("não toca billing, live comm, cron, 35.3", () => {
    for (const f of GUARD) {
      const src = read(f);
      assert.doesNotMatch(src, /asaas/i);
      assert.doesNotMatch(src, /stripe/i);
      assert.doesNotMatch(src, /COMMUNICATION_MODE\s*=\s*["']live["']/);
      assert.doesNotMatch(src, /35\.3/);
    }
  });
});
