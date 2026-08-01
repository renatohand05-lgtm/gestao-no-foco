/**
 * Sprint 26.8 — Versionamento e diff.
 */

import type { TaxRule, TaxRuleDiff, TaxRuleVersion } from "./types.ts";
import { isImmutableStatus } from "./workflow.ts";

const DIFF_FIELDS: Array<keyof TaxRule> = [
  "name",
  "description",
  "regimeId",
  "taxTypeId",
  "jurisdiction",
  "companyId",
  "branchId",
  "country",
  "state",
  "municipality",
  "cnae",
  "ncm",
  "cest",
  "cfop",
  "serviceCode",
  "customerType",
  "supplierType",
  "operationType",
  "origin",
  "destination",
  "priority",
  "validFrom",
  "validTo",
  "rateDefinition",
  "creditDefinition",
  "retentionDefinition",
  "calculationBase",
  "sourceReference",
  "legalReference",
  "environment",
  "status",
];

export function diffTaxRules(
  previous: TaxRule | null,
  current: TaxRule,
  changeReason: string,
  responsible: string,
  estimatedImpact: string | null = null,
): TaxRuleDiff {
  const changedFields: string[] = [];
  if (previous) {
    for (const f of DIFF_FIELDS) {
      const a = JSON.stringify(previous[f] ?? null);
      const b = JSON.stringify(current[f] ?? null);
      if (a !== b) changedFields.push(f);
    }
  } else {
    changedFields.push(...DIFF_FIELDS.filter((f) => current[f] != null));
  }
  return {
    previousVersion: previous?.version ?? null,
    currentVersion: current.version,
    changedFields,
    previous: previous
      ? Object.fromEntries(changedFields.map((f) => [f, previous[f as keyof TaxRule]]))
      : null,
    current: Object.fromEntries(
      changedFields.map((f) => [f, current[f as keyof TaxRule]]),
    ),
    changeReason,
    estimatedImpact,
    validFrom: current.validFrom,
    validTo: current.validTo,
    responsible,
  };
}

export function createDraftFromPublished(
  published: TaxRule,
  input: {
    createdBy: string;
    changeReason: string;
    patch?: Partial<TaxRule>;
  },
): { ok: true; draft: TaxRule } | { ok: false; message: string } {
  if (!isImmutableStatus(published.status) && published.status !== "suspended") {
    return {
      ok: false,
      message: "Somente published/suspended/superseded geram nova versão via este fluxo",
    };
  }
  if (!input.changeReason.trim()) {
    return { ok: false, message: "Motivo da alteração obrigatório" };
  }
  const now = new Date().toISOString();
  const draft: TaxRule = {
    ...published,
    ...input.patch,
    id: cryptoRandom(),
    version: published.version + 1,
    parentVersionId: published.id,
    status: "draft",
    environment: "configuracao",
    createdBy: input.createdBy,
    reviewedBy: null,
    approvedBy: null,
    publishedBy: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  return { ok: true, draft };
}

export function snapshotVersion(
  rule: TaxRule,
  meta: {
    changeReason: string;
    changeSummary: string;
    createdBy: string;
  },
): TaxRuleVersion {
  return {
    id: cryptoRandom(),
    ruleId: rule.id,
    tenantId: rule.tenantId,
    version: rule.version,
    snapshot: { ...rule },
    changeReason: meta.changeReason,
    changeSummary: meta.changeSummary,
    effectiveFrom: rule.validFrom,
    effectiveTo: rule.validTo,
    status: rule.status,
    createdBy: meta.createdBy,
    reviewedBy: rule.reviewedBy,
    approvedBy: rule.approvedBy,
    createdAt: new Date().toISOString(),
  };
}

function cryptoRandom(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tax-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
