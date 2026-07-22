/** UUID v1–v5 (formato canônico). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export type ClassificacaoCustoIds = {
  categoria_financeira_id: string;
  plano_conta_id: string;
  centro_custo_id: string;
};

/**
 * Garante que os três FKs financeiros são UUIDs reais (nunca nome/código).
 * Retorna mensagem em português indicando o que falta.
 */
export function assertClassificacaoCustoIds(input: {
  categoria_financeira_id?: string | null;
  plano_conta_id?: string | null;
  centro_custo_id?: string | null;
}): ClassificacaoCustoIds {
  const faltando: string[] = [];
  if (!isUuid(input.categoria_financeira_id)) {
    faltando.push("categoria financeira");
  }
  if (!isUuid(input.plano_conta_id)) {
    faltando.push("conta contábil (plano de contas)");
  }
  if (!isUuid(input.centro_custo_id)) {
    faltando.push("centro de custo");
  }
  if (faltando.length > 0) {
    throw new Error(
      `Classificação financeira incompleta: selecione ${faltando.join(", ")}.`,
    );
  }
  return {
    categoria_financeira_id: input.categoria_financeira_id!.trim(),
    plano_conta_id: input.plano_conta_id!.trim(),
    centro_custo_id: input.centro_custo_id!.trim(),
  };
}
