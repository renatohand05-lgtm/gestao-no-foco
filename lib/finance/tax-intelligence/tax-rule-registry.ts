/**
 * Sprint 26.7 — Registro e resolução de regras versionadas.
 * Sem valores default de alíquota: parâmetro ausente = erro explícito.
 */

import { FINANCE_ERROR_CODES, FinanceError } from "../shared/errors.ts";
import type {
  TaxParameterMap,
  TaxParameterValue,
  TaxRegimeCode,
  TaxRuleVersion,
} from "./types.ts";

export function assertRuleActive(rule: TaxRuleVersion, asOf: string): void {
  if (rule.status !== "active" && rule.status !== "draft") {
    throw new FinanceError(
      `Regra tributária ${rule.id} não está utilizável (status=${rule.status}).`,
      FINANCE_ERROR_CODES.VALIDATION,
    );
  }
  if (rule.effectiveFrom > asOf) {
    throw new FinanceError(
      `Regra ${rule.versionLabel} ainda não vigente em ${asOf}.`,
      FINANCE_ERROR_CODES.VALIDATION,
    );
  }
  if (rule.effectiveTo && rule.effectiveTo < asOf) {
    throw new FinanceError(
      `Regra ${rule.versionLabel} expirou em ${rule.effectiveTo}.`,
      FINANCE_ERROR_CODES.VALIDATION,
    );
  }
}

/** Resolve a versão ativa para regime + data — sem inventar regra. */
export function resolveActiveRuleVersion(
  versions: TaxRuleVersion[],
  regimeCode: TaxRegimeCode,
  asOf: string,
  tenantId: string,
): TaxRuleVersion {
  const candidates = versions
    .filter(
      (v) =>
        v.tenantId === tenantId &&
        v.regimeCode === regimeCode &&
        (v.status === "active" || v.status === "draft") &&
        v.effectiveFrom <= asOf &&
        (!v.effectiveTo || v.effectiveTo >= asOf),
    )
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  const active = candidates.find((v) => v.status === "active") ?? candidates[0];
  if (!active) {
    throw new FinanceError(
      `Nenhuma regra versionada ativa para regime ${regimeCode} em ${asOf}. Configure tax_rule_versions.`,
      FINANCE_ERROR_CODES.VALIDATION,
    );
  }
  return active;
}

export function requireParameter(
  parameters: TaxParameterMap,
  key: string,
  ruleLabel: string,
): TaxParameterValue {
  if (!(key in parameters)) {
    throw new FinanceError(
      `Parâmetro tributário obrigatório ausente: "${key}" na regra ${ruleLabel}. Sem hardcode — configure a versão.`,
      FINANCE_ERROR_CODES.VALIDATION,
    );
  }
  return parameters[key]!;
}

export function requireNumberParameter(
  parameters: TaxParameterMap,
  key: string,
  ruleLabel: string,
): number {
  const raw = requireParameter(parameters, key, ruleLabel);
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) {
    throw new FinanceError(
      `Parâmetro "${key}" inválido na regra ${ruleLabel}.`,
      FINANCE_ERROR_CODES.VALIDATION,
    );
  }
  return n;
}

export function listRequiredKeysHint(regimeCode: TaxRegimeCode): string[] {
  switch (regimeCode) {
    case "simples_nacional":
      return ["rate_effective", "base_multiplier"];
    case "lucro_presumido":
      return ["presumption_rate", "rate_effective", "base_multiplier"];
    case "lucro_real":
      return ["rate_effective", "credit_rate", "base_multiplier"];
    case "cbs":
    case "ibs":
      return ["rate_effective", "credit_rate", "base_multiplier"];
    case "custom":
      return ["rate_effective", "base_multiplier"];
    default:
      return ["rate_effective"];
  }
}

export function validateRuleVersionShape(rule: TaxRuleVersion): string[] {
  const missing: string[] = [];
  for (const key of listRequiredKeysHint(rule.regimeCode)) {
    if (!(key in rule.parameters)) missing.push(key);
  }
  return missing;
}
