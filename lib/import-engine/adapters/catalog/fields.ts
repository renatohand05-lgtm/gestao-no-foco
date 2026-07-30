/**
 * Sprint 25.3 — Campos-alvo importação de catálogo de serviços.
 * Reutilizado pela Import Engine via adapter `catalog`.
 */
import type { ImportFieldDef } from "../../types/index.ts";

export const CATALOG_IMPORT_MODULE = "catalogo_servicos";
export const CATALOG_IMPORT_ENTITY = "servicos";

export const CATALOG_SERVICE_IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "codigo_servico", label: "Código do serviço", required: true, type: "string" },
  { key: "categoria", label: "Categoria", required: true, type: "string" },
  { key: "subcategoria", label: "Subcategoria", required: false, type: "string" },
  { key: "nome_servico", label: "Nome do serviço", required: true, type: "string" },
  { key: "descricao_curta", label: "Descrição curta", required: false, type: "string" },
  { key: "prioridade_comercial", label: "Prioridade comercial", required: false, type: "string" },
  { key: "frequencia_estimada", label: "Frequência estimada", required: false, type: "string" },
  { key: "tempo_padrao_h", label: "Tempo padrão (h)", required: false, type: "number" },
  { key: "tempo_minimo_h", label: "Tempo mínimo (h)", required: false, type: "number" },
  { key: "tempo_maximo_h", label: "Tempo máximo (h)", required: false, type: "number" },
  { key: "complexidade", label: "Complexidade", required: false, type: "string" },
  { key: "preco_venda", label: "Preço de venda", required: false, type: "currency" },
  { key: "garantia_dias", label: "Garantia (dias)", required: false, type: "number" },
  { key: "status", label: "Status", required: false, type: "string" },
  { key: "regiao_referencia", label: "Região de referência", required: false, type: "string" },
  { key: "observacao_tecnica", label: "Observação técnica", required: false, type: "string" },
  { key: "unidade", label: "Unidade", required: false, type: "string" },
];
