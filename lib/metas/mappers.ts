import type { MetaVendasMensal } from "@/types/metas-vendas";
import type {
  MetaVendasFormValues,
  MetaVendasUpdateValues,
} from "@/lib/metas/validations";

/** Normaliza centro opcional para null (meta geral) ou UUID. */
export function normalizeCentroCustoId(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

export function normalizeMetaVendasFormValues(values: MetaVendasFormValues) {
  return {
    competencia: values.competencia,
    valor_meta: values.valor_meta,
    centro_custo_id: normalizeCentroCustoId(values.centro_custo_id),
    observacao: values.observacao?.trim() ? values.observacao.trim() : null,
  };
}

export function normalizeMetaVendasUpdateValues(values: MetaVendasUpdateValues) {
  return {
    valor_meta: values.valor_meta,
    centro_custo_id: normalizeCentroCustoId(values.centro_custo_id),
    observacao: values.observacao?.trim() ? values.observacao.trim() : null,
  };
}

/** Valores do formulário: centro geral usa string vazia no select. */
export function metaVendasToFormValues(item: MetaVendasMensal) {
  return {
    competencia: item.competencia.slice(0, 7),
    valor_meta: Number(item.valor_meta),
    centro_custo_id: item.centro_custo_id ?? "",
    observacao: item.observacao ?? "",
  };
}
