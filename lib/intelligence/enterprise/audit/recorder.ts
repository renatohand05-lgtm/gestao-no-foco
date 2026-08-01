/**
 * Fase 27 / 27.6.1 — Audit trail.
 * Runtime: apenas via repositório persistente (sem fallback silencioso).
 * Testes: memória só com INTELLIGENCE_TEST_MEMORY=1.
 */

import { redactSensitiveText } from "../privacy/redact.ts";
import type {
  ConfidenceLevel,
  IntelligenceMode,
  IntelligenceModule,
  IntelligenceIntent,
} from "../types.ts";
import { randomUUID } from "node:crypto";

export type IntelligenceAuditEvent = {
  auditId: string;
  correlationId: string;
  at: string;
  userId: string;
  tenantId: string;
  companyId?: string | null;
  branchId?: string | null;
  module: IntelligenceModule;
  intent: IntelligenceIntent;
  mode: IntelligenceMode;
  providerId: string;
  model?: string | null;
  confidenceLevel: ConfidenceLevel;
  limitations: string[];
  sources: string[];
  answerPreview: string;
  recommendationCount: number;
  latencyMs: number;
  estimatedCost?: number | null;
  fallbackReason?: string;
  status: string;
  feedback?: string;
  error?: string;
  persisted?: boolean;
  persistenceCode?: string;
};

const TEST_STORE: IntelligenceAuditEvent[] = [];
const MAX = 2000;

export function isIntelligenceTestMemoryEnabled(): boolean {
  return process.env.INTELLIGENCE_TEST_MEMORY === "1";
}

export function recordIntelligenceAudit(
  partial: Omit<IntelligenceAuditEvent, "auditId" | "at" | "answerPreview"> & {
    answer?: string;
  },
): IntelligenceAuditEvent {
  const redacted = redactSensitiveText(partial.answer ?? "").text;
  const event: IntelligenceAuditEvent = {
    auditId: randomUUID(),
    at: new Date().toISOString(),
    correlationId: partial.correlationId,
    userId: partial.userId,
    tenantId: partial.tenantId,
    companyId: partial.companyId,
    branchId: partial.branchId,
    module: partial.module,
    intent: partial.intent,
    mode: partial.mode,
    providerId: partial.providerId,
    model: partial.model ?? null,
    confidenceLevel: partial.confidenceLevel,
    limitations: partial.limitations,
    sources: partial.sources,
    answerPreview: redacted.slice(0, 280),
    recommendationCount: partial.recommendationCount,
    latencyMs: partial.latencyMs,
    estimatedCost: partial.estimatedCost ?? null,
    fallbackReason: partial.fallbackReason,
    status: partial.status,
    feedback: partial.feedback,
    error: partial.error,
    persisted: false,
    persistenceCode: isIntelligenceTestMemoryEnabled()
      ? "TEST_MEMORY"
      : "NOT_PERSISTED_CALLER_MUST_USE_REPO",
  };

  if (isIntelligenceTestMemoryEnabled()) {
    TEST_STORE.unshift(event);
    if (TEST_STORE.length > MAX) TEST_STORE.length = MAX;
    event.persisted = true;
  }

  return event;
}

export function listIntelligenceAudit(filter?: {
  tenantId?: string;
  correlationId?: string;
  limit?: number;
}): IntelligenceAuditEvent[] {
  if (!isIntelligenceTestMemoryEnabled()) {
    return [];
  }
  let rows = TEST_STORE;
  if (filter?.tenantId) {
    rows = rows.filter((r) => r.tenantId === filter.tenantId);
  }
  if (filter?.correlationId) {
    rows = rows.filter((r) => r.correlationId === filter.correlationId);
  }
  return rows.slice(0, filter?.limit ?? 100);
}

export function clearIntelligenceAuditForTests() {
  TEST_STORE.length = 0;
}
