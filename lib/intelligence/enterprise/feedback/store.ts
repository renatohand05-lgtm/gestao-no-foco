/**
 * Fase 27 / 27.6.1 — Feedback.
 * Memória só em testes (INTELLIGENCE_TEST_MEMORY=1).
 */

import type { IntelligenceFeedback } from "../types.ts";
import { randomUUID } from "node:crypto";
import { isIntelligenceTestMemoryEnabled } from "../audit/recorder.ts";

const FEEDBACK: IntelligenceFeedback[] = [];

export function submitIntelligenceFeedback(
  partial: Omit<IntelligenceFeedback, "id" | "createdAt">,
): IntelligenceFeedback {
  const row: IntelligenceFeedback = {
    ...partial,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  if (isIntelligenceTestMemoryEnabled()) {
    FEEDBACK.unshift(row);
  }
  return row;
}

export function listIntelligenceFeedback(tenantId: string): IntelligenceFeedback[] {
  if (!isIntelligenceTestMemoryEnabled()) return [];
  return FEEDBACK.filter((f) => f.tenantId === tenantId);
}

export function clearIntelligenceFeedbackForTests() {
  FEEDBACK.length = 0;
}
