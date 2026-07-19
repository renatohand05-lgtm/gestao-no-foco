import { formatDreHierarchyPath } from "@/lib/dre";
import type { ContaPagarAutofillSuggestion } from "@/lib/master-data/master-data-types";
import { normalizeMasterName } from "@/lib/master-data/master-data-validation";
import type { FornecedorDetail } from "@/types/fornecedores";

/**
 * Sugestões determinísticas — sem IA externa.
 * Nunca inventa classificação sem cadastro/confirmável.
 */
export function suggestContaPagarFromFornecedor(
  fornecedor: FornecedorDetail | null | undefined,
): ContaPagarAutofillSuggestion | null {
  if (!fornecedor) return null;

  const hasDefaults =
    fornecedor.categoria_financeira_id ||
    fornecedor.plano_conta_id ||
    fornecedor.centro_custo_id ||
    fornecedor.forma_pagamento_id ||
    fornecedor.conta_bancaria_id;

  if (!hasDefaults) {
    // Nomes conhecidos só se já houver categoria vinculada no futuro —
    // aqui baixa confiança e não inventa IDs.
    const nome = normalizeMasterName(
      fornecedor.nome_fantasia || fornecedor.nome,
    );
    if (/\benel\b|\bcpfl\b|\blight\b|\benergia\b/.test(nome)) {
      return {
        confidence: "low",
        reasons: [
          "Nome sugere utilidade (energia). Cadastre a categoria padrão no fornecedor para autopreencher com confiança.",
        ],
        source: "nome_exato",
        recorrente: true,
        frequencia: "mensal",
      };
    }
    return null;
  }

  const dreLinha =
    fornecedor.plano_conta?.dre_linha ??
    fornecedor.categoria_financeira?.dre_linha ??
    null;
  const dreDetalhe =
    fornecedor.plano_conta?.dre_detalhe ??
    fornecedor.categoria_financeira?.dre_detalhe ??
    null;

  return {
    categoria_financeira_id: fornecedor.categoria_financeira_id,
    plano_conta_id: fornecedor.plano_conta_id,
    centro_custo_id: fornecedor.centro_custo_id,
    forma_pagamento_id: fornecedor.forma_pagamento_id,
    conta_bancaria_id: fornecedor.conta_bancaria_id,
    recorrente: fornecedor.recorrente,
    frequencia: fornecedor.frequencia,
    prazo_medio_dias: fornecedor.prazo_medio_dias,
    dre_linha: dreLinha,
    dre_detalhe: dreDetalhe,
    dre_path_label: dreLinha
      ? formatDreHierarchyPath(dreLinha as never, dreDetalhe)
      : null,
    confidence: "high",
    reasons: ["Cadastro padrão confirmado do fornecedor."],
    source: "fornecedor_cadastro",
  };
}

/**
 * Aplica sugestão sem sobrescrever campos já preenchidos.
 */
export function mergeAutofillWithoutOverwrite<T extends Record<string, unknown>>(
  current: T,
  suggestion: ContaPagarAutofillSuggestion,
  keys: Array<keyof ContaPagarAutofillSuggestion & string>,
): { next: Partial<T>; applied: string[]; skipped: string[] } {
  const next: Partial<T> = {};
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const key of keys) {
    const suggested = suggestion[key as keyof ContaPagarAutofillSuggestion];
    if (suggested == null || suggested === "") continue;
    const cur = current[key as keyof T];
    const empty =
      cur == null ||
      cur === "" ||
      (typeof cur === "string" && cur.trim() === "");
    if (!empty) {
      skipped.push(key);
      continue;
    }
    (next as Record<string, unknown>)[key] = suggested;
    applied.push(key);
  }

  return { next, applied, skipped };
}
