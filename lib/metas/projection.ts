import {
  META_RITMO_ABAIXO_PP,
  META_RITMO_ACIMA_PP,
  META_RITMO_NO_RITMO_PP,
  type MetaProjecaoMensal,
  type MetaVendasMensal,
  type MetaVendasSinal,
  type MetaVendasStatus,
} from "@/types/metas-vendas";

export {
  META_RITMO_ABAIXO_PP,
  META_RITMO_ACIMA_PP,
  META_RITMO_NO_RITMO_PP,
  META_RITMO_TOLERANCIA_PP,
} from "@/types/metas-vendas";

const OBSERVACAO_FERIADOS =
  "Feriados nacionais/regionais não são descontados nesta versão; apenas sábados e domingos ficam fora dos dias úteis.";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Normaliza qualquer data YYYY-MM-DD para o 1º dia do mês. */
export function toCompetenciaMonthStart(value: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(value.trim());
  if (!match) {
    throw new Error("Competência inválida.");
  }
  return `${match[1]}-${match[2]}-01`;
}

export function monthBounds(competencia: string): {
  dataDe: string;
  dataAte: string;
  year: number;
  monthIndex: number;
  diasTotais: number;
} {
  const start = toCompetenciaMonthStart(competencia);
  const [y, m] = start.split("-").map(Number) as [number, number];
  const year = y;
  const monthIndex = m - 1;
  const diasTotais = new Date(year, monthIndex + 1, 0).getDate();
  const dataAte = `${year}-${pad(monthIndex + 1)}-${pad(diasTotais)}`;
  return { dataDe: start, dataAte, year, monthIndex, diasTotais };
}

export function resolveCompetenciaFromPeriod(
  dataDe: string,
  dataAte: string,
  now = new Date(),
): string {
  const defaultsDe = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const defaultsAte = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`;

  if (dataDe === defaultsDe && dataAte === defaultsAte) {
    return defaultsDe;
  }

  const bounds = monthBounds(dataDe);
  if (dataDe === bounds.dataDe && dataAte === bounds.dataAte) {
    return bounds.dataDe;
  }

  return toCompetenciaMonthStart(dataAte);
}

function isWeekday(year: number, monthIndex: number, day: number): boolean {
  const dow = new Date(year, monthIndex, day).getDay();
  return dow !== 0 && dow !== 6;
}

/** Conta dias úteis (seg–sex) de `fromDay` a `toDay` inclusive. */
export function countWeekdaysInRange(
  year: number,
  monthIndex: number,
  fromDay: number,
  toDay: number,
): number {
  if (toDay < fromDay) return 0;
  let count = 0;
  for (let day = fromDay; day <= toDay; day += 1) {
    if (isWeekday(year, monthIndex, day)) count += 1;
  }
  return count;
}

export function countWeekdaysInMonth(year: number, monthIndex: number): number {
  const diasTotais = new Date(year, monthIndex + 1, 0).getDate();
  return countWeekdaysInRange(year, monthIndex, 1, diasTotais);
}

function classifyStatus(input: {
  valorMeta: number | null;
  percentualAtingido: number | null;
  percentualTempo: number;
  mesEncerrado: boolean;
  mesFuturo: boolean;
}): MetaVendasStatus {
  if (input.valorMeta === null) return "sem_meta";

  if (input.valorMeta === 0) {
    return "atingida";
  }

  if ((input.percentualAtingido ?? 0) >= 100) {
    return "atingida";
  }

  if (input.mesEncerrado) {
    return "mes_encerrado";
  }

  if (input.mesFuturo) {
    return "no_ritmo";
  }

  const diff = (input.percentualAtingido ?? 0) - input.percentualTempo;

  if (diff > META_RITMO_ACIMA_PP) return "acima_do_ritmo";
  if (diff >= -META_RITMO_NO_RITMO_PP) return "no_ritmo";
  if (diff >= -META_RITMO_ABAIXO_PP) return "abaixo_do_ritmo";
  return "muito_abaixo_do_ritmo";
}

function statusToSinal(status: MetaVendasStatus): MetaVendasSinal {
  switch (status) {
    case "atingida":
    case "acima_do_ritmo":
      return "positivo";
    case "no_ritmo":
    case "mes_encerrado":
      return "atencao";
    case "abaixo_do_ritmo":
      return "atencao";
    case "muito_abaixo_do_ritmo":
      return "critico";
    case "sem_meta":
      return "sem_meta";
  }
}

function safeDivide(numerador: number, denominador: number): number {
  if (denominador === 0) return 0;
  return numerador / denominador;
}

/**
 * Projeção avançada (Sprint 9.8.6).
 * Dias corridos + dias úteis (seg–sex). Feriados fora do escopo.
 */
export function buildMetaProjecao(input: {
  competencia: string;
  centroCustoId: string | null;
  meta: MetaVendasMensal | null;
  faturamentoRealizado: number;
  faturamentoMesAnterior?: number | null;
  now?: Date;
}): MetaProjecaoMensal {
  const now = input.now ?? new Date();
  const { dataDe, dataAte, year, monthIndex, diasTotais } = monthBounds(
    input.competencia,
  );
  const valorMeta = input.meta ? Number(input.meta.valor_meta) : null;
  const realizado = Number(input.faturamentoRealizado) || 0;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const mesAtual = year === currentYear && monthIndex === currentMonth;
  const mesFuturo =
    year > currentYear || (year === currentYear && monthIndex > currentMonth);
  const mesEncerrado =
    year < currentYear || (year === currentYear && monthIndex < currentMonth);

  const diasUteisTotais = countWeekdaysInMonth(year, monthIndex);

  let diasDecorridos: number;
  let diasRestantes: number;
  let diasUteisDecorridos: number;
  let diasUteisRestantes: number;
  let ultimoDiaDoMes = false;

  if (mesFuturo) {
    diasDecorridos = 0;
    diasRestantes = diasTotais;
    diasUteisDecorridos = 0;
    diasUteisRestantes = diasUteisTotais;
  } else if (mesEncerrado) {
    diasDecorridos = diasTotais;
    diasRestantes = 0;
    diasUteisDecorridos = diasUteisTotais;
    diasUteisRestantes = 0;
    ultimoDiaDoMes = true;
  } else {
    diasDecorridos = Math.min(Math.max(now.getDate(), 1), diasTotais);
    diasRestantes = Math.max(diasTotais - diasDecorridos, 0);
    ultimoDiaDoMes = diasDecorridos >= diasTotais;
    diasUteisDecorridos = countWeekdaysInRange(
      year,
      monthIndex,
      1,
      diasDecorridos,
    );
    diasUteisRestantes = Math.max(diasUteisTotais - diasUteisDecorridos, 0);
  }

  const percentualTempoDecorrido =
    diasTotais > 0 ? (diasDecorridos / diasTotais) * 100 : 0;
  const percentualTempoUtilDecorrido =
    diasUteisTotais > 0
      ? (diasUteisDecorridos / diasUteisTotais) * 100
      : 0;

  let projecaoCorridos: number;
  let projecaoUteis: number;

  if (mesEncerrado || ultimoDiaDoMes) {
    projecaoCorridos = realizado;
    projecaoUteis = realizado;
  } else {
    projecaoCorridos =
      diasDecorridos === 0 || realizado === 0
        ? 0
        : safeDivide(realizado, diasDecorridos) * diasTotais;
    projecaoUteis =
      diasUteisDecorridos === 0 || realizado === 0
        ? 0
        : safeDivide(realizado, diasUteisDecorridos) * diasUteisTotais;
  }

  const mediaDiaria = safeDivide(realizado, diasDecorridos);
  const mediaDiariaUtil = safeDivide(realizado, diasUteisDecorridos);

  const percentualAtingido =
    valorMeta === null
      ? null
      : valorMeta === 0
        ? realizado >= 0
          ? 100
          : 0
        : (realizado / valorMeta) * 100;

  const gapCorridos =
    valorMeta === null ? null : projecaoCorridos - valorMeta;
  const gapUteis = valorMeta === null ? null : projecaoUteis - valorMeta;

  const restanteMeta =
    valorMeta === null ? null : Math.max(valorMeta - realizado, 0);

  const metaAtingida =
    valorMeta !== null &&
    (valorMeta === 0 || realizado >= valorMeta);

  let necessarioCorrido: number | null = null;
  let necessarioUtil: number | null = null;

  if (valorMeta === null) {
    necessarioCorrido = null;
    necessarioUtil = null;
  } else if (metaAtingida || mesEncerrado || ultimoDiaDoMes) {
    necessarioCorrido = 0;
    necessarioUtil = 0;
  } else {
    necessarioCorrido =
      diasRestantes === 0
        ? 0
        : safeDivide(restanteMeta ?? 0, diasRestantes);
    necessarioUtil =
      diasUteisRestantes === 0
        ? 0
        : safeDivide(restanteMeta ?? 0, diasUteisRestantes);
  }

  const ritmoAtual = percentualAtingido;
  const ritmoEsperado = percentualTempoDecorrido;
  const ritmoDiferencaPp =
    ritmoAtual === null ? null : ritmoAtual - ritmoEsperado;

  const status = classifyStatus({
    valorMeta,
    percentualAtingido,
    percentualTempo: percentualTempoDecorrido,
    mesEncerrado,
    mesFuturo,
  });

  let comparacao: MetaProjecaoMensal["comparacao"] = null;
  if (
    input.faturamentoMesAnterior !== undefined &&
    input.faturamentoMesAnterior !== null
  ) {
    const anterior = Number(input.faturamentoMesAnterior) || 0;
    const crescimento =
      anterior === 0
        ? realizado === 0
          ? 0
          : null
        : ((realizado - anterior) / Math.abs(anterior)) * 100;
    const projVsAnterior =
      anterior === 0
        ? projecaoCorridos === 0
          ? 0
          : null
        : ((projecaoCorridos - anterior) / Math.abs(anterior)) * 100;

    comparacao = {
      realizado_mes_anterior: anterior,
      projecao_vs_anterior_pct: projVsAnterior,
      crescimento_realizado_pct: crescimento,
    };
  }

  const formulaExplicacao = [
    mesEncerrado || ultimoDiaDoMes
      ? "Mês encerrado ou último dia: projeções iguais ao faturamento realizado."
      : `Projeção dias corridos = realizado (${realizado.toFixed(2)}) ÷ dias decorridos (${diasDecorridos}) × dias totais (${diasTotais}).`,
    diasUteisDecorridos === 0 && !mesEncerrado && !ultimoDiaDoMes
      ? "Projeção dias úteis = 0 (nenhum dia útil decorrido)."
      : `Projeção dias úteis = realizado (${realizado.toFixed(2)}) ÷ dias úteis decorridos (${diasUteisDecorridos}) × dias úteis totais (${diasUteisTotais}).`,
    OBSERVACAO_FERIADOS,
  ].join(" ");

  return {
    competencia: dataDe,
    dataDe,
    dataAte,
    centro_custo_id: input.centroCustoId,
    meta: input.meta,
    valor_meta: valorMeta,
    faturamento_realizado: realizado,
    percentual_atingido: percentualAtingido,
    dias_totais: diasTotais,
    dias_decorridos: diasDecorridos,
    dias_restantes: diasRestantes,
    dias_uteis_totais: diasUteisTotais,
    dias_uteis_decorridos: diasUteisDecorridos,
    dias_uteis_restantes: diasUteisRestantes,
    media_diaria: mediaDiaria,
    media_diaria_util: mediaDiariaUtil,
    projecao_dias_corridos: projecaoCorridos,
    projecao_dias_uteis: projecaoUteis,
    projecao_fechamento: projecaoCorridos,
    gap_projetado: gapCorridos,
    gap_projetado_uteis: gapUteis,
    restante_meta: restanteMeta,
    necessario_por_dia_corrido: necessarioCorrido,
    necessario_por_dia_util: necessarioUtil,
    necessario_por_dia: necessarioCorrido,
    percentual_tempo_decorrido: percentualTempoDecorrido,
    percentual_tempo_util_decorrido: percentualTempoUtilDecorrido,
    percentual_tempo: percentualTempoDecorrido,
    ritmo_atual: ritmoAtual,
    ritmo_esperado: ritmoEsperado,
    ritmo_diferenca_pp: ritmoDiferencaPp,
    status,
    sinal: statusToSinal(status),
    mes_encerrado: mesEncerrado,
    mes_futuro: mesFuturo,
    mes_atual: mesAtual,
    comparacao,
    formula_explicacao: formulaExplicacao,
    observacao_feriados: OBSERVACAO_FERIADOS,
  };
}

export function previousCompetencia(competencia: string): string {
  const { year, monthIndex } = monthBounds(competencia);
  const prev = new Date(year, monthIndex - 1, 1);
  return `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-01`;
}

export const META_STATUS_LABEL: Record<MetaVendasStatus, string> = {
  atingida: "Meta atingida",
  acima_do_ritmo: "Acima do ritmo",
  no_ritmo: "No ritmo",
  abaixo_do_ritmo: "Abaixo do ritmo",
  muito_abaixo_do_ritmo: "Muito abaixo do ritmo",
  mes_encerrado: "Mês encerrado",
  sem_meta: "Sem meta",
};
