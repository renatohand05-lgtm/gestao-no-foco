/**
 * Sprint 21.7 RC1 — Processor de SLA / escalonamento automático.
 */

import type { ApprovalRequest } from "../types.ts";
import type { ApprovalRuntimeService } from "./approval-runtime-service.ts";
import { shouldEscalateBySla } from "./approval-runtime.ts";
import type { ApprovalListRequestsQuery } from "../../enterprise/repositories/contracts.ts";
import type { EnterpriseContext } from "../../enterprise/types.ts";

export type ApprovalSlaProcessorReport = {
  scanned: number;
  eligible: number;
  escalated: number;
  skipped: number;
  errors: string[];
  processedIds: string[];
};

export type ProcessApprovalSlaInput = {
  context: EnterpriseContext;
  runtime: ApprovalRuntimeService;
  listRequests: (query: ApprovalListRequestsQuery) => Promise<{
    items: { id: string; approvalKey: string; approvalVersion: string }[];
    total: number;
  }>;
  resolveDomain: (
    requestId: string,
  ) => Promise<ApprovalRequest | null>;
  now?: string | Date;
  maxBatch?: number;
};

function slaIdempotencyKey(requestId: string, levelId: string | null, day: string) {
  return `sla-escalate:${requestId}:${levelId ?? "none"}:${day}`;
}

export async function processApprovalSla(
  input: ProcessApprovalSlaInput,
): Promise<ApprovalSlaProcessorReport> {
  const now = input.now ?? new Date();
  const day = now instanceof Date ? now.toISOString().slice(0, 10) : now.slice(0, 10);
  const maxBatch = Math.min(100, Math.max(1, input.maxBatch ?? 50));
  const report: ApprovalSlaProcessorReport = {
    scanned: 0,
    eligible: 0,
    escalated: 0,
    skipped: 0,
    errors: [],
    processedIds: [],
  };

  const pendingStatuses = ["pending", "partially_approved", "waiting", "requested"];
  const listed = await input.listRequests({
    tenantId: input.context.tenantId,
    status: null,
    page: 1,
    limit: maxBatch,
    orderBy: "createdAt",
    orderDir: "asc",
  });

  for (const row of listed.items) {
    report.scanned += 1;
    const domain = await input.resolveDomain(row.id);
    if (!domain) {
      report.skipped += 1;
      continue;
    }
    if (!pendingStatuses.includes(domain.status)) {
      report.skipped += 1;
      continue;
    }
    if (!shouldEscalateBySla(domain, now)) {
      report.skipped += 1;
      continue;
    }

    report.eligible += 1;
    const levelId = domain.currentLevelIds[0] ?? null;
    const idempotencyKey = slaIdempotencyKey(domain.id, levelId, day);

    try {
      const already = report.processedIds.includes(domain.id);
      if (already) {
        report.skipped += 1;
        continue;
      }

      await input.runtime.escalate(input.context, {
        requestId: domain.id,
        reason: "Escalonamento automático por SLA",
        idempotencyKey,
      });
      report.escalated += 1;
      report.processedIds.push(domain.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no escalonamento SLA.";
      if (message.includes("idempotência") || message.includes("Idempotency")) {
        report.skipped += 1;
      } else {
        report.errors.push(`${domain.id}: ${message}`);
      }
    }
  }

  return report;
}
