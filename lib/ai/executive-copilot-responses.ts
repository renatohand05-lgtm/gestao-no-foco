/**
 * Executive Copilot — builders de resposta por intenção (Gate 20.3).
 * Textos curtos · evidências reais · sem inventar números.
 */

import type { ExecutiveCopilotContext } from "./executive-copilot-context.ts";
import { canAccessDomain } from "./executive-copilot-context.ts";
import {
  clampEvidence,
  evidenceFromMotivo,
  evidenceModule,
  evidenceScore,
  linkComercial,
  linkCrm,
  linkEstoque,
  linkFinanceiro,
  linkMetas,
  linkOperacao,
  mapBhConfidence,
  permissionDeniedReason,
} from "./executive-copilot-evidence.ts";
import { listSupportedIntentLabels } from "./executive-copilot-intents.ts";
import {
  EXECUTIVE_COPILOT_ENGINE_VERSION,
  EXECUTIVE_COPILOT_MAX_ACTIONS,
  type ExecutiveCopilotAction,
  type ExecutiveCopilotConfidence,
  type ExecutiveCopilotEvidenceItem,
  type ExecutiveCopilotIntent,
  type ExecutiveCopilotResponse,
} from "./executive-copilot-types.ts";

function base(
  intent: ExecutiveCopilotIntent,
  partial: Omit<
    ExecutiveCopilotResponse,
    "intent" | "generatedAt" | "engineVersion"
  > & { generatedAt?: string },
  ctx: ExecutiveCopilotContext,
): ExecutiveCopilotResponse {
  return {
    intent,
    answer: partial.answer,
    summary: partial.summary,
    confidence: partial.confidence,
    evidence: clampEvidence(partial.evidence),
    recommendedActions: partial.recommendedActions.slice(
      0,
      EXECUTIVE_COPILOT_MAX_ACTIONS,
    ),
    relatedLinks: partial.relatedLinks,
    warnings: partial.warnings,
    unavailableReasons: partial.unavailableReasons,
    generatedAt: partial.generatedAt ?? ctx.generatedAt,
    engineVersion: EXECUTIVE_COPILOT_ENGINE_VERSION,
  };
}

function actionsFromRecommendations(
  ctx: ExecutiveCopilotContext,
  domainFilter?: string[],
): ExecutiveCopilotAction[] {
  const conf = mapBhConfidence(ctx.bh.confidence);
  return ctx.ai.recommendations
    .filter((r) => !domainFilter || domainFilter.includes(r.module))
    .slice(0, EXECUTIVE_COPILOT_MAX_ACTIONS)
    .map((r, idx) => ({
      priority: idx + 1,
      title: r.action || r.title,
      description: r.reason,
      impact: r.expectedImpact ?? null,
      domain: (r.module as ExecutiveCopilotAction["domain"]) ?? "geral",
      link: r.href,
      evidence: r.audit?.reason || r.reason,
      confidence: conf,
    }));
}

function actionsFromEicPriorities(
  ctx: ExecutiveCopilotContext,
): ExecutiveCopilotAction[] {
  const conf = mapBhConfidence(ctx.bh.confidence);
  return ctx.eic.prioridades.slice(0, EXECUTIVE_COPILOT_MAX_ACTIONS).map(
    (p, idx) => ({
      priority: idx + 1,
      title: p.title,
      description: p.reason,
      impact: null,
      domain: (typeof p.module === "string"
        ? p.module
        : "geral") as ExecutiveCopilotAction["domain"],
      link: p.href,
      evidence: `Fonte: ${p.source}`,
      confidence: conf,
    }),
  );
}

function overallConfidence(ctx: ExecutiveCopilotContext): ExecutiveCopilotConfidence {
  return mapBhConfidence(ctx.bh.confidence);
}

function denyIfNeeded(
  ctx: ExecutiveCopilotContext,
  domain: Parameters<typeof canAccessDomain>[1],
  label: string,
  intent: ExecutiveCopilotIntent,
): ExecutiveCopilotResponse | null {
  if (canAccessDomain(ctx, domain)) return null;
  return base(
    intent,
    {
      answer: permissionDeniedReason(label),
      summary: `Sem permissão para visualizar ${label}.`,
      confidence: "baixa",
      evidence: [],
      recommendedActions: [],
      relatedLinks: [],
      warnings: ["Permissão insuficiente para este domínio."],
      unavailableReasons: [permissionDeniedReason(label)],
    },
    ctx,
  );
}

export function buildUnknownResponse(
  ctx: ExecutiveCopilotContext,
): ExecutiveCopilotResponse {
  const suggestions = listSupportedIntentLabels().slice(0, 6).join(" · ");
  return base(
    "unknown",
    {
      answer:
        "Essa pergunta ainda não está disponível no Copiloto Executivo.",
      summary: `Sugestões: ${suggestions}`,
      confidence: "baixa",
      evidence: [
        evidenceFromMotivo(
          "geral",
          "Somente intenções determinísticas suportadas nesta versão.",
          "executive-copilot",
          "baixa",
        ),
      ],
      recommendedActions: [],
      relatedLinks: [],
      warnings: ["Intenção não reconhecida."],
      unavailableReasons: ["Pergunta fora do conjunto suportado (Gate 20.3)."],
    },
    ctx,
  );
}

function buildVisaoGeral(ctx: ExecutiveCopilotContext): ExecutiveCopilotResponse {
  const conf = overallConfidence(ctx);
  const scoreEv = evidenceScore(ctx);
  const mods = (
    ["financeiro", "comercial", "operacao", "crm", "estoque"] as const
  )
    .map((m) => evidenceModule(ctx, m))
    .filter(Boolean) as ExecutiveCopilotEvidenceItem[];

  const prio = ctx.eic.priorityHeadline;
  const status = ctx.bh.overallStatusLabel;
  const scoreTxt =
    ctx.bh.overallScore == null
      ? "indisponível"
      : String(ctx.bh.overallScore);

  const warnings: string[] = [];
  if (ctx.ai.partial) warnings.push("Diagnóstico parcial — cobertura incompleta.");
  if (conf === "baixa") {
    warnings.push("Confiança baixa: evite decisão definitiva só com este painel.");
  }

  const unavailable: string[] = [];
  if (ctx.bh.overallScore == null) {
    unavailable.push("Executive Score indisponível por cobertura insuficiente.");
  }

  return base(
    "visao_geral",
    {
      answer: `A empresa está em status ${status} (score ${scoreTxt}).`,
      summary: [
        `Business Health: ${status}.`,
        prio.title
          ? `Prioridade nº1: ${prio.title}.`
          : "Sem prioridade crítica evidenciada.",
        `Confiança dos dados: ${ctx.bh.confidenceLabel}.`,
      ].join(" "),
      confidence: conf,
      evidence: [
        scoreEv,
        ...mods,
        evidenceFromMotivo(
          "geral",
          prio.reason || prio.title,
          "intelligence-center",
          conf,
          prio.href,
        ),
      ],
      recommendedActions: actionsFromEicPriorities(ctx),
      relatedLinks: [
        ...linkFinanceiro(ctx).slice(0, 1),
        ...linkComercial(ctx).slice(0, 1),
        ...linkOperacao(ctx).slice(0, 1),
      ],
      warnings,
      unavailableReasons: unavailable,
    },
    ctx,
  );
}

function buildPrioridade(ctx: ExecutiveCopilotContext): ExecutiveCopilotResponse {
  const conf = overallConfidence(ctx);
  const prio = ctx.eic.priorityHeadline;
  const first = ctx.eic.prioridades[0];

  if (!prio.title && !first) {
    return base(
      "prioridade_do_dia",
      {
        answer: "Não há prioridade crítica evidenciada neste momento.",
        summary: "Decision Engine sem itens prioritários com evidência.",
        confidence: conf,
        evidence: [evidenceScore(ctx)],
        recommendedActions: [],
        relatedLinks: linkOperacao(ctx).slice(0, 1),
        warnings: conf === "baixa" ? ["Cobertura baixa."] : [],
        unavailableReasons: [],
      },
      ctx,
    );
  }

  return base(
    "prioridade_do_dia",
    {
      answer: `Hoje a principal prioridade é: ${prio.title || first?.title}.`,
      summary: prio.reason || first?.reason || "Prioridade do Decision Engine.",
      confidence: conf,
      evidence: [
        evidenceFromMotivo(
          "geral",
          prio.reason || prio.title,
          "decision-engine",
          conf,
          prio.href || first?.href,
        ),
        ...(first
          ? [
              evidenceFromMotivo(
                "geral",
                `Prioridade 1 · fonte ${first.source}`,
                first.source,
                conf,
                first.href,
              ),
            ]
          : []),
        evidenceScore(ctx),
      ],
      recommendedActions: actionsFromEicPriorities(ctx),
      relatedLinks: [
        ...(prio.href
          ? [
              {
                label: "Abrir prioridade",
                href: prio.href,
                domain: "geral" as const,
              },
            ]
          : []),
        ...linkOperacao(ctx).slice(0, 1),
      ],
      warnings: conf === "baixa" ? ["Confiança baixa — valide no módulo."] : [],
      unavailableReasons: [],
    },
    ctx,
  );
}

function buildFinanceiro(ctx: ExecutiveCopilotContext): ExecutiveCopilotResponse {
  const denied = denyIfNeeded(ctx, "financeiro", "financeiro", "financeiro");
  if (denied) return denied;

  const fin = ctx.bh.finance;
  const conf = mapBhConfidence(ctx.bh.confidence);
  const ms = ctx.ai.moduleScores.find((m) => m.module === "financeiro");

  if (fin.coverage === "unavailable" || fin.score == null) {
    return base(
      "financeiro",
      {
        answer: "Dados financeiros insuficientes para uma leitura confiável.",
        summary: "Módulo financeiro indisponível ou sem cobertura.",
        confidence: "baixa",
        evidence: [evidenceModule(ctx, "financeiro")!].filter(Boolean),
        recommendedActions: [],
        relatedLinks: linkFinanceiro(ctx),
        warnings: ["Não declarar saúde do caixa sem evidência."],
        unavailableReasons: ["Fonte financeira indisponível no Decision Engine."],
      },
      ctx,
    );
  }

  const risks = fin.riscos.map((r) =>
    evidenceFromMotivo("financeiro", r.text, r.source, conf),
  );
  const opps = fin.oportunidades.map((o) =>
    evidenceFromMotivo("financeiro", o.text, o.source, conf),
  );

  return base(
    "financeiro",
    {
      answer: `Seu caixa está em status ${fin.statusLabel.toLowerCase()} (${fin.score}/100).`,
      summary: fin.motivos[0]?.text || "Leitura a partir do Business Health Financeiro.",
      confidence:
        fin.coverage === "partial" ? "media" : conf === "alta" ? "alta" : conf,
      evidence: clampEvidence([
        evidenceModule(ctx, "financeiro")!,
        ...fin.motivos.map((m) =>
          evidenceFromMotivo("financeiro", m.text, m.source, conf),
        ),
        ...risks,
        ...opps,
        ...(ms?.penalties.slice(0, 2).map((p) =>
          evidenceFromMotivo("financeiro", p.reason, p.ruleId, conf),
        ) ?? []),
      ]),
      recommendedActions: actionsFromRecommendations(ctx, ["financeiro"]),
      relatedLinks: linkFinanceiro(ctx),
      warnings:
        fin.coverage === "partial"
          ? ["Cobertura financeira parcial."]
          : [],
      unavailableReasons: [],
    },
    ctx,
  );
}

function buildComercial(ctx: ExecutiveCopilotContext): ExecutiveCopilotResponse {
  const denied = denyIfNeeded(ctx, "comercial", "comercial", "comercial");
  if (denied) return denied;
  const mod = ctx.bh.commercial;
  const conf = mapBhConfidence(ctx.bh.confidence);

  if (mod.score == null) {
    return base(
      "comercial",
      {
        answer: "Indicadores comerciais indisponíveis neste momento.",
        summary: "Sem score comercial confiável.",
        confidence: "baixa",
        evidence: [],
        recommendedActions: [],
        relatedLinks: linkComercial(ctx),
        warnings: [],
        unavailableReasons: ["Módulo comercial sem cobertura."],
      },
      ctx,
    );
  }

  return base(
    "comercial",
    {
      answer: `Vendas em status ${mod.statusLabel.toLowerCase()} (${mod.score}/100).`,
      summary: mod.motivos[0]?.text || "Leitura comercial do Business Health.",
      confidence: mod.coverage === "partial" ? "media" : conf,
      evidence: clampEvidence([
        evidenceModule(ctx, "comercial")!,
        ...mod.motivos.map((m) =>
          evidenceFromMotivo("comercial", m.text, m.source, conf),
        ),
        ...mod.riscos.map((r) =>
          evidenceFromMotivo("comercial", r.text, r.source, conf),
        ),
      ]),
      recommendedActions: actionsFromRecommendations(ctx, ["comercial"]),
      relatedLinks: linkComercial(ctx),
      warnings: mod.coverage === "partial" ? ["Dados comerciais parciais."] : [],
      unavailableReasons: [],
    },
    ctx,
  );
}

function buildOperacao(ctx: ExecutiveCopilotContext): ExecutiveCopilotResponse {
  const denied = denyIfNeeded(ctx, "operacao", "operação", "operacao");
  if (denied) return denied;
  const mod = ctx.bh.operation;
  const conf = mapBhConfidence(ctx.bh.confidence);
  if (mod.score == null) {
    return base(
      "operacao",
      {
        answer: "Saúde operacional indisponível por falta de cobertura.",
        summary: "Sem score de operação.",
        confidence: "baixa",
        evidence: [],
        recommendedActions: [],
        relatedLinks: linkOperacao(ctx),
        warnings: [],
        unavailableReasons: ["Módulo operação sem cobertura."],
      },
      ctx,
    );
  }
  return base(
    "operacao",
    {
      answer: `Operação em status ${mod.statusLabel.toLowerCase()} (${mod.score}/100).`,
      summary: mod.motivos[0]?.text || "Leitura operacional do Business Health.",
      confidence: mod.coverage === "partial" ? "media" : conf,
      evidence: clampEvidence([
        evidenceModule(ctx, "operacao")!,
        ...mod.motivos.map((m) =>
          evidenceFromMotivo("operacao", m.text, m.source, conf),
        ),
        ...mod.riscos.map((r) =>
          evidenceFromMotivo("operacao", r.text, r.source, conf),
        ),
      ]),
      recommendedActions: actionsFromRecommendations(ctx, ["operacao"]),
      relatedLinks: linkOperacao(ctx),
      warnings: [],
      unavailableReasons: [],
    },
    ctx,
  );
}

function buildEstoque(ctx: ExecutiveCopilotContext): ExecutiveCopilotResponse {
  const denied = denyIfNeeded(ctx, "estoque", "estoque", "estoque");
  if (denied) return denied;
  const mod = ctx.bh.inventory;
  const conf = mapBhConfidence(ctx.bh.confidence);
  if (mod.score == null) {
    return base(
      "estoque",
      {
        answer: "Risco de estoque não pode ser afirmado — dados indisponíveis.",
        summary: "Sem cobertura de estoque.",
        confidence: "baixa",
        evidence: [],
        recommendedActions: [],
        relatedLinks: linkEstoque(ctx),
        warnings: ["Não declarar ausência de risco com cobertura incompleta."],
        unavailableReasons: ["Módulo estoque sem cobertura."],
      },
      ctx,
    );
  }
  const riskHint =
    mod.status === "critico" || mod.status === "atencao"
      ? `Há sinais de atenção no estoque (${mod.statusLabel}).`
      : `Estoque em status ${mod.statusLabel.toLowerCase()} com base nas evidências disponíveis.`;

  return base(
    "estoque",
    {
      answer: riskHint,
      summary: mod.motivos[0]?.text || "Leitura de estoque do Business Health.",
      confidence: mod.coverage === "partial" ? "media" : conf,
      evidence: clampEvidence([
        evidenceModule(ctx, "estoque")!,
        ...mod.motivos.map((m) =>
          evidenceFromMotivo("estoque", m.text, m.source, conf),
        ),
        ...mod.riscos.map((r) =>
          evidenceFromMotivo("estoque", r.text, r.source, conf),
        ),
        ...mod.oportunidades.map((o) =>
          evidenceFromMotivo("estoque", o.text, o.source, conf),
        ),
      ]),
      recommendedActions: actionsFromRecommendations(ctx, ["estoque"]),
      relatedLinks: linkEstoque(ctx),
      warnings:
        mod.coverage === "partial"
          ? ["Cobertura parcial — não afirmar ausência total de risco."]
          : [],
      unavailableReasons: [],
    },
    ctx,
  );
}

function buildCrm(ctx: ExecutiveCopilotContext): ExecutiveCopilotResponse {
  const denied = denyIfNeeded(ctx, "crm", "CRM", "crm");
  if (denied) return denied;
  const mod = ctx.bh.crm;
  const conf = mapBhConfidence(ctx.bh.confidence);
  if (mod.score == null) {
    return base(
      "crm",
      {
        answer: "Clientes em risco não podem ser listados — CRM sem cobertura.",
        summary: "Módulo CRM indisponível.",
        confidence: "baixa",
        evidence: [],
        recommendedActions: [],
        relatedLinks: linkCrm(ctx),
        warnings: [],
        unavailableReasons: ["Módulo CRM sem cobertura."],
      },
      ctx,
    );
  }
  return base(
    "crm",
    {
      answer: `CRM em status ${mod.statusLabel.toLowerCase()} (${mod.score}/100).`,
      summary: mod.motivos[0]?.text || "Leitura de carteira do Business Health.",
      confidence: mod.coverage === "partial" ? "media" : conf,
      evidence: clampEvidence([
        evidenceModule(ctx, "crm")!,
        ...mod.motivos.map((m) =>
          evidenceFromMotivo("crm", m.text, m.source, conf),
        ),
        ...mod.riscos.map((r) =>
          evidenceFromMotivo("crm", r.text, r.source, conf),
        ),
      ]),
      recommendedActions: actionsFromRecommendations(ctx, ["crm"]),
      relatedLinks: linkCrm(ctx),
      warnings: [],
      unavailableReasons: [],
    },
    ctx,
  );
}

function buildOrdens(ctx: ExecutiveCopilotContext): ExecutiveCopilotResponse {
  const denied = denyIfNeeded(ctx, "ordens", "ordens de serviço", "ordens_servico");
  if (denied) return denied;
  const conf = overallConfidence(ctx);
  const op = ctx.bh.operation;
  const diags = ctx.ai.diagnostics.filter((d) => d.module === "operacao");
  const risks = ctx.eic.riscos.filter(
    (r) => r.module === "operacao" || r.module === "oficina",
  );

  return base(
    "ordens_servico",
    {
      answer:
        risks[0]?.title ||
        diags[0]?.title ||
        (op.score != null
          ? `Operação/OS em status ${op.statusLabel} (${op.score}/100).`
          : "Sem evidência específica de OS críticas no snapshot."),
      summary:
        risks[0]?.description ||
        diags[0]?.description ||
        op.motivos[0]?.text ||
        "Leitura a partir de operação e Decision Engine.",
      confidence: conf,
      evidence: clampEvidence([
        ...(op.score != null ? [evidenceModule(ctx, "operacao")!] : []),
        ...risks.slice(0, 3).map((r) =>
          evidenceFromMotivo(
            "ordens",
            `${r.title}: ${r.description}`,
            "intelligence-center",
            conf,
            r.href,
          ),
        ),
        ...diags.slice(0, 2).map((d) =>
          evidenceFromMotivo(
            "ordens",
            d.title,
            d.source,
            conf,
            d.href,
          ),
        ),
      ]),
      recommendedActions: actionsFromRecommendations(ctx, ["operacao"]),
      relatedLinks: linkOperacao(ctx),
      warnings: conf === "baixa" ? ["Cobertura operacional limitada."] : [],
      unavailableReasons:
        op.score == null && risks.length === 0 && diags.length === 0
          ? ["Sem evidências de OS no snapshot atual."]
          : [],
    },
    ctx,
  );
}

function buildMetas(ctx: ExecutiveCopilotContext): ExecutiveCopilotResponse {
  const denied = denyIfNeeded(ctx, "metas", "metas", "metas");
  if (denied) return denied;
  const conf = overallConfidence(ctx);
  const com = ctx.bh.commercial;
  const ms = ctx.ai.moduleScores.find((m) => m.module === "comercial");
  const metaSignals = [
    ...(ms?.penalties.filter((p) => /meta/i.test(p.ruleId) || /meta/i.test(p.reason)) ??
      []),
    ...(ms?.bonuses.filter((p) => /meta/i.test(p.ruleId) || /meta/i.test(p.reason)) ??
      []),
  ];

  if (com.score == null && metaSignals.length === 0) {
    return base(
      "metas",
      {
        answer: "Não há evidência suficiente para projetar se a meta será batida.",
        summary: "Sem sinal de meta no snapshot comercial.",
        confidence: "baixa",
        evidence: [],
        recommendedActions: [],
        relatedLinks: linkMetas(ctx),
        warnings: ["Não inventar projeção de meta."],
        unavailableReasons: ["Indicadores de meta ausentes ou indisponíveis."],
      },
      ctx,
    );
  }

  const lead =
    metaSignals[0]?.reason ||
    com.motivos[0]?.text ||
    `Comercial em ${com.statusLabel} (${com.score ?? "—"}/100).`;

  return base(
    "metas",
    {
      answer: lead,
      summary:
        "Leitura baseada em sinais comerciais existentes — sem projeção inventada.",
      confidence:
        metaSignals.length === 0 || com.coverage === "partial" ? "media" : conf,
      evidence: clampEvidence([
        ...(com.score != null ? [evidenceModule(ctx, "comercial")!] : []),
        ...metaSignals.map((s) =>
          evidenceFromMotivo(
            "metas",
            s.reason,
            "ruleId" in s ? s.ruleId : "comercial",
            conf,
          ),
        ),
        ...com.riscos.map((r) =>
          evidenceFromMotivo("metas", r.text, r.source, conf),
        ),
      ]),
      recommendedActions: actionsFromRecommendations(ctx, ["comercial"]),
      relatedLinks: linkMetas(ctx),
      warnings: ["Projeção quantitativa só quando o CI já a fornecer."],
      unavailableReasons: [],
    },
    ctx,
  );
}

function buildRiscos(ctx: ExecutiveCopilotContext): ExecutiveCopilotResponse {
  const conf = overallConfidence(ctx);
  const risks = ctx.eic.riscos;
  if (risks.length === 0) {
    return base(
      "riscos",
      {
        answer:
          conf === "baixa"
            ? "Não é possível afirmar ausência de riscos — cobertura insuficiente."
            : "Nenhum risco crítico/alto evidenciado no Intelligence Center.",
        summary: "Lista de riscos vazia no compose atual.",
        confidence: conf,
        evidence: [evidenceScore(ctx)],
        recommendedActions: [],
        relatedLinks: [],
        warnings:
          conf !== "alta"
            ? ["Cobertura parcial — não declarar 'sem risco'."]
            : [],
        unavailableReasons: [],
      },
      ctx,
    );
  }
  return base(
    "riscos",
    {
      answer: `Principal risco: ${risks[0].title}.`,
      summary: risks
        .slice(0, 3)
        .map((r) => r.title)
        .join(" · "),
      confidence: conf,
      evidence: clampEvidence(
        risks.map((r) =>
          evidenceFromMotivo(
            "geral",
            `${r.title}${r.impactLabel ? ` · ${r.impactLabel}` : ""}`,
            "intelligence-center",
            conf,
            r.href,
          ),
        ),
      ),
      recommendedActions: actionsFromEicPriorities(ctx),
      relatedLinks: risks
        .filter((r) => r.href)
        .slice(0, 3)
        .map((r) => ({
          label: r.title,
          href: r.href!,
          domain: "geral" as const,
        })),
      warnings: [],
      unavailableReasons: [],
    },
    ctx,
  );
}

function buildOportunidades(
  ctx: ExecutiveCopilotContext,
): ExecutiveCopilotResponse {
  const conf = overallConfidence(ctx);
  const opps = ctx.eic.oportunidades;
  if (opps.length === 0) {
    return base(
      "oportunidades",
      {
        answer: "Nenhuma oportunidade evidenciada pelos dados atuais.",
        summary: "Intelligence Center sem itens de oportunidade.",
        confidence: conf,
        evidence: [evidenceScore(ctx)],
        recommendedActions: [],
        relatedLinks: linkComercial(ctx).slice(0, 1),
        warnings: [],
        unavailableReasons: [],
      },
      ctx,
    );
  }
  return base(
    "oportunidades",
    {
      answer: `Oportunidade principal: ${opps[0].title}.`,
      summary: opps
        .slice(0, 3)
        .map((o) => o.title)
        .join(" · "),
      confidence: conf,
      evidence: clampEvidence(
        opps.map((o) =>
          evidenceFromMotivo(
            "geral",
            `${o.title}${o.potentialGainLabel ? ` · ${o.potentialGainLabel}` : ""}`,
            "intelligence-center",
            conf,
            o.href,
          ),
        ),
      ),
      recommendedActions: actionsFromRecommendations(ctx),
      relatedLinks: opps
        .filter((o) => o.href)
        .slice(0, 3)
        .map((o) => ({
          label: o.title,
          href: o.href!,
          domain: "geral" as const,
        })),
      warnings: [],
      unavailableReasons: [],
    },
    ctx,
  );
}

function buildPlanoAcao(ctx: ExecutiveCopilotContext): ExecutiveCopilotResponse {
  const conf = overallConfidence(ctx);
  const actions = actionsFromRecommendations(ctx);
  if (actions.length === 0) {
    const fromPrio = actionsFromEicPriorities(ctx);
    if (fromPrio.length === 0) {
      return base(
        "plano_acao",
        {
          answer: "Não há plano de ação pendente com evidência no momento.",
          summary: "Sem recomendações no Decision Engine.",
          confidence: conf,
          evidence: [evidenceScore(ctx)],
          recommendedActions: [],
          relatedLinks: [],
          warnings: [],
          unavailableReasons: [],
        },
        ctx,
      );
    }
    return base(
      "plano_acao",
      {
        answer: `Ação recomendada: ${fromPrio[0].title}.`,
        summary: fromPrio.map((a) => a.title).join(" · "),
        confidence: conf,
        evidence: fromPrio.map((a) =>
          evidenceFromMotivo("geral", a.evidence, "priority", a.confidence, a.link),
        ),
        recommendedActions: fromPrio,
        relatedLinks: fromPrio
          .filter((a) => a.link)
          .map((a) => ({
            label: a.title,
            href: a.link!,
            domain: a.domain,
          })),
        warnings: [],
        unavailableReasons: [],
      },
      ctx,
    );
  }
  return base(
    "plano_acao",
    {
      answer: `Plano: ${actions[0].title}.`,
      summary: actions.map((a) => a.title).join(" · "),
      confidence: conf,
      evidence: actions.map((a) =>
        evidenceFromMotivo("geral", a.evidence, "recommendation", a.confidence, a.link),
      ),
      recommendedActions: actions,
      relatedLinks: actions
        .filter((a) => a.link)
        .map((a) => ({
          label: a.title,
          href: a.link!,
          domain: a.domain,
        })),
      warnings: conf === "baixa" ? ["Confiança baixa — valide antes de executar."] : [],
      unavailableReasons: [],
    },
    ctx,
  );
}

function buildExplicacaoScore(
  ctx: ExecutiveCopilotContext,
): ExecutiveCopilotResponse {
  const conf = overallConfidence(ctx);
  const score = ctx.bh.overallScore;
  if (score == null) {
    return base(
      "explicacao_score",
      {
        answer: "O score está indisponível por cobertura insuficiente.",
        summary: ctx.ai.unavailableSources.length
          ? `Fontes ausentes: ${ctx.ai.unavailableSources.join(", ")}.`
          : "Sem módulos suficientes para o score.",
        confidence: "baixa",
        evidence: [evidenceScore(ctx)],
        recommendedActions: [],
        relatedLinks: [],
        warnings: [],
        unavailableReasons: ["Executive Score null no Decision Engine."],
      },
      ctx,
    );
  }

  const penalties = ctx.ai.moduleScores.flatMap((m) =>
    m.penalties.map((p) => ({ module: m.module, ...p })),
  );
  const top = [...penalties].sort((a, b) => a.delta - b.delta).slice(0, 4);

  return base(
    "explicacao_score",
    {
      answer: `Seu score está em ${score}/100 (${ctx.bh.overallStatusLabel}).`,
      summary:
        top.length > 0
          ? `Principais fatores: ${top.map((t) => t.reason).join(" ")}`
          : "Sem penalidades relevantes registradas nos módulos disponíveis.",
      confidence: conf,
      evidence: clampEvidence([
        evidenceScore(ctx),
        ...top.map((t) =>
          evidenceFromMotivo(
            t.module as ExecutiveCopilotEvidenceItem["domain"],
            `${t.reason} (${t.delta})`,
            t.ruleId,
            conf,
          ),
        ),
        ...(["financeiro", "comercial", "operacao", "crm", "estoque"] as const)
          .map((m) => evidenceModule(ctx, m))
          .filter(Boolean) as ExecutiveCopilotEvidenceItem[],
      ]),
      recommendedActions: actionsFromRecommendations(ctx).slice(0, 2),
      relatedLinks: [],
      warnings: [
        "Faixas Business Health (90/80/65) podem diferir dos rótulos da IA Executiva.",
      ],
      unavailableReasons: [],
    },
    ctx,
  );
}

function buildCobertura(ctx: ExecutiveCopilotContext): ExecutiveCopilotResponse {
  const conf = overallConfidence(ctx);
  const used = ctx.ai.sourcesUsed;
  const missing = ctx.ai.unavailableSources;

  return base(
    "cobertura_dados",
    {
      answer: `Confiança ${ctx.bh.confidenceLabel} · cobertura ${ctx.bh.coveragePct}%.`,
      summary: [
        `${ctx.bh.modulesAvailable} módulo(s) com cobertura.`,
        used.length ? `Em uso: ${used.join(", ")}.` : "",
        missing.length ? `Indisponíveis: ${missing.join(", ")}.` : "Sem fontes ausentes.",
      ]
        .filter(Boolean)
        .join(" "),
      confidence: conf,
      evidence: clampEvidence([
        evidenceFromMotivo(
          "cobertura",
          `Cobertura ${ctx.bh.coveragePct}% · confiança ${ctx.bh.confidenceLabel}`,
          "business-health-engine",
          conf,
        ),
        ...used.map((m) =>
          evidenceFromMotivo(
            "cobertura",
            `Fonte em uso: ${m}`,
            "decision-engine",
            "alta",
          ),
        ),
        ...missing.map((m) =>
          evidenceFromMotivo(
            "cobertura",
            `Fonte indisponível: ${m}`,
            "decision-engine",
            "baixa",
          ),
        ),
      ]),
      recommendedActions: [],
      relatedLinks: [],
      warnings: ctx.ai.partial
        ? ["Diagnóstico marcado como parcial."]
        : [],
      unavailableReasons: missing.map((m) => `Módulo ${m} indisponível.`),
    },
    ctx,
  );
}

export function buildResponseForIntent(
  intent: ExecutiveCopilotIntent,
  ctx: ExecutiveCopilotContext,
): ExecutiveCopilotResponse {
  switch (intent) {
    case "visao_geral":
      return buildVisaoGeral(ctx);
    case "prioridade_do_dia":
      return buildPrioridade(ctx);
    case "financeiro":
      return buildFinanceiro(ctx);
    case "comercial":
      return buildComercial(ctx);
    case "operacao":
      return buildOperacao(ctx);
    case "estoque":
      return buildEstoque(ctx);
    case "crm":
      return buildCrm(ctx);
    case "ordens_servico":
      return buildOrdens(ctx);
    case "metas":
      return buildMetas(ctx);
    case "riscos":
      return buildRiscos(ctx);
    case "oportunidades":
      return buildOportunidades(ctx);
    case "plano_acao":
      return buildPlanoAcao(ctx);
    case "explicacao_score":
      return buildExplicacaoScore(ctx);
    case "cobertura_dados":
      return buildCobertura(ctx);
    default:
      return buildUnknownResponse(ctx);
  }
}
