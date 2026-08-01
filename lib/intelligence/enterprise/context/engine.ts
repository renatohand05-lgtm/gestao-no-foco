/**
 * Fase 27 — Context Engine (snapshot imutável a partir de métricas fornecidas).
 * Não inventa valores — apenas empacota fontes canônicas recebidas.
 */

import { createHash, randomUUID } from "node:crypto";
import type {
  ContextSnapshot,
  IntelligenceRequest,
} from "../types.ts";
import { SCHEMA_VERSION } from "../types.ts";

export type ContextMetricInput = {
  key: string;
  value: unknown;
  source: string;
  available: boolean;
};

export function buildContextSnapshot(input: {
  request: Pick<
    IntelligenceRequest,
    "tenantId" | "companyId" | "branchId" | "period"
  >;
  metrics: ContextMetricInput[];
  dimensions?: Record<string, unknown>;
  warnings?: string[];
}): ContextSnapshot {
  const available = input.metrics.filter((m) => m.available);
  const missingData = input.metrics
    .filter((m) => !m.available)
    .map((m) => m.key);
  const metricsObj: Record<string, unknown> = {};
  for (const m of available) {
    metricsObj[m.key] = m.value;
  }
  const sources = [...new Set(available.map((m) => m.source))];
  const coverage =
    input.metrics.length === 0
      ? 0
      : available.length / input.metrics.length;
  const generatedAt = new Date().toISOString();
  const payload = JSON.stringify({
    tenantId: input.request.tenantId,
    companyId: input.request.companyId ?? null,
    branchId: input.request.branchId ?? null,
    period: input.request.period ?? null,
    metricsObj,
    sources,
  });
  const checksum = createHash("sha256").update(payload).digest("hex").slice(0, 32);
  const frozenMetrics = Object.freeze({ ...metricsObj });

  return Object.freeze({
    snapshotId: randomUUID(),
    tenantId: input.request.tenantId,
    companyId: input.request.companyId ?? null,
    branchId: input.request.branchId ?? null,
    period: input.request.period ?? null,
    generatedAt,
    sources,
    metrics: frozenMetrics,
    dimensions: Object.freeze({ ...(input.dimensions ?? {}) }),
    warnings: Object.freeze([...(input.warnings ?? [])]) as string[],
    missingData: Object.freeze([...missingData]) as string[],
    coverage: Number(coverage.toFixed(3)),
    freshness: coverage > 0 ? 1 : 0,
    schemaVersion: SCHEMA_VERSION,
    checksum,
  }) as ContextSnapshot;
}

export function assertSnapshotImmutable(snapshot: ContextSnapshot): boolean {
  return (
    Object.isFrozen(snapshot) &&
    Object.isFrozen(snapshot.metrics) &&
    Object.isFrozen(snapshot.dimensions) &&
    Object.isFrozen(snapshot.warnings) &&
    Object.isFrozen(snapshot.missingData)
  );
}

export function summarizeSnapshot(snapshot: ContextSnapshot): string {
  const keys = Object.keys(snapshot.metrics);
  if (keys.length === 0) {
    return `Snapshot ${snapshot.snapshotId.slice(0, 8)} sem métricas (faltando: ${snapshot.missingData.join(", ") || "n/d"}).`;
  }
  return `Snapshot ${snapshot.snapshotId.slice(0, 8)} · ${keys.length} métricas · cobertura ${Math.round(snapshot.coverage * 100)}% · fontes: ${snapshot.sources.join(", ")}.`;
}
