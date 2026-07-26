/**
 * Action Center do Command Center (Gate 20.7 / RC1).
 * Owner = área funcional determinística · sem pessoas fictícias.
 */

import type { EdcResult } from "../executive-decision-center/types.ts";
import {
  ECC_TOP_N,
  type EccActionItem,
  type EccActionStatus,
} from "./types.ts";

export type EccOwnerArea =
  | "Financeiro"
  | "Estoque e Compras"
  | "Comercial"
  | "Operações"
  | "Gestão de Pessoas"
  | "Gestão";

/**
 * Resolve área responsável a partir da categoria / título da ação.
 * Determinístico · não inventa usuário.
 */
export function resolveActionOwner(
  category: string,
  title = "",
  description = "",
): EccOwnerArea {
  const blob = `${category} ${title} ${description}`.toLowerCase();

  if (
    /financ|caixa|cashflow|margem|despesa|pagar|receber|saldo|lucro|dre/.test(
      blob,
    )
  ) {
    return "Financeiro";
  }
  if (/estoque|invent|compra|sku|parado|perda|fornecedor/.test(blob)) {
    return "Estoque e Compras";
  }
  if (
    /venda|sales|comerc|ticket|convers|fatur|negocia|pipeline|meta|cliente/.test(
      blob,
    )
  ) {
    return "Comercial";
  }
  if (
    /opera|atras|os\b|ordem|oficina|produtiv|capacidade|parad/.test(blob)
  ) {
    return "Operações";
  }
  if (/pessoa|rh|equipe|mecan|colabor|desempenho/.test(blob)) {
    return "Gestão de Pessoas";
  }
  return "Gestão";
}

function statusFromPriority(
  priority: EccActionItem["priority"],
): EccActionStatus {
  if (priority === "critical" || priority === "high") return "pendente";
  if (priority === "medium") return "sugerida";
  return "monitorar";
}

export function buildCommandActions(edc: EdcResult): EccActionItem[] {
  return edc.queue.slice(0, ECC_TOP_N).map((d) => ({
    id: `act:${d.id}`,
    title: d.title,
    description: d.suggestedAction || d.description,
    financialImpactLabel: d.financialImpactLabel,
    priority: d.priority,
    urgency: d.urgency,
    confidence: d.confidence,
    source: d.source,
    category: d.category,
    owner: resolveActionOwner(d.category, d.title, d.description),
    status: statusFromPriority(d.priority),
    href: d.href,
  }));
}

export function buildCommandAlerts(params: {
  risks: Array<{
    id: string;
    title: string;
    description: string;
    priority: EccActionItem["priority"];
    source: string;
    category: string;
    href?: string;
  }>;
  edc: EdcResult;
  feedsAtrasadas: number | null;
  pagarVencido: number | null;
  estoqueZerados: number | null;
}): import("./types.ts").EccAlertItem[] {
  const out: import("./types.ts").EccAlertItem[] = [];
  const seen = new Set<string>();

  const push = (item: import("./types.ts").EccAlertItem) => {
    const key = `${item.kind}:${item.title}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  };

  for (const r of params.risks) {
    const kind =
      /financ|caixa|pagar|receber|saldo/i.test(r.category + r.title)
        ? "finance"
        : /estoque|sku|parado/i.test(r.category + r.title)
          ? "inventory"
          : /opera|atras|os|oficina/i.test(r.category + r.title)
            ? "operations"
            : /comerc|venda|fatur|meta/i.test(r.category + r.title)
              ? "commercial"
              : r.priority === "critical"
                ? "critical"
                : "operations";

    push({
      id: `alert:${r.id}`,
      title: r.title,
      description: r.description,
      kind: r.priority === "critical" ? "critical" : kind,
      priority: r.priority,
      source: r.source,
      href: r.href,
    });
  }

  for (const d of params.edc.queue.filter((x) => x.priority === "critical")) {
    push({
      id: `alert:dec:${d.id}`,
      title: d.title,
      description: d.description,
      kind: "critical",
      priority: "critical",
      source: d.source,
      href: d.href,
    });
  }

  if (params.pagarVencido != null && params.pagarVencido > 0) {
    push({
      id: "alert:feed:pagar",
      title: "Contas a pagar vencidas",
      description: "Há valores a pagar vencidos no snapshot financeiro.",
      kind: "finance",
      priority: "high",
      source: "cockpit",
    });
  }

  if (params.feedsAtrasadas != null && params.feedsAtrasadas > 0) {
    const n = params.feedsAtrasadas;
    push({
      id: "alert:feed:os",
      title: "OS em atraso",
      description:
        n === 1
          ? "1 ordem em atraso no feed operacional."
          : `${n} ordens em atraso no feed operacional.`,
      kind: "operations",
      priority: n >= 3 ? "critical" : "high",
      source: "operacao",
    });
  }

  if (params.estoqueZerados != null && params.estoqueZerados > 0) {
    const n = params.estoqueZerados;
    push({
      id: "alert:feed:estoque",
      title: "Itens zerados no estoque",
      description:
        n === 1
          ? "1 SKU zerado no feed de estoque."
          : `${n} SKUs zerados no feed de estoque.`,
      kind: "inventory",
      priority: "high",
      source: "estoque",
    });
  }

  return out.slice(0, ECC_TOP_N);
}
