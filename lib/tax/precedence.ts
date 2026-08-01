/**
 * Sprint 26.8 — Precedência determinística de regras.
 * Não infere precedência silenciosa: prioridade explícita + especificidade.
 */

import type { TaxMatchContext, TaxPrecedenceResult, TaxRule } from "./types.ts";

const SCOPE_KEYS = [
  "branchId",
  "companyId",
  "municipality",
  "state",
  "country",
  "ncm",
  "cest",
  "cfop",
  "serviceCode",
  "cnae",
  "customerType",
  "supplierType",
  "operationType",
  "origin",
  "destination",
] as const;

function inVigencia(rule: TaxRule, asOf: string): boolean {
  if (rule.validFrom > asOf) return false;
  if (rule.validTo && rule.validTo < asOf) return false;
  return true;
}

function scopeMatch(rule: TaxRule, ctx: TaxMatchContext): boolean {
  for (const key of SCOPE_KEYS) {
    const rv = rule[key];
    if (rv == null || rv === "") continue;
    const cv = ctx[key];
    if (cv == null || String(cv) !== String(rv)) return false;
  }
  if (ctx.regimeId && rule.regimeId !== ctx.regimeId) return false;
  if (ctx.taxTypeId && rule.taxTypeId !== ctx.taxTypeId) return false;
  return true;
}

/** Conta campos de escopo preenchidos (mais específico vence em empate de priority). */
export function specificityScore(rule: TaxRule): number {
  let n = 0;
  for (const key of SCOPE_KEYS) {
    const v = rule[key];
    if (v != null && v !== "") n += 1;
  }
  return n;
}

export function isEligibleForProduction(rule: TaxRule): boolean {
  return (
    rule.status === "published" &&
    rule.environment === "producao" &&
    !rule.deletedAt
  );
}

export function isEligibleForEnvironment(
  rule: TaxRule,
  environment: TaxMatchContext["environment"],
): boolean {
  if (rule.deletedAt) return false;
  if (environment === "producao") return isEligibleForProduction(rule);
  if (environment === "simulacao") {
    return (
      rule.environment === "simulacao" ||
      (rule.environment === "producao" && rule.status === "published")
    );
  }
  // configuracao: drafts etc. visíveis para admin, não para calc oficial
  return rule.environment === "configuracao" || rule.status === "draft";
}

/**
 * Resolve regra vencedora.
 * Ordem de decisão documentada (não silenciosa):
 * 1) ambiente/status elegível
 * 2) vigência
 * 3) match de escopo
 * 4) prioridade numérica (maior vence)
 * 5) especificidade (mais campos)
 * 6) versão (maior)
 * Empate total → conflito.
 */
export function resolveTaxRulePrecedence(
  rules: TaxRule[],
  ctx: TaxMatchContext,
): TaxPrecedenceResult {
  const decisionOrder = [
    "environment_status",
    "vigencia",
    "scope_match",
    "priority_desc",
    "specificity_desc",
    "version_desc",
  ];

  const candidates = rules
    .filter((r) => r.tenantId === ctx.tenantId)
    .filter((r) => isEligibleForEnvironment(r, ctx.environment))
    .filter((r) => inVigencia(r, ctx.asOf))
    .filter((r) => scopeMatch(r, ctx));

  if (candidates.length === 0) {
    return {
      candidates: [],
      winner: null,
      reason: "Nenhuma regra elegível para o contexto informado",
      conflicts: [],
      decisionOrder,
    };
  }

  const sorted = [...candidates].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const sb = specificityScore(b) - specificityScore(a);
    if (sb !== 0) return sb;
    return b.version - a.version;
  });

  const top = sorted[0];
  const ties = sorted.filter(
    (r) =>
      r.priority === top.priority &&
      specificityScore(r) === specificityScore(top) &&
      r.version === top.version,
  );

  if (ties.length > 1) {
    return {
      candidates: sorted,
      winner: null,
      reason: "Conflito: empate em prioridade, especificidade e versão",
      conflicts: ties.map((t) => t.id),
      decisionOrder,
    };
  }

  return {
    candidates: sorted,
    winner: top,
    reason: `Vencedora por prioridade=${top.priority}, especificidade=${specificityScore(top)}, versão=${top.version}`,
    conflicts: [],
    decisionOrder,
  };
}
