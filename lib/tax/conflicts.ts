/**
 * Sprint 26.8 — Detecção de conflitos e diagnóstico.
 */

import type { TaxMatchContext, TaxRule, TaxValidationIssue } from "./types.ts";
import { resolveTaxRulePrecedence } from "./precedence.ts";
import { findOverlappingRules, validateTaxRuleDraft } from "./validity.ts";

export type TaxConflictReport = {
  overlapConflicts: Array<{ a: string; b: string; code: string }>;
  precedenceConflicts: string[];
  orphanRules: string[];
  missingParent: string[];
  incomplete: TaxValidationIssue[];
  suspendedApplied: string[];
};

export function diagnoseTaxRules(
  rules: TaxRule[],
  ctx?: TaxMatchContext,
): TaxConflictReport {
  const overlapConflicts = findOverlappingRules(rules);
  let precedenceConflicts: string[] = [];
  if (ctx) {
    const prec = resolveTaxRulePrecedence(rules, ctx);
    precedenceConflicts = prec.conflicts;
  }

  const byId = new Map(rules.map((r) => [r.id, r]));
  const orphanRules = rules
    .filter((r) => r.parentVersionId && !byId.has(r.parentVersionId))
    .map((r) => r.id);

  const missingParent = rules
    .filter((r) => r.version > 1 && !r.parentVersionId)
    .map((r) => r.id);

  const incomplete = rules.flatMap((r) => validateTaxRuleDraft(r));

  const suspendedApplied =
    ctx?.environment === "producao"
      ? rules
          .filter((r) => r.status === "suspended" && r.tenantId === ctx.tenantId)
          .map((r) => r.id)
      : [];

  return {
    overlapConflicts,
    precedenceConflicts,
    orphanRules,
    missingParent,
    incomplete: incomplete.filter((i) => i.severity === "error"),
    suspendedApplied,
  };
}

export function publicationGate(rule: TaxRule): TaxValidationIssue[] {
  const issues = validateTaxRuleDraft(rule);
  if (rule.status !== "approved") {
    issues.push({
      code: "NOT_APPROVED",
      severity: "error",
      message: "Publicação exige status approved",
    });
  }
  if (!rule.sourceReference) {
    issues.push({
      code: "SOURCE_REQUIRED",
      severity: "error",
      message: "Fonte obrigatória para publicar",
    });
  }
  if (!rule.validFrom) {
    issues.push({
      code: "VALIDITY_REQUIRED",
      severity: "error",
      message: "Vigência obrigatória para publicar",
    });
  }
  if (!rule.approvedBy) {
    issues.push({
      code: "APPROVER_REQUIRED",
      severity: "error",
      message: "Aprovador obrigatório para publicar",
    });
  }
  return issues.filter((i) => i.severity === "error");
}
