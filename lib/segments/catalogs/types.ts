/**
 * Sprint 35.1 — Biblioteca de sugestões de catálogo por segmento.
 * Templates apenas: não representam produtos já cadastrados do tenant.
 */
import type { ProductCapability } from "../capabilities.ts";
import type { ProductSegmentId } from "../types.ts";
import type { ProdutoTipo } from "../../../types/produtos.ts";

export type SegmentLibraryItem = {
  id: string;
  segment: ProductSegmentId;
  category: string;
  name: string;
  description: string;
  defaultDurationMinutes?: number;
  suggestedUnit?: string;
  itemType: ProdutoTipo;
  tags: string[];
  requiredCapabilities: ProductCapability[];
  recommended: boolean;
  active: boolean;
};

export type LibrarySeed = string | {
  name: string;
  description?: string;
  defaultDurationMinutes?: number;
  suggestedUnit?: string;
  itemType?: ProdutoTipo;
  tags?: string[];
  recommended?: boolean;
  active?: boolean;
};

export type LibraryGroup = {
  category: string;
  defaultDurationMinutes?: number;
  defaultItemType?: ProdutoTipo;
  defaultUnit?: string;
  requiredCapabilities?: ProductCapability[];
  /** Marca todos os itens do grupo como recomendados. */
  recommended?: boolean;
  /** Primeiros N itens do grupo são recomendados (default 2). */
  recommendCount?: number;
  items: LibrarySeed[];
};
