/**
 * Sprint 25.4.3 — Classificação financeira guiada do fornecedor.
 */

export type SupplierFinanceClassification = {
  categoriaFinanceiraId: string | null;
  subcategoriaId: string | null;
  centroCustoId: string | null;
  grupoDre: string | null;
  contaContabil: string | null;
  condicaoPagamento: string | null;
  formaPagamento: string | null;
  vencimentoPadraoDias: number | null;
  rateio: string | null;
  empresaId: string | null;
  filialId: string | null;
};

export type ClassificationMode = "salvar_padrao" | "somente_esta_compra" | "pendente";

export type ClassificationFlowResult = {
  mode: ClassificationMode;
  classification: SupplierFinanceClassification | null;
  apGeneration: "ready" | "pendente_classificacao" | "blocked";
  message: string;
};

export function resolveSupplierFinanceFlow(input: {
  hasExistingConfig: boolean;
  existing: SupplierFinanceClassification | null;
  provided: SupplierFinanceClassification | null;
  mode: ClassificationMode;
}): ClassificationFlowResult {
  if (input.hasExistingConfig && input.existing) {
    return {
      mode: "salvar_padrao",
      classification: input.existing,
      apGeneration: "ready",
      message: "Usando classificação financeira padrão do fornecedor.",
    };
  }

  if (input.mode === "pendente") {
    return {
      mode: "pendente",
      classification: null,
      apGeneration: "pendente_classificacao",
      message:
        "Recebimento pode ser salvo. Geração financeira permanece pendente de classificação — sem inventar categoria.",
    };
  }

  const c = input.provided;
  if (!c?.categoriaFinanceiraId && !c?.grupoDre) {
    return {
      mode: input.mode,
      classification: null,
      apGeneration: "blocked",
      message:
        "Informe categoria financeira ou grupo DRE, ou escolha “Pendente de classificação”.",
    };
  }

  return {
    mode: input.mode,
    classification: c,
    apGeneration: "ready",
    message:
      input.mode === "somente_esta_compra"
        ? "Classificação aplicada somente nesta compra."
        : "Classificação salva como padrão do fornecedor.",
  };
}

export function isClassificationComplete(
  c: SupplierFinanceClassification | null | undefined,
): boolean {
  if (!c) return false;
  return Boolean(c.categoriaFinanceiraId || c.grupoDre);
}
