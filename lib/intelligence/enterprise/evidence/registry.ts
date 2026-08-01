/**
 * Fase 27 — Evidence Registry.
 */

import type { EvidenceItem, IntelligenceModule } from "../types.ts";
import { randomUUID } from "node:crypto";

const REGISTRY = new Map<string, EvidenceItem>();

export function registerEvidence(
  partial: Omit<EvidenceItem, "id"> & { id?: string },
): EvidenceItem {
  const item: EvidenceItem = {
    ...partial,
    id: partial.id ?? randomUUID(),
  };
  REGISTRY.set(item.id, item);
  return item;
}

export function getEvidence(id: string): EvidenceItem | undefined {
  return REGISTRY.get(id);
}

export function getEvidenceByIds(ids: string[]): EvidenceItem[] {
  return ids.map((id) => REGISTRY.get(id)).filter(Boolean) as EvidenceItem[];
}

export function listEvidenceForTenant(tenantId: string): EvidenceItem[] {
  return [...REGISTRY.values()].filter((e) => e.tenantId === tenantId);
}

export function clearEvidenceForTests() {
  REGISTRY.clear();
}

export function makeMetricEvidence(input: {
  tenantId: string;
  module: IntelligenceModule;
  source: string;
  metric: string;
  value: string | number | null;
  period?: string;
  deepLink?: string;
  companyId?: string | null;
  branchId?: string | null;
  reliability?: EvidenceItem["reliability"];
  freshness?: EvidenceItem["freshness"];
}): EvidenceItem {
  return registerEvidence({
    tenantId: input.tenantId,
    companyId: input.companyId ?? null,
    branchId: input.branchId ?? null,
    source: input.source,
    sourceType: "metric",
    module: input.module,
    metric: input.metric,
    period: input.period,
    value: input.value,
    calculatedAt: new Date().toISOString(),
    freshness: input.freshness ?? (input.value == null ? "unknown" : "fresh"),
    reliability:
      input.reliability ??
      (input.value == null ? "indisponivel" : "alta"),
    deepLink: input.deepLink,
  });
}

export function assertEvidencePresent(
  claim: string,
  evidenceIds: string[],
): { ok: boolean; reason?: string } {
  if (!evidenceIds.length) {
    return { ok: false, reason: `Afirmação sem evidência: ${claim}` };
  }
  const found = getEvidenceByIds(evidenceIds);
  if (found.length === 0) {
    return { ok: false, reason: `Evidências não registradas para: ${claim}` };
  }
  return { ok: true };
}
