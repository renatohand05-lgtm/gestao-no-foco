import { groupLibraryByCategory } from "./builder.ts";
import { getLibraryForContext } from "./index.ts";
import { librarySegmentForContext } from "../library-segment.ts";
import { CATALOG_SEGMENT_SHORT_LABEL } from "../catalog-labels.ts";
import type { ProductSegmentId, ResolvedSegmentContext } from "../types.ts";
import type { SegmentLibraryItem } from "./types.ts";

export { CATALOG_SEGMENT_SHORT_LABEL } from "../catalog-labels.ts";

export const MIN_LIBRARY_COUNTS: Record<ProductSegmentId, number> = {
  oficina: 70,
  barbearia: 55,
  lava_rapido: 54,
  consultoria: 46,
  clinica_estetica: 44,
  consultorio_odontologico: 36,
};

export type CatalogPickerView = {
  segmentId: ProductSegmentId;
  segmentLabel: string;
  title: string;
  description: string;
  emptyCatalogTitle: string;
  emptyCatalogBody: string;
  items: SegmentLibraryItem[];
  categories: string[];
  hasLibrary: boolean;
};

export function catalogSegmentLabel(
  ctx: Pick<ResolvedSegmentContext, "usesCapabilityEngine" | "productSegment">,
): string {
  const id = librarySegmentForContext(ctx);
  return CATALOG_SEGMENT_SHORT_LABEL[id];
}

export function buildCatalogPickerView(
  ctx: Pick<ResolvedSegmentContext, "usesCapabilityEngine" | "productSegment">,
): CatalogPickerView {
  const segmentId = librarySegmentForContext(ctx);
  const segmentLabel = CATALOG_SEGMENT_SHORT_LABEL[segmentId];
  const items = getLibraryForContext(ctx);
  const categories = [...groupLibraryByCategory(items).keys()];
  return {
    segmentId,
    segmentLabel,
    title: `Catálogo sugerido para ${segmentLabel}`,
    description:
      "Selecionamos serviços comuns para o seu tipo de negócio. Escolha os que sua empresa oferece e personalize preços e duração.",
    emptyCatalogTitle: "Nenhum serviço cadastrado ainda.",
    emptyCatalogBody: `Comece com nosso catálogo sugerido para ${segmentLabel} ou crie seu primeiro serviço manualmente.`,
    items,
    categories,
    hasLibrary: items.length > 0,
  };
}
