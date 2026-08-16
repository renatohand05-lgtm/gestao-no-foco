import type { CreateProdutoInput } from "@/types/produtos";
import type { SegmentLibraryItem } from "./catalogs/types.ts";
import { namesAreEquivalent } from "./catalogs/builder.ts";
import { getSegmentServiceLibrary } from "./catalogs/index.ts";
import type { ProductSegmentId } from "./types.ts";

export type ExistingCatalogName = {
  nome: string;
};

export type AdoptLibraryPlan = {
  toCreate: SegmentLibraryItem[];
  skippedDuplicate: SegmentLibraryItem[];
  skippedUnknown: string[];
  skippedWrongSegment: string[];
};

export function planLibraryAdoption(
  segment: ProductSegmentId,
  selectedIds: readonly string[],
  existing: readonly ExistingCatalogName[],
): AdoptLibraryPlan {
  const library = getSegmentServiceLibrary(segment);
  const byId = new Map(library.map((item) => [item.id, item]));
  const taken = existing.map((row) => row.nome);
  const toCreate: SegmentLibraryItem[] = [];
  const skippedDuplicate: SegmentLibraryItem[] = [];
  const skippedUnknown: string[] = [];
  const skippedWrongSegment: string[] = [];

  const isTaken = (name: string) =>
    taken.some((existingName) => namesAreEquivalent(existingName, name)) ||
    toCreate.some((item) => namesAreEquivalent(item.name, name));

  for (const rawId of selectedIds) {
    const id = typeof rawId === "string" ? rawId.trim() : "";
    if (!id) continue;
    const item = byId.get(id);
    if (!item) {
      if (id.includes("-") && !id.startsWith(`${segment}-`)) {
        skippedWrongSegment.push(id);
      } else {
        skippedUnknown.push(id);
      }
      continue;
    }
    if (item.segment !== segment) {
      skippedWrongSegment.push(id);
      continue;
    }
    if (!item.active) {
      skippedUnknown.push(id);
      continue;
    }
    if (isTaken(item.name)) {
      skippedDuplicate.push(item);
      continue;
    }
    toCreate.push(item);
    taken.push(item.name);
  }

  return {
    toCreate,
    skippedDuplicate,
    skippedUnknown,
    skippedWrongSegment,
  };
}

export function libraryItemToCreateInput(
  item: SegmentLibraryItem,
): CreateProdutoInput {
  const isServico = item.itemType === "servico";
  const unit =
    item.suggestedUnit === "HR"
      ? "HR"
      : item.suggestedUnit && item.suggestedUnit.length <= 4
        ? item.suggestedUnit
        : "UN";
  return {
    nome: item.name,
    tipo: item.itemType,
    categoria: item.category,
    descricao_resumida: item.description,
    unidade_medida: unit,
    unidade_cobranca: item.suggestedUnit ?? (isServico ? "UN" : null),
    tempo_estimado_minutos: item.defaultDurationMinutes ?? null,
    preco_venda: null,
    preco_sugerido: null,
    custo: null,
    ativo: true,
    controla_estoque: !isServico,
    estoque_atual: 0,
  };
}
