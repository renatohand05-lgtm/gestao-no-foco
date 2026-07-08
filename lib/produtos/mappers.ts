import { calcMargemPercent } from "@/lib/produtos/format";
import type { ProdutoFormValues } from "@/lib/produtos/validations";
import type { CreateProdutoInput, Produto } from "@/types/produtos";
import {
  toNumericInputValue,
} from "@/lib/produtos/format";

export function normalizeProdutoFormValues(
  values: ProdutoFormValues,
): CreateProdutoInput {
  const custo = values.custo ?? null;
  const precoVenda = values.preco_venda ?? null;

  return {
    nome: values.nome.trim(),
    tipo: values.tipo,
    codigo_interno: values.codigo_interno?.trim() || null,
    sku: values.sku?.trim() || null,
    codigo_barras: values.codigo_barras?.trim() || null,
    categoria: values.categoria?.trim() || null,
    subcategoria: values.subcategoria?.trim() || null,
    marca: values.marca?.trim() || null,
    unidade_medida: values.unidade_medida.trim(),
    custo,
    preco_venda: precoVenda,
    margem_percent: calcMargemPercent(custo, precoVenda),
    estoque_atual: values.estoque_atual ?? 0,
    estoque_minimo: values.estoque_minimo ?? null,
    estoque_maximo: values.estoque_maximo ?? null,
    localizacao: values.localizacao?.trim() || null,
    fornecedor_principal: values.fornecedor_principal?.trim() || null,
    observacoes: values.observacoes?.trim() || null,
    ativo: values.ativo,
  };
}

export function produtoToFormValues(produto: Produto): ProdutoFormValues {
  return {
    nome: produto.nome,
    tipo: produto.tipo,
    codigo_interno: produto.codigo_interno ?? "",
    sku: produto.sku ?? "",
    codigo_barras: produto.codigo_barras ?? "",
    categoria: produto.categoria ?? "",
    subcategoria: produto.subcategoria ?? "",
    marca: produto.marca ?? "",
    unidade_medida: produto.unidade_medida,
    custo: produto.custo,
    preco_venda: produto.preco_venda,
    estoque_atual: produto.estoque_atual,
    estoque_minimo: produto.estoque_minimo,
    estoque_maximo: produto.estoque_maximo,
    localizacao: produto.localizacao ?? "",
    fornecedor_principal: produto.fornecedor_principal ?? "",
    observacoes: produto.observacoes ?? "",
    ativo: produto.ativo,
  };
}

export function buildProdutoPayload(input: CreateProdutoInput) {
  return {
    nome: input.nome,
    tipo: input.tipo,
    codigo_interno: input.codigo_interno ?? null,
    sku: input.sku ?? null,
    codigo_barras: input.codigo_barras ?? null,
    categoria: input.categoria ?? null,
    subcategoria: input.subcategoria ?? null,
    marca: input.marca ?? null,
    unidade_medida: input.unidade_medida,
    custo: input.custo ?? null,
    preco_venda: input.preco_venda ?? null,
    margem_percent: input.margem_percent ?? null,
    estoque_atual: input.estoque_atual ?? 0,
    estoque_minimo: input.estoque_minimo ?? null,
    estoque_maximo: input.estoque_maximo ?? null,
    localizacao: input.localizacao ?? null,
    fornecedor_principal: input.fornecedor_principal ?? null,
    observacoes: input.observacoes ?? null,
    ativo: input.ativo,
  };
}

export { toNumericInputValue };
