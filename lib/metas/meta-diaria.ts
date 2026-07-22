/**
 * Resolução de meta diária — puro (sem alias @) para rodar em testes Node.
 */

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toCompetenciaMonthStart(value: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(value.trim());
  if (!match) throw new Error("Competência inválida.");
  return `${match[1]}-${match[2]}-01`;
}

function monthBounds(competencia: string): {
  year: number;
  monthIndex: number;
} {
  const start = toCompetenciaMonthStart(competencia);
  const [y, m] = start.split("-").map(Number) as [number, number];
  return { year: y, monthIndex: m - 1 };
}

function isWeekday(year: number, monthIndex: number, day: number): boolean {
  const dow = new Date(year, monthIndex, day).getDay();
  return dow !== 0 && dow !== 6;
}

function countWeekdaysInMonth(year: number, monthIndex: number): number {
  const diasTotais = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= diasTotais; day += 1) {
    if (isWeekday(year, monthIndex, day)) count += 1;
  }
  return count;
}

export type MetaDiariaOverride = {
  data: string;
  valor_meta: number;
  centro_custo_id?: string | null;
  vendedor_id?: string | null;
  equipe_id?: string | null;
  mecanico_id?: string | null;
};

export type ResolveMetaDiariaInput = {
  competencia: string;
  valorMetaMensal: number | null;
  data: string;
  /** Override manual por data (não apaga histórico — só o vigente). */
  override?: MetaDiariaOverride | null;
  /** Dia fechado / feriado configurado → meta 0 se não houver override. */
  diaFechado?: boolean;
};

/**
 * Resolve meta do dia:
 * 1) override manual vigente
 * 2) dia fechado/feriado → 0 (sem override)
 * 3) fim de semana → 0
 * 4) rateio meta mensal ÷ dias úteis
 */
export function resolveMetaDiaria(input: ResolveMetaDiariaInput): {
  meta_diaria: number;
  fonte: "manual" | "rateio" | "zero_fds" | "zero_fechado" | "sem_meta";
} {
  if (input.override && Number.isFinite(Number(input.override.valor_meta))) {
    return {
      meta_diaria: Number(input.override.valor_meta),
      fonte: "manual",
    };
  }

  if (input.diaFechado) {
    return { meta_diaria: 0, fonte: "zero_fechado" };
  }

  const dow = new Date(`${input.data}T12:00:00`).getDay();
  if (dow === 0 || dow === 6) {
    return { meta_diaria: 0, fonte: "zero_fds" };
  }

  if (input.valorMetaMensal == null || input.valorMetaMensal <= 0) {
    return { meta_diaria: 0, fonte: "sem_meta" };
  }

  const { year, monthIndex } = monthBounds(input.competencia);
  const uteis = countWeekdaysInMonth(year, monthIndex);
  if (uteis <= 0) {
    return { meta_diaria: 0, fonte: "sem_meta" };
  }

  return {
    meta_diaria: input.valorMetaMensal / uteis,
    fonte: "rateio",
  };
}

export function rateioMetaMensalPorDiaUtil(
  valorMetaMensal: number,
  competencia: string,
): number {
  const { year, monthIndex } = monthBounds(competencia);
  const uteis = countWeekdaysInMonth(year, monthIndex);
  if (uteis <= 0) return 0;
  return valorMetaMensal / uteis;
}

export { countWeekdaysInMonth, pad, toCompetenciaMonthStart };
