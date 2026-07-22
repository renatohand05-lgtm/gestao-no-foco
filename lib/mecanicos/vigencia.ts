/**
 * Regra única de vigência × competência (sem proporcionalidade nesta versão).
 *
 * Uma vigência cobre a competência quando há sobreposição de períodos:
 *   vigencia_inicio <= último dia da competência
 *   AND (vigencia_fim IS NULL OR vigencia_fim >= primeiro dia da competência)
 *
 * Em caso de sobreposição, o valor mensal integral é usado.
 * Proporcionalidade = pendência futura configurável por tenant.
 */

export type VigenciaPeriodo = {
  vigencia_inicio: string;
  vigencia_fim: string | null;
};

/** Normaliza YYYY-MM ou YYYY-MM-DD para o dia 1 do mês (YYYY-MM-01). */
export function firstDayOfCompetencia(competencia: string): string {
  const ym = competencia.slice(0, 7);
  return `${ym}-01`;
}

/** Último dia do mês da competência (YYYY-MM-DD). */
export function lastDayOfCompetencia(competencia: string): string {
  const [y, m] = firstDayOfCompetencia(competencia).split("-").map(Number);
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

/**
 * Sobreposição vigência × mês da competência.
 * Não altera a data real de início da vigência.
 */
export function vigenciaSobrepoeCompetencia(
  vigencia: VigenciaPeriodo,
  competencia: string,
): boolean {
  const compIni = firstDayOfCompetencia(competencia);
  const compFim = lastDayOfCompetencia(competencia);
  const ini = vigencia.vigencia_inicio;
  const fim = vigencia.vigencia_fim;

  return ini <= compFim && (fim == null || fim >= compIni);
}

/** Vigente em um dia específico (apontamento / custo-hora na data). */
export function vigenciaContemData(
  vigencia: VigenciaPeriodo,
  data: string,
): boolean {
  return (
    vigencia.vigencia_inicio <= data &&
    (vigencia.vigencia_fim == null || vigencia.vigencia_fim >= data)
  );
}

/**
 * Duas vigências conflitam se os intervalos se sobrepõem.
 * NULL em vigencia_fim = aberto (sem fim).
 */
export function vigenciasConflitam(
  a: VigenciaPeriodo,
  b: VigenciaPeriodo,
): boolean {
  const aFim = a.vigencia_fim ?? "9999-12-31";
  const bFim = b.vigencia_fim ?? "9999-12-31";
  return a.vigencia_inicio <= bFim && b.vigencia_inicio <= aFim;
}

export function pickCustoParaCompetencia<T extends VigenciaPeriodo>(
  custos: T[],
  competencia: string,
): T | null {
  const matches = custos.filter((c) =>
    vigenciaSobrepoeCompetencia(c, competencia),
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) =>
    b.vigencia_inicio.localeCompare(a.vigencia_inicio),
  )[0]!;
}
