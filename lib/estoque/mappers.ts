import type { MovimentacaoFormValues } from "@/lib/estoque/validations";
import type { CreateMovimentacaoInput } from "@/types/estoque";

export function normalizeMovimentacaoFormValues(
  values: MovimentacaoFormValues,
): CreateMovimentacaoInput {
  return {
    produto_id: values.produto_id,
    tipo: values.tipo,
    quantidade: values.quantidade,
    motivo: values.motivo?.trim() || null,
    origem: values.origem.trim(),
    observacoes: values.observacoes?.trim() || null,
  };
}
