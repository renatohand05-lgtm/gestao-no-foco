#!/usr/bin/env node
/**
 * Hotfix piloto — orçamento sem diagnóstico universal + ciclo de vida OS.
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
  "lib/ordens/actions.ts",
  "components/ordens/os-workspace.tsx",
  "components/ordens/os-lifecycle-menu.tsx",
];

describe("budget gate", () => {
  it("1 lava monta orçamento sem diagnóstico; oficina exige", async () => {
    const { requiresDiagnosisBeforeBudget } = await load(
      "lib/ordens/budget-gate.ts",
    );
    const { canEditOrcamento, canApplyAprovacao } = await load(
      "lib/ordens/os-status.ts",
    );
    const { getSegmentUiCopy } = await load("lib/segments/copy.ts");
    const lava = getSegmentUiCopy({ segment: "lava_rapido", ...ENGINE });
    const oficina = getSegmentUiCopy({ segment: "oficina", ...ENGINE });
    assert.equal(requiresDiagnosisBeforeBudget(lava), false);
    assert.equal(requiresDiagnosisBeforeBudget(oficina), true);
    assert.equal(canEditOrcamento("aguardando_diagnostico", false), true);
    assert.equal(canEditOrcamento("aguardando_diagnostico", true), false);
    assert.equal(canEditOrcamento("diagnostico_concluido", true), true);
    assert.equal(canApplyAprovacao("rascunho", false), true);
    for (const segment of [
      "barbearia",
      "clinica_estetica",
      "consultorio_odontologico",
      "consultoria",
    ]) {
      const ui = getSegmentUiCopy({ segment, ...ENGINE });
      assert.equal(requiresDiagnosisBeforeBudget(ui), false, segment);
    }
  });

  it("gate central sem if(segment ===) no workspace/service", () => {
    const ws = read("components/ordens/os-workspace.tsx");
    const svc = read("lib/ordens/ordem-servico-service.ts");
    assert.match(ws, /requiresDiagnosisBeforeBudget/);
    assert.match(ws, /skipDiagnosticoOrcamentoAction/);
    assert.doesNotMatch(ws, /if \(segment ===/);
    assert.match(svc, /requireDiagnosis/);
    assert.match(svc, /skipDiagnosisForBudget/);
    assert.doesNotMatch(svc, /if \(segment ===/);
  });

  it("2-3 oficina preserva diagnóstico e tem override auditado", () => {
    const svc = read("lib/ordens/ordem-servico-service.ts");
    assert.match(svc, /Conclua o diagnóstico antes de montar o orçamento/);
    assert.match(svc, /Orçamento autorizado sem concluir diagnóstico/);
    const ws = read("components/ordens/os-workspace.tsx");
    assert.match(ws, /Montar orçamento sem concluir diagnóstico/);
    assert.match(ws, /justificativa/);
  });

  it("4-10 publicar, versão, link, PDF, WhatsApp, e-mail, copiar link", () => {
    const panel = read("components/ordens/inspecao/inspecao-envio-panel.tsx");
    assert.match(panel, /Publicar orçamento/);
    assert.match(panel, /Salvar rascunho/);
    assert.match(panel, /Gerar link/);
    assert.match(panel, /Copiar link/);
    assert.match(panel, /Baixar PDF/);
    assert.match(panel, /Enviar por WhatsApp/);
    assert.match(panel, /WhatsApp não configurado/);
    assert.match(panel, /E-mail não configurado/);
    assert.match(panel, /buildOrcamentoCustomerMessage/);
    const copy = read("lib/ordens/orcamento-share-copy.ts");
    assert.match(copy, /Seu orçamento está disponível/);
    assert.doesNotMatch(copy, /diagnóstico técnico|prontuário/i);
    const pub = read("lib/ordens/orcamento-versao-service.ts");
    assert.match(pub, /NÃO cria receita/);
    assert.match(pub, /markEnviado/);
    assert.match(read("lib/ordens/inspecao-actions.ts"), /getInspecaoPdfAction/);
  });
});

describe("OS cancel / soft delete / permanent", () => {
  it("11-16 cancelar com motivo, cancelled_at/by, sai da fila, agenda opcional", () => {
    const sql = read(
      "supabase/migrations/20260730_os_dashboard_itens_exclusao.sql",
    );
    assert.match(sql, /cancelado_em/);
    assert.match(sql, /cancelado_por/);
    assert.match(sql, /cancelamento_motivo/);
    assert.match(sql, /os_cancelar_atomico/);
    const reasons = read("lib/ordens/budget-gate.ts");
    assert.match(reasons, /Criada por engano/);
    const dlg = read("components/ordens/os-confirm-dialog.tsx");
    assert.match(dlg, /OS_CANCEL_REASONS/);
    assert.match(dlg, /Também cancelar agendamento/);
    assert.match(dlg, /cancelar_agenda/);
    const co = read("lib/operacoes/centro-operacoes-service.ts");
    assert.match(co, /status === "cancelado"/);
    const menu = read("components/ordens/os-lifecycle-menu.tsx");
    assert.match(menu, /⋯/);
    assert.match(menu, /cancelLabel/);
  });

  it("17-22 exclusão definitiva: admin, guards, EXCLUIR", () => {
    const perms = read("lib/permissoes/constants.ts");
    assert.match(perms, /os\.excluir_permanente/);
    assert.match(perms, /os\.excluir_permanente/);
    const actions = read("lib/ordens/actions.ts");
    assert.match(actions, /excluirPermanentementeOsAction/);
    assert.match(actions, /require\(\s*"os\.excluir_permanente"/);
    const svc = read("lib/ordens/ordem-servico-service.ts");
    assert.match(svc, /excluirPermanentemente/);
    assert.match(svc, /venda_id/);
    assert.match(svc, /estoque_status === "consumido"/);
    assert.match(svc, /eq\("tenant_id", this\.tenantId\)/);
    assert.match(svc, /deleted_at/);
    const dlg = read("components/ordens/os-confirm-dialog.tsx");
    assert.match(dlg, /Digite EXCLUIR/);
    assert.match(dlg, /Cliente, veículo, catálogo e agenda original não são apagados/);
    const defaults = perms.slice(perms.indexOf("member:"));
    assert.match(
      read("lib/permissoes/constants.ts"),
      /k !== "os\.excluir_permanente"/,
    );
    void defaults;
  });

  it("23-25 tenant isolation e RBAC", () => {
    const cancel = read("lib/ordens/actions.ts");
    assert.match(cancel, /require\("os\.cancelar"\)/);
    assert.match(cancel, /requireTenant/);
    const svc = read("lib/ordens/ordem-servico-service.ts");
    assert.match(svc, /p_tenant_id: this.tenantId/);
    assert.match(svc, /OS não encontrada neste tenant/);
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
