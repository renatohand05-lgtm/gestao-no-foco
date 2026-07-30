/**
 * Fase 24 — Pipeline configurável por empresa (chaves canônicas preservadas).
 */

import {
  CRM_FUNIL_LABELS,
  CRM_FUNIL_STAGES,
  type CrmFunilStage,
} from "../constants.ts";
import type { CrmPipelineStageConfig } from "./types.ts";

/** Etapas padrão Fase 24 (Lead → Qualificado → …). */
export function defaultPipelineStages(
  empresaId: string | null = null,
): CrmPipelineStageConfig[] {
  return CRM_FUNIL_STAGES.map((key, idx) => ({
    key,
    label: CRM_FUNIL_LABELS[key],
    sortOrder: idx + 1,
    active: true,
    empresaId,
  }));
}

/**
 * Mescla configuração custom (ex.: de crm_pipeline_stages) com defaults.
 * Chaves desconhecidas são ignoradas — não inventa estágio DB.
 */
export function mergePipelineStages(args: {
  empresaId?: string | null;
  custom?: Array<Partial<CrmPipelineStageConfig> & { key: string }> | null;
}): CrmPipelineStageConfig[] {
  const base = defaultPipelineStages(args.empresaId ?? null);
  if (!args.custom?.length) return base;

  const byKey = new Map(base.map((s) => [s.key, { ...s }]));
  for (const row of args.custom) {
    if (!(CRM_FUNIL_STAGES as readonly string[]).includes(row.key)) continue;
    const key = row.key as CrmFunilStage;
    const prev = byKey.get(key);
    if (!prev) continue;
    byKey.set(key, {
      ...prev,
      label: row.label?.trim() || prev.label,
      sortOrder:
        typeof row.sortOrder === "number" && Number.isFinite(row.sortOrder)
          ? row.sortOrder
          : prev.sortOrder,
      active: row.active ?? prev.active,
      empresaId: row.empresaId ?? prev.empresaId,
    });
  }

  return [...byKey.values()]
    .filter((s) => s.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function assertPipelineStage(value: string | undefined | null): CrmFunilStage {
  if (value && (CRM_FUNIL_STAGES as readonly string[]).includes(value)) {
    return value as CrmFunilStage;
  }
  return "lead";
}

export function isValidPipelineTransition(
  from: CrmFunilStage,
  to: CrmFunilStage,
): boolean {
  if (from === to) return true;
  // Qualquer transição entre estágios canônicos é permitida (revisão humana no Kanban).
  return (CRM_FUNIL_STAGES as readonly string[]).includes(to);
}
