/**
 * Cálculos puros — Resumo de Vendas do Mês (planilha diária).
 */

export type DiaKind = "passado" | "hoje" | "futuro";

export type SituacaoDia =
  | "muito_abaixo"
  | "abaixo"
  | "atencao"
  | "atingida"
  | "superou"
  | "futuro"
  | "neutro";

export type ResumoDiaInput = {
  data: string; // YYYY-MM-DD
  meta: number;
  meta_fonte: "manual" | "rateio" | "zero_fds" | "zero_fechado" | "sem_meta";
  realizado: number | null; // null = futuro (não exibir)
  kind: DiaKind;
};

export type ResumoDiaRow = {
  data: string;
  label_dia: string; // "quarta 01/abr"
  kind: DiaKind;
  meta: number;
  meta_fonte: ResumoDiaInput["meta_fonte"];
  realizado: number | null;
  diferenca: number | null;
  pct_atingido: number | null;
  pct_diferenca: number | null;
  atingida: boolean;
  situacao: SituacaoDia;
};

export type ResumoTotalGeral = {
  meta_total: number;
  realizado_acumulado: number;
  diferenca: number | null;
  pct_atingido: number | null;
  pct_diferenca: number | null;
  situacao: SituacaoDia;
};

export const SITUACAO_LABEL: Record<SituacaoDia, string> = {
  muito_abaixo: "Muito abaixo",
  abaixo: "Abaixo",
  atencao: "Atenção",
  atingida: "Meta atingida",
  superou: "Superou",
  futuro: "Futuro",
  neutro: "—",
};

/**
 * Faixas de situação pelo % atingido:
 * <70 muito abaixo · 70–89,9 abaixo · 90–99,9 atenção · 100–109,9 atingida · ≥110 superou
 */
export function classifySituacao(input: {
  kind: DiaKind;
  meta: number;
  pctAtingido: number | null;
}): SituacaoDia {
  if (input.kind === "futuro") return "futuro";
  if (input.meta === 0 || input.pctAtingido == null) return "neutro";
  const pct = input.pctAtingido;
  if (pct < 70) return "muito_abaixo";
  if (pct < 90) return "abaixo";
  if (pct < 100) return "atencao";
  if (pct < 110) return "atingida";
  return "superou";
}

const WEEKDAYS_PT = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
] as const;

const MONTHS_SHORT_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

export function labelDiaSemanaData(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const weekday = WEEKDAYS_PT[d.getDay()] ?? "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS_SHORT_PT[d.getMonth()] ?? "";
  return `${weekday} ${day}/${month}`;
}

export function formatDataBr(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function eachDayOfMonth(year: number, monthIndex0: number): string[] {
  const n = daysInMonth(year, monthIndex0);
  const pad = (v: number) => String(v).padStart(2, "0");
  const out: string[] = [];
  for (let day = 1; day <= n; day += 1) {
    out.push(`${year}-${pad(monthIndex0 + 1)}-${pad(day)}`);
  }
  return out;
}

/** Diferença R$ = realizado − meta */
export function calcDiferenca(
  realizado: number | null,
  meta: number,
): number | null {
  if (realizado == null) return null;
  return realizado - meta;
}

/**
 * % atingido = (realizado / meta) * 100
 * Meta zero → null (não divide).
 */
export function calcPctAtingido(
  realizado: number | null,
  meta: number,
): number | null {
  if (realizado == null) return null;
  if (meta === 0) return null;
  return (realizado / meta) * 100;
}

/**
 * % diferença = ((realizado − meta) / meta) * 100
 * Meta zero → null.
 */
export function calcPctDiferenca(
  realizado: number | null,
  meta: number,
): number | null {
  if (realizado == null) return null;
  if (meta === 0) return null;
  return ((realizado - meta) / meta) * 100;
}

export function buildResumoDiaRow(input: ResumoDiaInput): ResumoDiaRow {
  const realizado = input.kind === "futuro" ? null : input.realizado;
  const meta = input.meta;
  const diferenca = calcDiferenca(realizado, meta);
  const pct_atingido = calcPctAtingido(realizado, meta);
  const pct_diferenca = calcPctDiferenca(realizado, meta);
  const situacao = classifySituacao({
    kind: input.kind,
    meta,
    pctAtingido: pct_atingido,
  });

  return {
    data: input.data,
    label_dia: labelDiaSemanaData(input.data),
    kind: input.kind,
    meta,
    meta_fonte: input.meta_fonte,
    realizado,
    diferenca,
    pct_atingido,
    pct_diferenca,
    atingida: pct_atingido != null && pct_atingido >= 100,
    situacao,
  };
}

/**
 * TOTAL GERAL:
 * - meta_total = soma das metas de todos os dias do mês
 * - realizado_acumulado = soma do realizado até hoje (passado + hoje)
 * - diferença / % vs meta_total
 */
export function buildTotalGeral(rows: ResumoDiaRow[]): ResumoTotalGeral {
  const meta_total = rows.reduce((s, r) => s + r.meta, 0);
  const realizado_acumulado = rows.reduce((s, r) => {
    if (r.kind === "futuro" || r.realizado == null) return s;
    return s + r.realizado;
  }, 0);
  const pct_atingido = calcPctAtingido(realizado_acumulado, meta_total);

  return {
    meta_total,
    realizado_acumulado,
    diferenca: calcDiferenca(realizado_acumulado, meta_total),
    pct_atingido,
    pct_diferenca: calcPctDiferenca(realizado_acumulado, meta_total),
    situacao: classifySituacao({
      kind: "passado",
      meta: meta_total,
      pctAtingido: pct_atingido,
    }),
  };
}

export function classifyDayKind(
  data: string,
  hojeCivil: string,
): DiaKind {
  if (data < hojeCivil) return "passado";
  if (data === hojeCivil) return "hoje";
  return "futuro";
}

/** Série acumulada para o gráfico (só dias até hoje no realizado). */
export function buildSerieAcumulada(rows: ResumoDiaRow[]): Array<{
  data: string;
  label: string;
  meta_acumulada: number;
  realizado_acumulado: number | null;
  gap: number | null;
}> {
  let metaAcum = 0;
  let realAcum = 0;
  return rows.map((r) => {
    metaAcum += r.meta;
    if (r.kind !== "futuro" && r.realizado != null) {
      realAcum += r.realizado;
    }
    const realizado_acumulado = r.kind === "futuro" ? null : realAcum;
    return {
      data: r.data,
      label: r.label_dia,
      meta_acumulada: metaAcum,
      realizado_acumulado,
      gap:
        realizado_acumulado == null ? null : realizado_acumulado - metaAcum,
    };
  });
}

export function calcProjecaoFechamento(input: {
  realizadoAcumulado: number;
  diasDecorridos: number;
  diasTotais: number;
}): number | null {
  if (input.diasDecorridos <= 0) return null;
  return (input.realizadoAcumulado / input.diasDecorridos) * input.diasTotais;
}

export type LeituraDiaInsight = {
  id: string;
  text: string;
  tone: "success" | "warning" | "danger" | "neutral" | "info";
};

/** Máx. 3 insights numéricos — sem texto inventado. */
export function buildLeituraDoDia(input: {
  metaHoje: number | null;
  realizadoHoje: number;
  diferencaHoje: number | null;
  ticketHoje: number;
  ticketMedioMes: number;
  projecaoFechamento: number | null;
  metaMensal: number | null;
}): LeituraDiaInsight[] {
  const out: LeituraDiaInsight[] = [];

  if (
    input.diferencaHoje != null &&
    input.metaHoje != null &&
    input.metaHoje > 0
  ) {
    if (input.diferencaHoje >= 0) {
      out.push({
        id: "meta_superada",
        text: `Meta superada em R$ ${input.diferencaHoje.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        tone: "success",
      });
    } else {
      out.push({
        id: "falta_meta",
        text: `Faltam R$ ${Math.abs(input.diferencaHoje).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} para a meta`,
        tone:
          input.diferencaHoje > -input.metaHoje * 0.1 ? "warning" : "danger",
      });
    }
  }

  if (input.ticketMedioMes > 0 && input.ticketHoje > 0) {
    const delta = input.ticketHoje - input.ticketMedioMes;
    const pct = (delta / input.ticketMedioMes) * 100;
    if (Math.abs(pct) >= 1) {
      out.push({
        id: "ticket",
        text:
          delta >= 0
            ? `Ticket médio ${pct.toFixed(0)}% acima da média do mês`
            : `Ticket médio ${Math.abs(pct).toFixed(0)}% abaixo da média do mês`,
        tone: delta >= 0 ? "info" : "warning",
      });
    }
  }

  if (
    input.projecaoFechamento != null &&
    input.metaMensal != null &&
    input.metaMensal > 0
  ) {
    const acima = input.projecaoFechamento >= input.metaMensal;
    out.push({
      id: "projecao",
      text: acima
        ? "Ritmo atual sugere fechamento acima da meta"
        : "Ritmo atual sugere fechamento abaixo da meta",
      tone: acima ? "success" : "danger",
    });
  }

  return out.slice(0, 3);
}
