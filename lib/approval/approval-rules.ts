/**
 * Sprint 21.4 — Rule Engine determinístico (sem eval).
 */

import type { ApprovalContext, ApprovalRule } from "./types.ts";

export type RuleEvalSource = {
  context: ApprovalContext;
  requestData?: Record<string, unknown>;
};

function getByPath(root: unknown, path: string | undefined): unknown {
  if (!path?.trim()) return undefined;
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = root;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function resolvePath(source: RuleEvalSource, path: string | undefined): unknown {
  if (!path) return undefined;
  const p = path.trim();

  if (p.startsWith("variables.")) {
    return getByPath(source.context.variables, p.slice("variables.".length));
  }
  if (p.startsWith("metadata.")) {
    return getByPath(source.context.metadata, p.slice("metadata.".length));
  }
  if (p.startsWith("actor.")) {
    return getByPath(
      source.context.actor ?? {
        userId: source.context.userId,
        roles: source.context.roles,
        permissions: source.context.permissions,
      },
      p.slice("actor.".length),
    );
  }
  if (p.startsWith("target.")) {
    return getByPath(source.context.target ?? {}, p.slice("target.".length));
  }
  if (p.startsWith("data.")) {
    return getByPath(source.requestData ?? {}, p.slice("data.".length));
  }

  switch (p) {
    case "tenantId":
      return source.context.tenantId;
    case "userId":
      return source.context.userId;
    case "amount":
      return source.context.amount;
    case "category":
      return source.context.category;
    case "priority":
      return source.context.priority;
    case "workflowId":
      return source.context.workflowId;
    case "tags":
      return source.context.tags;
    default:
      break;
  }

  const fromVars = getByPath(source.context.variables, p);
  if (fromVars !== undefined) return fromVars;
  return getByPath(source.context.metadata, p);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function equals(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === "string" || typeof b === "string") {
    return String(a) === String(b);
  }
  return false;
}

export function evaluateApprovalRule(
  rule: ApprovalRule | null | undefined,
  source: RuleEvalSource,
): boolean {
  if (!rule || typeof rule !== "object" || !rule.op) return false;

  switch (rule.op) {
    case "all": {
      const list = rule.rules ?? [];
      if (list.length === 0) return false;
      return list.every((r) => evaluateApprovalRule(r, source));
    }
    case "any": {
      const list = rule.rules ?? [];
      if (list.length === 0) return false;
      return list.some((r) => evaluateApprovalRule(r, source));
    }
    case "not":
      if (!rule.rule) return false;
      return !evaluateApprovalRule(rule.rule, source);
    case "exists": {
      const v = resolvePath(source, rule.path);
      return v !== undefined && v !== null && v !== "";
    }
    case "notExists": {
      const v = resolvePath(source, rule.path);
      return v === undefined || v === null || v === "";
    }
    case "equals":
      return equals(resolvePath(source, rule.path), rule.value);
    case "notEquals":
      return !equals(resolvePath(source, rule.path), rule.value);
    case "greaterThan": {
      const a = asNumber(resolvePath(source, rule.path));
      const b = asNumber(rule.value);
      return a != null && b != null && a > b;
    }
    case "greaterThanOrEqual": {
      const a = asNumber(resolvePath(source, rule.path));
      const b = asNumber(rule.value);
      return a != null && b != null && a >= b;
    }
    case "lessThan": {
      const a = asNumber(resolvePath(source, rule.path));
      const b = asNumber(rule.value);
      return a != null && b != null && a < b;
    }
    case "lessThanOrEqual": {
      const a = asNumber(resolvePath(source, rule.path));
      const b = asNumber(rule.value);
      return a != null && b != null && a <= b;
    }
    case "between": {
      const a = asNumber(resolvePath(source, rule.path));
      const min = asNumber(rule.min ?? rule.values?.[0]);
      const max = asNumber(rule.max ?? rule.values?.[1]);
      return a != null && min != null && max != null && a >= min && a <= max;
    }
    case "in": {
      const v = resolvePath(source, rule.path);
      return (rule.values ?? []).some((item) => equals(v, item));
    }
    case "notIn": {
      const v = resolvePath(source, rule.path);
      return !(rule.values ?? []).some((item) => equals(v, item));
    }
    case "contains": {
      const v = resolvePath(source, rule.path);
      if (typeof v === "string") return v.includes(String(rule.value ?? ""));
      if (Array.isArray(v)) return v.some((item) => equals(item, rule.value));
      return false;
    }
    default:
      return false;
  }
}

export function evaluateApprovalRules(
  rules: readonly ApprovalRule[] | null | undefined,
  source: RuleEvalSource,
): boolean {
  if (!rules || rules.length === 0) return true;
  return rules.every((r) => evaluateApprovalRule(r, source));
}
