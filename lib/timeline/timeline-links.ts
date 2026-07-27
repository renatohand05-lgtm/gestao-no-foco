/**
 * Sprint 21.8 RC1 — Deep links da Activity Timeline.
 * Gerados apenas quando entityType + entityId (e tenant) existem.
 */

import type { TimelineEntityType, TimelineEvent } from "./timeline-types.ts";

export type TimelineDeepLinkInput = {
  tenantSlug?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  source?: string | null;
  targetType?: string | null;
  targetId?: string | null;
};

const ENTITY_PATH: Record<string, string> = {
  cliente: "clientes",
  client: "clientes",
  customer: "clientes",
  fornecedor: "financeiro/fornecedores",
  supplier: "financeiro/fornecedores",
  os: "ordens",
  ordem: "ordens",
  ordem_servico: "ordens",
  work_order: "ordens",
  venda: "vendas",
  sale: "vendas",
  sales: "vendas",
  conta: "financeiro/contas-pagar",
  account: "financeiro/contas-pagar",
  produto: "produtos",
  product: "produtos",
  funcionario: "oficina/mecanicos",
  employee: "oficina/mecanicos",
  mecanico: "oficina/mecanicos",
  aprovacao: "aprovacoes/runtime",
  approval: "aprovacoes/runtime",
  approval_request: "aprovacoes/runtime",
  workflow: "atividade",
  workflow_instance: "atividade",
};

export function normalizeEntityTypeForLink(
  entityType: string | null | undefined,
): TimelineEntityType | string | null {
  if (!entityType?.trim()) return null;
  return entityType.trim().toLowerCase();
}

/**
 * Retorna link relativo ao tenant, ou null se dados insuficientes.
 */
export function buildTimelineDeepLink(
  input: TimelineDeepLinkInput,
): string | null {
  const tenantSlug = input.tenantSlug?.trim();
  if (!tenantSlug) return null;

  const type = normalizeEntityTypeForLink(
    input.entityType ?? input.targetType,
  );
  const id = (input.entityId ?? input.targetId)?.trim() || null;
  if (!type) return null;

  if (type === "aprovacao" || type === "approval" || type === "approval_request") {
    return `/${tenantSlug}/aprovacoes/runtime`;
  }

  if (type === "workflow" || type === "workflow_instance") {
    return id
      ? `/${tenantSlug}/atividade?entityType=workflow&entityId=${encodeURIComponent(id)}`
      : `/${tenantSlug}/atividade`;
  }

  const path = ENTITY_PATH[type];
  if (!path) return null;
  if (!id) {
    // listagem do módulo quando só o tipo existe
    if (path === "aprovacoes/runtime") return `/${tenantSlug}/${path}`;
    return null;
  }

  // aprovacao não usa id na URL dedicada
  if (path === "aprovacoes/runtime") return `/${tenantSlug}/${path}`;

  return `/${tenantSlug}/${path}/${encodeURIComponent(id)}`;
}

export function applyTimelineDeepLinks(
  events: readonly TimelineEvent[],
  tenantSlug: string | null | undefined,
): TimelineEvent[] {
  if (!tenantSlug?.trim()) return [...events];
  return events.map((event) => {
    const link =
      buildTimelineDeepLink({
        tenantSlug,
        entityType: event.entityType,
        entityId: event.entityId,
        source: event.source,
      }) ?? event.link;
    return link === event.link ? event : { ...event, link };
  });
}
