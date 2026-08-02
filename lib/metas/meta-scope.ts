/**
 * Precedência de escopo e vigência de período — puro (testável sem path-alias).
 * Sprint 27.8.3
 */

export type MetaMensalOrigem =
  | "filial_centro"
  | "filial"
  | "empresa"
  | "centro"
  | "geral"
  | "fallback_geral"
  | "nenhuma";

export type MetaScopeFilter = {
  companyId?: string | null;
  branchId?: string | null;
  centroCustoId?: string | null;
};

export type MetaCandidateRow = {
  id?: string | null;
  valor_meta: number | string;
  centro_custo_id: string | null;
  company_id?: string | null;
  branch_id?: string | null;
  competencia: string;
  updated_at?: string | null;
  deleted_at?: string | null;
};

function toCompetenciaMonthStart(value: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(value.trim());
  if (!match) throw new Error("Competência inválida.");
  return `${match[1]}-${match[2]}-01`;
}

/** Último dia civil do mês da competência (YYYY-MM-DD). */
export function competenciaMonthEnd(competencia: string): string {
  const start = toCompetenciaMonthStart(competencia);
  const [y, m] = start.split("-").map(Number) as [number, number];
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

/**
 * Vigência por sobreposição:
 * início_meta <= fim_consulta && fim_meta >= início_consulta.
 */
export function metaOverlapsPeriod(
  competencia: string,
  periodStart: string,
  periodEnd: string,
): boolean {
  const metaStart = toCompetenciaMonthStart(competencia);
  const metaEnd = competenciaMonthEnd(competencia);
  return metaStart <= periodEnd && metaEnd >= periodStart;
}

/**
 * Precedência canônica:
 * 1. filial + centro · 2. filial · 3. empresa · 4. geral tenant
 * Schema atual só tem centro_custo_id — níveis 1–3 colapsam em centro.
 */
export function pickMetaByScopePrecedence(
  candidates: MetaCandidateRow[],
  scope: MetaScopeFilter = {},
): { row: MetaCandidateRow; origem: MetaMensalOrigem } | null {
  const active = candidates.filter((r) => !r.deleted_at);
  if (active.length === 0) return null;

  const centro = scope.centroCustoId ?? null;
  const branch = scope.branchId ?? null;
  const company = scope.companyId ?? null;

  const hasBranchCol = active.some((r) => r.branch_id !== undefined);
  const hasCompanyCol = active.some((r) => r.company_id !== undefined);

  if (hasBranchCol && branch && centro) {
    const hit = active.find(
      (r) =>
        r.branch_id === branch &&
        r.centro_custo_id === centro &&
        (r.company_id == null || r.company_id === company || !company),
    );
    if (hit) return { row: hit, origem: "filial_centro" };
  }

  if (hasBranchCol && branch) {
    const hit = active.find(
      (r) =>
        r.branch_id === branch &&
        r.centro_custo_id == null &&
        (r.company_id == null || r.company_id === company || !company),
    );
    if (hit) return { row: hit, origem: "filial" };
  }

  if (hasCompanyCol && company) {
    const hit = active.find(
      (r) =>
        r.company_id === company &&
        r.branch_id == null &&
        r.centro_custo_id == null,
    );
    if (hit) return { row: hit, origem: "empresa" };
  }

  if (centro) {
    const hit = active.find((r) => r.centro_custo_id === centro);
    if (hit) return { row: hit, origem: "centro" };
  }

  const geral = active.find((r) => r.centro_custo_id == null);
  if (geral) {
    return {
      row: geral,
      origem: centro ? "fallback_geral" : "geral",
    };
  }

  return null;
}

/** Competência YYYY-MM-01 a partir de data civil YYYY-MM-DD. */
export function competenciaFromCivilDate(civilDate: string): string {
  return `${civilDate.slice(0, 7)}-01`;
}
