/**
 * Executive Copilot — evidências e links (Gate 20.3).
 * Somente valores já presentes nas engines.
 */

import { executiveAiCanonicalHref } from "./executive-ai-summary.ts";
import { EXECUTIVE_AI_MODULE_LABEL } from "./executive-ai-summary.ts";
import type { ExecutiveAiModule } from "./executive-ai-types.ts";
import type { ExecutiveCopilotContext } from "./executive-copilot-context.ts";
import { canAccessDomain } from "./executive-copilot-context.ts";
import {
  EXECUTIVE_COPILOT_MAX_EVIDENCE,
  type ExecutiveCopilotConfidence,
  type ExecutiveCopilotDomain,
  type ExecutiveCopilotEvidenceItem,
  type ExecutiveCopilotRelatedLink,
} from "./executive-copilot-types.ts";
import {
  BUSINESS_HEALTH_STATUS_LABEL,
  type BusinessHealthStatus,
} from "../dashboard/business-health-engine.ts";

function reliabilityFromCoverage(
  coverage: "available" | "partial" | "unavailable",
  overall: ExecutiveCopilotConfidence,
): ExecutiveCopilotConfidence {
  if (coverage === "unavailable") return "baixa";
  if (coverage === "partial") {
    return overall === "alta" ? "media" : "baixa";
  }
  return overall;
}

export function mapBhConfidence(
  level: "alta" | "media" | "baixa",
): ExecutiveCopilotConfidence {
  return level;
}

export function evidenceScore(
  ctx: ExecutiveCopilotContext,
): ExecutiveCopilotEvidenceItem {
  const score = ctx.bh.overallScore;
  return {
    domain: "score",
    label: "Business Health Score",
    value: score == null ? "Indisponível" : String(score),
    status: ctx.bh.overallStatusLabel,
    source: "business-health-engine",
    reliability: mapBhConfidence(ctx.bh.confidence),
  };
}

export function evidenceModule(
  ctx: ExecutiveCopilotContext,
  module: ExecutiveAiModule,
): ExecutiveCopilotEvidenceItem | null {
  const keyMap = {
    financeiro: ctx.bh.finance,
    comercial: ctx.bh.commercial,
    operacao: ctx.bh.operation,
    crm: ctx.bh.crm,
    estoque: ctx.bh.inventory,
  } as const;
  const mod = keyMap[module];
  if (!mod) return null;
  return {
    domain: module as ExecutiveCopilotDomain,
    label: EXECUTIVE_AI_MODULE_LABEL[module],
    value: mod.score == null ? "Indisponível" : `${mod.score}/100`,
    status: mod.statusLabel,
    source: "business-health-engine",
    reliability: reliabilityFromCoverage(
      mod.coverage,
      mapBhConfidence(ctx.bh.confidence),
    ),
  };
}

export function evidenceFromMotivo(
  domain: ExecutiveCopilotDomain,
  text: string,
  source: string,
  reliability: ExecutiveCopilotConfidence,
  link?: string,
): ExecutiveCopilotEvidenceItem {
  return {
    domain,
    label: "Motivo",
    value: text,
    status: "evidência",
    source,
    reliability,
    link,
  };
}

export function linkFinanceiro(
  ctx: ExecutiveCopilotContext,
): ExecutiveCopilotRelatedLink[] {
  if (!canAccessDomain(ctx, "financeiro")) return [];
  const t = ctx.tenantSlug;
  return [
    {
      label: "Fluxo de caixa",
      href: executiveAiCanonicalHref(t, "fluxo_caixa"),
      domain: "financeiro",
    },
    {
      label: "Contas a pagar vencidas",
      href: executiveAiCanonicalHref(t, "pagar_vencido"),
      domain: "financeiro",
    },
    {
      label: "Contas a receber vencidas",
      href: executiveAiCanonicalHref(t, "receber_vencido"),
      domain: "financeiro",
    },
  ];
}

export function linkComercial(
  ctx: ExecutiveCopilotContext,
): ExecutiveCopilotRelatedLink[] {
  if (!canAccessDomain(ctx, "comercial")) return [];
  const t = ctx.tenantSlug;
  return [
    {
      label: "Inteligência Comercial",
      href: executiveAiCanonicalHref(t, "vendas_ci"),
      domain: "comercial",
    },
    {
      label: "Orçamentos",
      href: executiveAiCanonicalHref(t, "vendas_orcamento"),
      domain: "comercial",
    },
  ];
}

export function linkOperacao(
  ctx: ExecutiveCopilotContext,
): ExecutiveCopilotRelatedLink[] {
  const out: ExecutiveCopilotRelatedLink[] = [];
  const t = ctx.tenantSlug;
  if (canAccessDomain(ctx, "ordens")) {
    out.push({
      label: "OS atrasadas",
      href: executiveAiCanonicalHref(t, "ordens_atrasadas"),
      domain: "ordens",
    });
    out.push({
      label: "OS aguardando aprovação",
      href: executiveAiCanonicalHref(t, "ordens_aprovacao"),
      domain: "ordens",
    });
  }
  if (canAccessDomain(ctx, "centroOperacoes")) {
    out.push({
      label: "Centro de Operações",
      href: executiveAiCanonicalHref(t, "ordens_paradas"),
      domain: "operacao",
    });
  }
  return out;
}

export function linkEstoque(
  ctx: ExecutiveCopilotContext,
): ExecutiveCopilotRelatedLink[] {
  if (!canAccessDomain(ctx, "estoque")) return [];
  const t = ctx.tenantSlug;
  return [
    {
      label: "Estoque zerado",
      href: executiveAiCanonicalHref(t, "estoque_zerado"),
      domain: "estoque",
    },
    {
      label: "Abaixo do mínimo",
      href: executiveAiCanonicalHref(t, "estoque_abaixo"),
      domain: "estoque",
    },
    {
      label: "Dashboard de estoque",
      href: executiveAiCanonicalHref(t, "estoque_dashboard"),
      domain: "estoque",
    },
  ];
}

export function linkCrm(
  ctx: ExecutiveCopilotContext,
): ExecutiveCopilotRelatedLink[] {
  if (!canAccessDomain(ctx, "crm")) return [];
  return [
    {
      label: "Central de clientes",
      href: executiveAiCanonicalHref(ctx.tenantSlug, "clientes_central"),
      domain: "crm",
    },
  ];
}

export function linkMetas(
  ctx: ExecutiveCopilotContext,
): ExecutiveCopilotRelatedLink[] {
  if (!canAccessDomain(ctx, "metas")) return [];
  return [
    {
      label: "Configurar metas",
      href: `/${ctx.tenantSlug}/configuracoes/metas`,
      domain: "metas",
    },
    {
      label: "Inteligência Comercial",
      href: executiveAiCanonicalHref(ctx.tenantSlug, "vendas_ci"),
      domain: "comercial",
    },
  ];
}

export function clampEvidence(
  items: ExecutiveCopilotEvidenceItem[],
): ExecutiveCopilotEvidenceItem[] {
  return items.slice(0, EXECUTIVE_COPILOT_MAX_EVIDENCE);
}

export function statusLabel(status: BusinessHealthStatus): string {
  return BUSINESS_HEALTH_STATUS_LABEL[status];
}

export function permissionDeniedReason(domain: string): string {
  return `Visualização de ${domain} depende de permissão. Dado não exibido.`;
}
