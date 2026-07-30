/**
 * Fase 25 — IA determinística de Supply Chain (nunca inventa dados).
 */

import { getSupplyFeatureFlags } from "../supply-feature-flags.ts";
import type {
  SupplyAlert,
  SupplyEnterpriseSnapshot,
  SupplyKpiResult,
  SupplyProductBalance,
} from "./types.ts";

export type SupplyInsight = {
  id: string;
  kind:
    | "reposicao"
    | "ruptura"
    | "excesso"
    | "fornecedor"
    | "parado"
    | "risco_falta"
    | "consumo";
  title: string;
  detail: string;
  produtoId?: string;
  confidence: "high" | "medium" | "low";
};

export type SupplyAiProvider = {
  id: string;
  kind: "deterministic" | "external_stub" | "mock";
  label: string;
  explain: (args: {
    kpis: SupplyKpiResult[];
    alerts: SupplyAlert[];
    snap: SupplyEnterpriseSnapshot;
  }) => SupplyInsight[];
};

function suggestReorder(products: SupplyProductBalance[]): SupplyInsight[] {
  const out: SupplyInsight[] = [];
  for (const p of products) {
    if (p.tipo === "servico") continue;
    const min = p.minimo ?? p.seguranca;
    if (min == null) continue;
    if (p.saldo <= min) {
      const target = p.maximo != null ? Math.max(p.maximo, min) : min * 2;
      const qty = Math.max(0, target - p.saldo);
      if (qty <= 0) continue;
      out.push({
        id: `reposicao-${p.produtoId}`,
        kind: "reposicao",
        title: `Repor ${p.nome}`,
        detail: `Saldo ${p.saldo} ≤ mínimo ${min}. Sugestão determinística: +${qty} (sem previsão inventada).`,
        produtoId: p.produtoId,
        confidence: "high",
      });
    }
  }
  return out.slice(0, 20);
}

function detectRuptureRisk(products: SupplyProductBalance[]): SupplyInsight[] {
  const out: SupplyInsight[] = [];
  for (const p of products) {
    if (p.tipo === "servico") continue;
    if (p.saldo <= 0) {
      out.push({
        id: `ruptura-${p.produtoId}`,
        kind: "ruptura",
        title: `Ruptura: ${p.nome}`,
        detail: "Saldo zerado ou negativo — risco imediato.",
        produtoId: p.produtoId,
        confidence: "high",
      });
      continue;
    }
    if (p.saidasPeriodo > 0 && p.saldo > 0) {
      const daily = p.saidasPeriodo / 90;
      if (daily > 0) {
        const daysLeft = p.saldo / daily;
        if (daysLeft < 14) {
          out.push({
            id: `risco-${p.produtoId}`,
            kind: "risco_falta",
            title: `Risco de falta: ${p.nome}`,
            detail: `Cobertura estimada ~${Math.round(daysLeft)} dia(s) com base no consumo dos últimos 90 dias.`,
            produtoId: p.produtoId,
            confidence: "medium",
          });
        }
      }
    }
  }
  return out.slice(0, 20);
}

function detectExcess(products: SupplyProductBalance[]): SupplyInsight[] {
  const out: SupplyInsight[] = [];
  for (const p of products) {
    if (p.maximo != null && p.saldo > p.maximo) {
      out.push({
        id: `excesso-${p.produtoId}`,
        kind: "excesso",
        title: `Excesso: ${p.nome}`,
        detail: `Saldo ${p.saldo} acima do máximo ${p.maximo}.`,
        produtoId: p.produtoId,
        confidence: "high",
      });
    }
  }
  return out.slice(0, 15);
}

function detectStale(products: SupplyProductBalance[]): SupplyInsight[] {
  return products
    .filter(
      (p) =>
        p.saldo > 0 &&
        p.diasSemMovimentacao != null &&
        p.diasSemMovimentacao >= 90,
    )
    .slice(0, 15)
    .map((p) => ({
      id: `parado-${p.produtoId}`,
      kind: "parado" as const,
      title: `Parado: ${p.nome}`,
      detail: `${p.diasSemMovimentacao} dias sem movimentação (saldo ${p.saldo}).`,
      produtoId: p.produtoId,
      confidence: "high" as const,
    }));
}

function suggestSupplier(snap: SupplyEnterpriseSnapshot): SupplyInsight[] {
  const counts = new Map<string, number>();
  for (const p of snap.products) {
    if (!p.fornecedorPrincipal) continue;
    if (p.saldo <= (p.minimo ?? 0)) {
      counts.set(
        p.fornecedorPrincipal,
        (counts.get(p.fornecedorPrincipal) ?? 0) + 1,
      );
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return [];
  const [nome, n] = ranked[0]!;
  return [
    {
      id: "fornecedor-principal-reposicao",
      kind: "fornecedor",
      title: `Fornecedor recorrente em ruptura: ${nome}`,
      detail: `${n} item(ns) abaixo do mínimo associados a este fornecedor (texto canônico do cadastro).`,
      confidence: "medium",
    },
  ];
}

export const deterministicSupplyProvider: SupplyAiProvider = {
  id: "supply-deterministic-v1",
  kind: "deterministic",
  label: "IA Supply determinística",
  explain({ snap }) {
    return [
      ...suggestReorder(snap.products),
      ...detectRuptureRisk(snap.products),
      ...detectExcess(snap.products),
      ...detectStale(snap.products),
      ...suggestSupplier(snap),
    ].slice(0, 40);
  },
};

export const externalSupplyStubProvider: SupplyAiProvider = {
  id: "supply-external-stub",
  kind: "external_stub",
  label: "IA externa (desligada)",
  explain() {
    return [
      {
        id: "external-off",
        kind: "consumo",
        title: "IA externa desabilitada",
        detail:
          "SUPPLY_EXTERNAL_AI_ENABLED=0 — nenhum dado externo ou inventado.",
        confidence: "low",
      },
    ];
  },
};

export const mockSupplyProvider: SupplyAiProvider = {
  id: "supply-mock",
  kind: "mock",
  label: "Mock (somente testes)",
  explain() {
    return [];
  },
};

export function resolveSupplyProvider(): SupplyAiProvider {
  const flags = getSupplyFeatureFlags();
  if (flags.externalAi) return externalSupplyStubProvider;
  return deterministicSupplyProvider;
}
