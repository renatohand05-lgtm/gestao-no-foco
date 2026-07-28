/**
 * Sprint 22.1 — Metadados em observações (sem migration).
 */

import type { CategoryKind } from "./types.ts";

export type FinanceMeta = {
  categoryId?: string | null;
  costCenterId?: string | null;
  parentId?: string | null;
  kind?: CategoryKind | string | null;
  financeCore?: boolean;
};

const PREFIX = "<!--finance-meta:";
const SUFFIX = "-->";

export function encodeFinanceMeta(
  notes: string | null | undefined,
  meta: FinanceMeta,
): string {
  const base = (notes ?? "").replace(/<!--finance-meta:[\s\S]*?-->/g, "").trim();
  const payload = JSON.stringify({ ...meta, financeCore: true });
  return `${base}${base ? "\n" : ""}${PREFIX}${payload}${SUFFIX}`.trim();
}

export function decodeFinanceMeta(
  notes: string | null | undefined,
): FinanceMeta {
  if (!notes) return {};
  const match = notes.match(/<!--finance-meta:([\s\S]*?)-->/);
  if (!match?.[1]) return {};
  try {
    return JSON.parse(match[1]) as FinanceMeta;
  } catch {
    return {};
  }
}

export function stripFinanceMeta(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const cleaned = notes.replace(/<!--finance-meta:[\s\S]*?-->/g, "").trim();
  return cleaned || null;
}

export function mapCategoryKindToDbTipo(
  kind: CategoryKind,
): "receita" | "despesa" | "ambos" {
  if (kind === "receita") return "receita";
  if (kind === "despesa" || kind === "impostos" || kind === "operacional") {
    return "despesa";
  }
  return "ambos";
}

export function mapDbTipoToCategoryKind(
  tipo: string,
  metaKind?: string | null,
): CategoryKind {
  if (
    metaKind === "receita" ||
    metaKind === "despesa" ||
    metaKind === "transferencia" ||
    metaKind === "investimento" ||
    metaKind === "impostos" ||
    metaKind === "operacional"
  ) {
    return metaKind;
  }
  if (tipo === "receita") return "receita";
  if (tipo === "despesa") return "despesa";
  return "operacional";
}
