/**
 * Sprint 26.8 — Auditoria tributária (formas + recorder in-process para testes).
 */

import type { TaxAuditEvent } from "./types.ts";

const STORE: TaxAuditEvent[] = [];

export function recordTaxAudit(input: Omit<TaxAuditEvent, "id" | "createdAt">): TaxAuditEvent {
  const event: TaxAuditEvent = {
    ...input,
    id: `tax-audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  if (process.env.TAX_TEST_MEMORY === "1") {
    STORE.push(event);
  }
  return event;
}

export function listTaxAuditMemory(tenantId: string): TaxAuditEvent[] {
  if (process.env.TAX_TEST_MEMORY !== "1") return [];
  return STORE.filter((e) => e.tenantId === tenantId);
}

export function clearTaxAuditMemory(): void {
  STORE.length = 0;
}

export function requiredAuditFields(): string[] {
  return [
    "tenantId",
    "actorId",
    "action",
    "entityType",
    "entityId",
    "correlationId",
  ];
}
