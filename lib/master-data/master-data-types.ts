/**
 * Master Data types — Sprint 13.16
 * Não altera cálculos DRE / Fluxo / Dashboard.
 */

export type MasterEntityType =
  | "fornecedor"
  | "cliente"
  | "produto"
  | "servico"
  | "categoria"
  | "plano"
  | "centro_custo"
  | "conta_bancaria"
  | "forma_pagamento"
  | "conta_pagar"
  | "conta_receber"
  | "venda"
  | "ordem_servico"
  | "dre_linha";

export type MasterSearchHit = {
  id: string;
  type: MasterEntityType;
  label: string;
  subtitle?: string | null;
  href: string;
  meta?: Record<string, string | null | undefined>;
};

export type MasterSuggestionConfidence = "high" | "medium" | "low";

export type ContaPagarAutofillSuggestion = {
  categoria_financeira_id?: string | null;
  plano_conta_id?: string | null;
  centro_custo_id?: string | null;
  forma_pagamento_id?: string | null;
  conta_bancaria_id?: string | null;
  recorrente?: boolean;
  frequencia?: string | null;
  prazo_medio_dias?: number | null;
  dre_linha?: string | null;
  dre_detalhe?: string | null;
  dre_path_label?: string | null;
  tags?: string[];
  confidence: MasterSuggestionConfidence;
  reasons: string[];
  source: "fornecedor_cadastro" | "nome_exato" | "documento";
};

export type DedupMatch = {
  entityType: MasterEntityType;
  id: string;
  label: string;
  matchedOn: string[];
  href?: string;
};

export type DedupCheckResult = {
  hasDuplicates: boolean;
  matches: DedupMatch[];
};

export type TagRecord = {
  id: string;
  tenant_id: string;
  nome: string;
  slug: string;
  cor: string | null;
  ativo: boolean;
};

export type MasterEntityTagTarget =
  | "fornecedor"
  | "cliente"
  | "produto"
  | "categoria"
  | "plano"
  | "centro_custo";
