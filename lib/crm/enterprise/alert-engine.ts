/**
 * Fase 24 — Alertas CRM (evidência obrigatória, sem causa inventada).
 */

import type { CrmAlert, CrmEnterpriseSnapshot, CrmKpiResult } from "./types.ts";

function alert(
  partial: Omit<CrmAlert, "requiresHumanReview" | "autoApplied">,
): CrmAlert {
  return {
    ...partial,
    requiresHumanReview: true,
    autoApplied: false,
  };
}

export function dedupeCrmAlerts(alerts: CrmAlert[]): CrmAlert[] {
  const map = new Map<string, CrmAlert>();
  for (const a of alerts) {
    const prev = map.get(a.dedupeKey);
    if (!prev) {
      map.set(a.dedupeKey, a);
      continue;
    }
    const rank = { info: 0, attention: 1, critical: 2 };
    if (rank[a.severity] >= rank[prev.severity]) map.set(a.dedupeKey, a);
  }
  return [...map.values()];
}

export function buildCrmAlerts(args: {
  snap: CrmEnterpriseSnapshot;
  kpis: CrmKpiResult[];
}): CrmAlert[] {
  const out: CrmAlert[] = [];
  const byId = new Map(args.kpis.map((k) => [k.definitionId, k]));
  const { snap } = args;

  const inativos = byId.get("crm.inativos");
  if (inativos?.value != null && inativos.value > 0) {
    out.push(
      alert({
        id: `crm-inativos-${snap.asOf}`,
        dedupeKey: `inativos:${snap.asOf}`,
        title: "Clientes inativos na carteira",
        description: `${inativos.value} cliente(s) classificados como inativos pela regra do CRM Executivo.`,
        severity: inativos.value >= 10 ? "critical" : "attention",
        relatedKpiIds: ["crm.inativos"],
        recommendation: "Priorizar follow-up nos inativos com maior histórico (sugestão).",
        evidence: [`kpi:crm.inativos=${inativos.value}`, "fonte:CRM Executivo"],
      }),
    );
  }

  const conversao = byId.get("crm.conversao");
  if (conversao?.value != null && conversao.value < 0.1) {
    out.push(
      alert({
        id: `crm-conv-baixa-${snap.asOf}`,
        dedupeKey: `conversao_baixa:${snap.asOf}`,
        title: "Conversão do funil baixa",
        description: `Taxa de conversão ${(conversao.value * 100).toFixed(1)}% no snapshot.`,
        severity: "attention",
        relatedKpiIds: ["crm.conversao"],
        recommendation: "Revisar etapas Proposta/Negociação e motivos de perda.",
        evidence: [`kpi:crm.conversao=${conversao.value}`],
      }),
    );
  }

  const perdidos = byId.get("crm.perda");
  if (perdidos?.value != null && perdidos.value > 0) {
    out.push(
      alert({
        id: `crm-perda-${snap.asOf}`,
        dedupeKey: `perda:${snap.asOf}`,
        title: "Clientes no estágio Perdido",
        description: `${perdidos.value} no funil com estágio perdido.`,
        severity: "info",
        relatedKpiIds: ["crm.perda"],
        recommendation: "Analisar motivos_perda no dashboard CRM (quando disponível).",
        evidence: [`kpi:crm.perda=${perdidos.value}`],
      }),
    );
  }

  if (
    snap.metas?.metaFaturamento != null &&
    snap.metas.realizado != null &&
    snap.metas.realizado < snap.metas.metaFaturamento * 0.85
  ) {
    out.push(
      alert({
        id: `crm-meta-${snap.asOf}`,
        dedupeKey: `meta_fat:${snap.asOf}`,
        title: "Realizado abaixo da meta comercial",
        description: `Realizado ${snap.metas.realizado} vs meta ${snap.metas.metaFaturamento}.`,
        severity: "attention",
        relatedKpiIds: ["crm.faturamento_cliente"],
        recommendation: "Abrir painel de metas e oportunidades abertas.",
        evidence: [
          `meta=${snap.metas.metaFaturamento}`,
          `realizado=${snap.metas.realizado}`,
        ],
      }),
    );
  }

  const follow = snap.followUpsPendentes;
  if (follow != null && follow > 0) {
    out.push(
      alert({
        id: `crm-follow-${snap.asOf}`,
        dedupeKey: `followups:${snap.asOf}`,
        title: "Follow-ups pendentes",
        description: `${follow} tarefa(s)/agendamento(s) pendentes no CRM.`,
        severity: follow >= 20 ? "attention" : "info",
        relatedKpiIds: ["crm.oportunidades_abertas"],
        recommendation: "Concluir ou reagendar follow-ups vencidos (sugestão).",
        evidence: [`followUpsPendentes=${follow}`],
      }),
    );
  }

  return dedupeCrmAlerts(out);
}
