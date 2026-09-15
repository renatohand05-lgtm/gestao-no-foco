/**
 * Dias de operação da empresa — usado pra projeção de meta e sazonalidade
 * não tratarem dias fechados (ex.: domingo) como se fossem dia de trabalho.
 *
 * Convenção: 0=domingo, 1=segunda, ..., 6=sábado (igual Date.getDay()).
 * Quando o tenant não configurou nada, o padrão é segunda a sexta — o
 * comportamento histórico do sistema — pra não mudar ninguém que ainda não
 * configurou isso.
 */

export const DIA_SEMANA_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

export const DIA_SEMANA_LABELS_CURTOS: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

export const DIAS_OPERACAO_PADRAO: number[] = [1, 2, 3, 4, 5];

/** Segunda a sábado — sugestão comum pra oficina/lava-rápido (fechado domingo). */
export const DIAS_OPERACAO_SUGESTAO_SEG_SAB: number[] = [1, 2, 3, 4, 5, 6];

function isValidDiasOperacao(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 7 &&
    value.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  );
}

/**
 * Lê `dias_operacao` de dentro do `segment_config` (jsonb) do tenant.
 * Aceita `unknown` porque `segment_config` chega como jsonb sem tipo forte.
 */
export function resolveDiasOperacao(segmentConfig: unknown): number[] {
  if (
    segmentConfig &&
    typeof segmentConfig === "object" &&
    "dias_operacao" in segmentConfig
  ) {
    const raw = (segmentConfig as Record<string, unknown>).dias_operacao;
    if (isValidDiasOperacao(raw)) {
      return [...new Set(raw)].sort((a, b) => a - b);
    }
  }
  return DIAS_OPERACAO_PADRAO;
}

/** Conta quantos dias de operação existem de `fromDay` a `toDay` (inclusive) no mês. */
export function countDiasOperacaoInRange(
  diasOperacao: number[],
  year: number,
  monthIndex: number,
  fromDay: number,
  toDay: number,
): number {
  if (toDay < fromDay) return 0;
  const set = new Set(diasOperacao);
  let count = 0;
  for (let day = fromDay; day <= toDay; day += 1) {
    const dow = new Date(year, monthIndex, day).getDay();
    if (set.has(dow)) count += 1;
  }
  return count;
}

export function countDiasOperacaoInMonth(
  diasOperacao: number[],
  year: number,
  monthIndex: number,
): number {
  const diasTotais = new Date(year, monthIndex + 1, 0).getDate();
  return countDiasOperacaoInRange(diasOperacao, year, monthIndex, 1, diasTotais);
}

export function isDiaDeOperacao(diasOperacao: number[], date: Date): boolean {
  return diasOperacao.includes(date.getDay());
}
