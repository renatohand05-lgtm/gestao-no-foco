/**
 * Fase 25 — Catálogo unificado de produtos (camada enterprise sobre `produtos`).
 * Não cria segunda tabela de catálogo.
 */

import type { ProductEnterpriseTipo } from "./types.ts";

export const PRODUCT_ENTERPRISE_TIPOS: readonly ProductEnterpriseTipo[] = [
  "produto",
  "peca",
  "servico",
  "kit",
  "materia_prima",
  "composto",
  "ativo_consumo",
  "combo",
] as const;

export const PRODUCT_TIPO_LABELS: Record<ProductEnterpriseTipo, string> = {
  produto: "Produto",
  peca: "Peça",
  servico: "Serviço",
  kit: "Kit",
  materia_prima: "Matéria-prima",
  composto: "Produto composto",
  ativo_consumo: "Ativo de consumo",
  combo: "Combo",
};

/** Tipos já persistidos no schema legado de `produtos.tipo`. */
export const LEGACY_PRODUCT_TIPOS = [
  "produto",
  "servico",
  "kit",
  "combo",
  "materia_prima",
] as const;

export function normalizeProductTipo(raw: string): ProductEnterpriseTipo {
  const v = raw.trim().toLowerCase();
  if ((PRODUCT_ENTERPRISE_TIPOS as readonly string[]).includes(v)) {
    return v as ProductEnterpriseTipo;
  }
  return "produto";
}

/** Tipos que impactam saldo físico de estoque. */
export function productTracksStock(tipo: ProductEnterpriseTipo): boolean {
  return tipo !== "servico";
}

export type ProductEnterpriseFields = {
  sku: string | null;
  codigoInterno: string | null;
  codigoBarras: string | null;
  descricao: string;
  descricaoResumida: string | null;
  categoria: string | null;
  subcategoria: string | null;
  fabricante: string | null;
  marca: string | null;
  unidade: string;
  ncm: string | null;
  cest: string | null;
  origem: string | null;
  pesoKg: number | null;
  dimensoes: string | null;
  custoMedio: number | null;
  custoReposicao: number | null;
  precoVenda: number | null;
  precoMinimo: number | null;
  margemAlvo: number | null;
  estoqueMinimo: number | null;
  estoqueMaximo: number | null;
  estoqueSeguranca: number | null;
  localizacao: string | null;
  fornecedorPrincipal: string | null;
  fornecedorAlternativo: string | null;
  ativo: boolean;
  empresaId: string | null;
  filialId: string | null;
};

export function computeTargetMargin(args: {
  custo: number | null;
  precoVenda: number | null;
}): number | null {
  if (args.custo == null || args.precoVenda == null) return null;
  if (!Number.isFinite(args.custo) || !Number.isFinite(args.precoVenda)) {
    return null;
  }
  if (args.precoVenda <= 0) return null;
  return (args.precoVenda - args.custo) / args.precoVenda;
}

export function isBelowMinPrice(args: {
  precoVenda: number | null;
  precoMinimo: number | null;
}): boolean {
  if (args.precoVenda == null || args.precoMinimo == null) return false;
  return args.precoVenda < args.precoMinimo;
}
