/**
 * Sprint 26.8 — Vigência e validação de regras.
 */

import type { TaxRule, TaxValidationIssue } from "./types.ts";
import { isImmutableStatus } from "./workflow.ts";

export function validateTaxRuleDraft(
  rule: Partial<TaxRule>,
): TaxValidationIssue[] {
  const issues: TaxValidationIssue[] = [];
  const req: Array<keyof TaxRule> = [
    "tenantId",
    "code",
    "name",
    "regimeId",
    "taxTypeId",
    "jurisdiction",
    "validFrom",
    "sourceReference",
    "status",
    "environment",
    "createdBy",
  ];
  for (const f of req) {
    if (rule[f] == null || rule[f] === "") {
      issues.push({
        code: "REQUIRED",
        severity: "error",
        message: `Campo obrigatório ausente: ${f}`,
        field: f,
      });
    }
  }
  if (!rule.sourceReference) {
    issues.push({
      code: "SOURCE_REQUIRED",
      severity: "error",
      message: "Fonte obrigatória para qualquer regra",
      field: "sourceReference",
    });
  }
  if (rule.validFrom && rule.validTo && rule.validTo < rule.validFrom) {
    issues.push({
      code: "INVALID_VALIDITY",
      severity: "error",
      message: "validTo anterior a validFrom",
      field: "validTo",
    });
  }
  if (rule.status && isImmutableStatus(rule.status) && !rule.publishedAt) {
    issues.push({
      code: "PUBLISH_META",
      severity: "warning",
      message: "Status imutável sem publishedAt",
      field: "publishedAt",
    });
  }
  return issues;
}

export function detectValidityOverlap(
  a: Pick<TaxRule, "id" | "code" | "validFrom" | "validTo" | "tenantId" | "status">,
  b: Pick<TaxRule, "id" | "code" | "validFrom" | "validTo" | "tenantId" | "status">,
): boolean {
  if (a.id === b.id) return false;
  if (a.tenantId !== b.tenantId) return false;
  if (a.code !== b.code) return false;
  if (a.status !== "published" || b.status !== "published") return false;
  const aEnd = a.validTo ?? "9999-12-31";
  const bEnd = b.validTo ?? "9999-12-31";
  return a.validFrom <= bEnd && b.validFrom <= aEnd;
}

export function findOverlappingRules(rules: TaxRule[]): Array<{
  a: string;
  b: string;
  code: string;
}> {
  const out: Array<{ a: string; b: string; code: string }> = [];
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      if (detectValidityOverlap(rules[i], rules[j])) {
        out.push({ a: rules[i].id, b: rules[j].id, code: rules[i].code });
      }
    }
  }
  return out;
}

export function blocksRetroactiveSilentEdit(
  published: TaxRule,
  patch: Partial<TaxRule>,
): TaxValidationIssue | null {
  if (published.status !== "published") return null;
  if (Object.keys(patch).length > 0) {
    return {
      code: "NO_SILENT_RETROACTIVE",
      severity: "error",
      message:
        "Versão publicada é imutável. Crie nova versão (draft) com motivo.",
    };
  }
  return null;
}
