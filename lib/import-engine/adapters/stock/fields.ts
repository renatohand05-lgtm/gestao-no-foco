/**
 * Sprint 25.3 — Campos-alvo importação de produtos / saldo inicial.
 */
import type { ImportFieldDef } from "../../types/index.ts";

export const STOCK_IMPORT_MODULE = "estoque_catalogo";
export const STOCK_IMPORT_ENTITY = "produtos_estoque";

export const STOCK_PRODUCT_IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "sku", label: "SKU", required: false, type: "string" },
  { key: "codigo_interno", label: "Código interno", required: false, type: "string" },
  { key: "codigo_barras", label: "Código de barras", required: false, type: "string" },
  { key: "nome", label: "Nome", required: true, type: "string" },
  { key: "descricao", label: "Descrição", required: false, type: "string" },
  { key: "categoria", label: "Categoria", required: false, type: "string" },
  { key: "subcategoria", label: "Subcategoria", required: false, type: "string" },
  { key: "marca", label: "Marca", required: false, type: "string" },
  { key: "fabricante", label: "Fabricante", required: false, type: "string" },
  { key: "unidade", label: "Unidade", required: false, type: "string" },
  { key: "ncm", label: "NCM", required: false, type: "string" },
  { key: "cest", label: "CEST", required: false, type: "string" },
  { key: "origem", label: "Origem", required: false, type: "string" },
  { key: "custo_medio", label: "Custo médio", required: false, type: "currency" },
  { key: "custo_reposicao", label: "Custo de reposição", required: false, type: "currency" },
  { key: "preco_venda", label: "Preço de venda", required: false, type: "currency" },
  { key: "preco_minimo", label: "Preço mínimo", required: false, type: "currency" },
  { key: "margem_alvo", label: "Margem alvo (%)", required: false, type: "number" },
  { key: "quantidade_atual", label: "Quantidade atual", required: false, type: "number" },
  { key: "estoque_minimo", label: "Estoque mínimo", required: false, type: "number" },
  { key: "estoque_maximo", label: "Estoque máximo", required: false, type: "number" },
  { key: "estoque_seguranca", label: "Estoque de segurança", required: false, type: "number" },
  { key: "deposito", label: "Depósito", required: false, type: "string" },
  { key: "localizacao", label: "Localização", required: false, type: "string" },
  { key: "fornecedor_principal", label: "Fornecedor principal", required: false, type: "string" },
  { key: "lote", label: "Lote", required: false, type: "string" },
  { key: "serie", label: "Série", required: false, type: "string" },
  { key: "validade", label: "Validade", required: false, type: "date" },
  { key: "ativo", label: "Ativo", required: false, type: "enum", enumValues: ["sim", "nao", "true", "false", "1", "0"] },
  { key: "controla_estoque", label: "Controla estoque", required: false, type: "enum", enumValues: ["sim", "nao", "true", "false", "1", "0"] },
  { key: "tipo", label: "Tipo", required: false, type: "string" },
];
