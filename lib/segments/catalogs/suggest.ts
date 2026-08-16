/**
 * Sprint 35.2.1 hotfix — busca sobre a biblioteca oficial de segmento.
 * Única fonte: lib/segments/catalogs/*. Sem lista paralela.
 */
import type { ProdutoTipo } from "../../../types/produtos.ts";
import { getSegmentFormConfig } from "../form-config.ts";
import { hasCapability } from "../resolve.ts";
import type { ResolvedSegmentContext } from "../types.ts";
import { getLibraryForContext } from "./index.ts";
import { normalizeCatalogName, namesAreEquivalent } from "./builder.ts";
import type { SegmentLibraryItem } from "./types.ts";

export type CatalogSuggestionDto = {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultDurationMinutes: number | null;
  suggestedUnit: string | null;
  itemType: ProdutoTipo;
  recommended: boolean;
  /** Reservado para relação serviço↔especialidade (não inventar nesta hotfix). */
  relatedEspecialidade: string | null;
};

export type RankedCatalogSuggestion = CatalogSuggestionDto & {
  alreadyRegistered: boolean;
};

export function serviceSuggestionsForContext(
  ctx: ResolvedSegmentContext,
  options?: { includeCombos?: boolean },
): CatalogSuggestionDto[] {
  const form = getSegmentFormConfig(ctx);
  const allowed = new Set(form.allowedItemTypes.map((option) => option.value));
  const includeCombos = options?.includeCombos !== false;
  return getLibraryForContext(ctx)
    .filter((item) => {
      if (!allowed.has(item.itemType)) return false;
      if (includeCombos) {
        if (!isServiceLikeItemType(item.itemType)) return false;
      } else if (item.itemType !== "servico") {
        return false;
      }
      if (!ctx.usesCapabilityEngine) return true;
      return item.requiredCapabilities.every((capability) =>
        hasCapability(ctx, capability),
      );
    })
    .map(toCatalogSuggestionDto);
}

export function toCatalogSuggestionDto(
  item: SegmentLibraryItem,
): CatalogSuggestionDto {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    description: item.description,
    defaultDurationMinutes: item.defaultDurationMinutes ?? null,
    suggestedUnit: item.suggestedUnit ?? null,
    itemType: item.itemType,
    recommended: item.recommended,
    relatedEspecialidade: null,
  };
}

export function catalogTextMatches(haystack: string, query: string): boolean {
  const q = normalizeCatalogName(query);
  if (!q) return true;
  const h = normalizeCatalogName(haystack);
  return q.split(" ").every((token) => h.includes(token));
}

export function itemMatchesCatalogQuery(
  item: Pick<CatalogSuggestionDto, "name" | "category">,
  query: string,
): boolean {
  return (
    catalogTextMatches(item.name, query) ||
    catalogTextMatches(item.category, query)
  );
}

export function isServiceLikeItemType(tipo: ProdutoTipo | null | undefined): boolean {
  return tipo === "servico" || tipo === "combo" || tipo === "kit";
}

export function rankLibrarySuggestions(input: {
  items: readonly CatalogSuggestionDto[];
  query: string;
  existingNames?: readonly string[];
  limit?: number;
  /** create: mostra "Já cadastrado". adopt: omite já cadastrados. */
  mode?: "create" | "adopt";
}): RankedCatalogSuggestion[] {
  const mode = input.mode ?? "create";
  const limit = input.limit ?? 12;
  const existing = input.existingNames ?? [];
  const q = input.query.trim();
  const ranked: RankedCatalogSuggestion[] = [];

  for (const item of input.items) {
    if (!isServiceLikeItemType(item.itemType)) continue;
    if (q && !itemMatchesCatalogQuery(item, q)) continue;
    const alreadyRegistered = existing.some((name) =>
      namesAreEquivalent(name, item.name),
    );
    if (mode === "adopt" && alreadyRegistered) continue;
    if (!q && !item.recommended && !alreadyRegistered) continue;
    ranked.push({ ...item, alreadyRegistered });
  }

  ranked.sort((a, b) => {
    if (a.alreadyRegistered !== b.alreadyRegistered) {
      return a.alreadyRegistered ? 1 : -1;
    }
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  return ranked.slice(0, limit);
}

export function shouldOfferCustomName(
  query: string,
  items: readonly Pick<CatalogSuggestionDto, "name">[],
): boolean {
  const q = query.trim();
  if (q.length < 2) return false;
  return !items.some((item) => namesAreEquivalent(item.name, q));
}

export function unitFromSuggestion(unit: string | null | undefined): string {
  if (unit === "HR") return "HR";
  if (unit && unit.length <= 4) return unit;
  return "UN";
}
