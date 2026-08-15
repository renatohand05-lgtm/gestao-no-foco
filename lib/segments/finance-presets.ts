import type { DespesaPresetId } from "../financeiro/despesa-presets.ts";
import { DESPESA_PRESETS } from "../financeiro/despesa-presets.ts";
import { CONTAS_PAGAR_CATEGORIAS_CATALOG } from "../financeiro/categorias-financeiras-catalog.ts";
import { resolveSegmentContext, type ResolveSegmentInput } from "./resolve.ts";
import { SEGMENT_PROFILES } from "./profiles.ts";
import type { ProductSegmentId } from "./types.ts";

/**
 * Presets financeiros por segmento — só chaves do catálogo 34.9.
 * Não duplica categorias; não inventa IDs.
 */
export function getFinancePresetsForSegment(
  input: ResolveSegmentInput | string | null | undefined,
): readonly DespesaPresetId[] {
  if (typeof input === "string" || input == null) {
    const ctx = resolveSegmentContext({ segment: input });
    if (ctx.profile) return ctx.profile.financePresetIds;
    if (typeof input === "string" && input in SEGMENT_PROFILES) {
      return SEGMENT_PROFILES[input as ProductSegmentId].financePresetIds;
    }
    return [];
  }
  return resolveSegmentContext(input).financePresetIds;
}

export function financePresetsReuseCatalog(
  ids: readonly DespesaPresetId[],
): boolean {
  const presetSet = new Set(DESPESA_PRESETS.map((p) => p.id));
  const catKeys = new Set(CONTAS_PAGAR_CATEGORIAS_CATALOG.flatMap((c) => [...c.presetIds]));
  return ids.every((id) => presetSet.has(id) && catKeys.has(id));
}

export function uniqueFinancePresetIds(
  ids: readonly DespesaPresetId[],
): DespesaPresetId[] {
  return [...new Set(ids)];
}

export function orderDespesaPresetsForSegment(
  input: ResolveSegmentInput | string | null | undefined,
) {
  const prioritized = getFinancePresetsForSegment(input);
  const byId = new Map(DESPESA_PRESETS.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const ordered = [];
  for (const id of prioritized) {
    const preset = byId.get(id);
    if (preset) {
      ordered.push(preset);
      seen.add(id);
    }
  }
  for (const preset of DESPESA_PRESETS) {
    if (!seen.has(preset.id)) ordered.push(preset);
  }
  return ordered;
}
