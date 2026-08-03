/**
 * Sprint 30.7 — Avaliação e validação de condições (puro).
 */

import type { AutomationCondition, ConditionOperator } from "./types.ts";

const OPS = new Set<ConditionOperator>([
  "eq",
  "neq",
  "gt",
  "lt",
  "gte",
  "lte",
  "contains",
  "not_contains",
  "is_empty",
  "is_not_empty",
  "within_period",
  "outside_period",
  "changed_from",
  "changed_to",
  "stayed_for",
  "occurrence_count",
  "and",
  "or",
]);

export type ConditionContext = {
  tenantId: string;
  fields: Record<string, unknown>;
  previousFields?: Record<string, unknown>;
  nowIso?: string;
};

export type ConditionValidationIssue = {
  code: string;
  message: string;
  conditionId?: string;
};

function isEmpty(v: unknown): boolean {
  return v == null || v === "" || (Array.isArray(v) && v.length === 0);
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

function getField(ctx: ConditionContext, field?: string): unknown {
  if (!field) return undefined;
  if (field.includes(".")) {
    const parts = field.split(".");
    let cur: unknown = ctx.fields;
    for (const p of parts) {
      if (!cur || typeof cur !== "object") return undefined;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
  }
  return ctx.fields[field];
}

/** Impede referência a campos proibidos / cross-tenant. */
const FORBIDDEN_FIELDS = new Set([
  "tenantId",
  "tenant_id",
  "otherTenantId",
  "password",
  "secret",
  "token",
]);

export function validateConditions(
  conditions: AutomationCondition[],
  knownFields?: readonly string[],
): ConditionValidationIssue[] {
  const issues: ConditionValidationIssue[] = [];
  const walk = (list: AutomationCondition[], depth: number) => {
    if (depth > 8) {
      issues.push({
        code: "CONDITION_DEPTH",
        message: "Aninhamento de condições excede o limite (loop/recursão).",
      });
      return;
    }
    for (const c of list) {
      if (!OPS.has(c.op)) {
        issues.push({
          code: "INVALID_OP",
          message: `Operador inválido: ${String(c.op)}`,
          conditionId: c.id,
        });
      }
      if (c.op === "and" || c.op === "or") {
        if (!c.conditions?.length) {
          issues.push({
            code: "EMPTY_GROUP",
            message: "Grupo AND/OR sem condições.",
            conditionId: c.id,
          });
        } else {
          walk(c.conditions, depth + 1);
        }
        continue;
      }
      if (c.field && FORBIDDEN_FIELDS.has(c.field)) {
        issues.push({
          code: "FORBIDDEN_FIELD",
          message: `Campo proibido: ${c.field}`,
          conditionId: c.id,
        });
      }
      if (
        knownFields &&
        c.field &&
        !knownFields.includes(c.field) &&
        !c.field.startsWith("payload.")
      ) {
        issues.push({
          code: "UNKNOWN_FIELD",
          message: `Campo inexistente no gatilho: ${c.field}`,
          conditionId: c.id,
        });
      }
      if (
        (c.op === "gt" ||
          c.op === "lt" ||
          c.op === "gte" ||
          c.op === "lte" ||
          c.op === "occurrence_count") &&
        asNumber(c.value) == null
      ) {
        issues.push({
          code: "INVALID_COMPARE",
          message: "Comparação numérica sem valor válido.",
          conditionId: c.id,
        });
      }
      if (c.op === "gt" && c.valueTo != null && asNumber(c.value) != null) {
        const a = asNumber(c.value)!;
        const b = asNumber(c.valueTo);
        if (b != null && a > b) {
          issues.push({
            code: "IMPOSSIBLE",
            message: "Condição impossível (intervalo invertido).",
            conditionId: c.id,
          });
        }
      }
    }
  };
  walk(conditions, 0);
  return issues;
}

export function evaluateCondition(
  condition: AutomationCondition,
  ctx: ConditionContext,
): boolean {
  if (condition.op === "and") {
    return (condition.conditions ?? []).every((c) => evaluateCondition(c, ctx));
  }
  if (condition.op === "or") {
    return (condition.conditions ?? []).some((c) => evaluateCondition(c, ctx));
  }

  const current = getField(ctx, condition.field);
  const previous = condition.field
    ? ctx.previousFields?.[condition.field]
    : undefined;

  switch (condition.op) {
    case "eq":
      return current === condition.value;
    case "neq":
      return current !== condition.value;
    case "gt": {
      const a = asNumber(current);
      const b = asNumber(condition.value);
      return a != null && b != null && a > b;
    }
    case "lt": {
      const a = asNumber(current);
      const b = asNumber(condition.value);
      return a != null && b != null && a < b;
    }
    case "gte": {
      const a = asNumber(current);
      const b = asNumber(condition.value);
      return a != null && b != null && a >= b;
    }
    case "lte": {
      const a = asNumber(current);
      const b = asNumber(condition.value);
      return a != null && b != null && a <= b;
    }
    case "contains":
      return String(current ?? "")
        .toLowerCase()
        .includes(String(condition.value ?? "").toLowerCase());
    case "not_contains":
      return !String(current ?? "")
        .toLowerCase()
        .includes(String(condition.value ?? "").toLowerCase());
    case "is_empty":
      return isEmpty(current);
    case "is_not_empty":
      return !isEmpty(current);
    case "within_period": {
      if (typeof current !== "string") return false;
      const t = Date.parse(current);
      const from = Date.parse(String(condition.value ?? ""));
      const to = Date.parse(String(condition.valueTo ?? ""));
      return Number.isFinite(t) && t >= from && t <= to;
    }
    case "outside_period": {
      if (typeof current !== "string") return false;
      const t = Date.parse(current);
      const from = Date.parse(String(condition.value ?? ""));
      const to = Date.parse(String(condition.valueTo ?? ""));
      return Number.isFinite(t) && (t < from || t > to);
    }
    case "changed_from":
      return previous === condition.value && current !== previous;
    case "changed_to":
      return current === condition.value && previous !== current;
    case "stayed_for": {
      const since = asNumber(current);
      const need = asNumber(condition.value);
      return since != null && need != null && since >= need;
    }
    case "occurrence_count": {
      const n = asNumber(current);
      const need = asNumber(condition.value);
      return n != null && need != null && n >= need;
    }
    default:
      return false;
  }
}

export function evaluateAllConditions(
  conditions: AutomationCondition[],
  ctx: ConditionContext,
): { matched: boolean; matchedConditions: AutomationCondition[] } {
  if (!conditions.length) {
    return { matched: true, matchedConditions: [] };
  }
  const matchedConditions: AutomationCondition[] = [];
  for (const c of conditions) {
    if (evaluateCondition(c, ctx)) matchedConditions.push(c);
  }
  // Top-level AND implícito (exceto se única condição for OR group)
  if (conditions.length === 1 && conditions[0]?.op === "or") {
    return {
      matched: evaluateCondition(conditions[0], ctx),
      matchedConditions,
    };
  }
  const matched = conditions.every((c) => evaluateCondition(c, ctx));
  return { matched, matchedConditions: matched ? matchedConditions : [] };
}
