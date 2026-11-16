import { createClient } from "@/lib/supabase/server";

/**
 * Conjunto de dados do Painel Executivo (mesmo formato `D` do painel HTML original).
 * - "Realizado" (OS, despesas, clientes, serviços, mecânicos, DRE base, fluxo, notas) vem da função
 *   `painel_executivo_dados` (calculada sobre os lançamentos do sistema, respeitando RLS).
 * - Planejamento (premissas, metas, orçamento 2027, plano de ação) vem de `painel_planejamento`.
 */
export type PainelDados = {
  os: unknown[][];
  desp: unknown[][];
  notas: unknown[][];
  cli: unknown[][];
  veic: unknown[][];
  serv: unknown[][];
  mecs: unknown[][];
  dreBase: unknown[][];
  fluxo: unknown[][];
  ref: string;
  prem: unknown[][];
  prem27Desp: unknown[][];
  prem27Mes: unknown[][];
  feriados: unknown[][];
  metas27: unknown[][];
  dre27: unknown[][];
  dre27ind: unknown[][];
  tri27: unknown[][];
  oper27: unknown[][];
  acoes: unknown[][];
  metasMes: Record<string, number>;
};

/** chave em painel_planejamento → campo de `PainelDados` (listas). */
const PLAN_LIST_KEYS = [
  "prem",
  "prem27Desp",
  "prem27Mes",
  "feriados",
  "metas27",
  "dre27",
  "dre27ind",
  "tri27",
  "oper27",
  "acoes",
] as const;

const asRows = (v: unknown): unknown[][] =>
  Array.isArray(v) ? (v as unknown[][]) : [];

export async function loadPainelDados(
  tenantId: string,
): Promise<PainelDados | null> {
  const supabase = await createClient();

  const [dadosRes, planRes] = await Promise.all([
    supabase.rpc("painel_executivo_dados", { p_tenant: tenantId }),
    supabase
      .from("painel_planejamento")
      .select("chave, payload")
      .eq("tenant_id", tenantId),
  ]);

  if (dadosRes.error || !dadosRes.data) return null;

  const real = dadosRes.data as Record<string, unknown>;
  const plan = new Map<string, unknown>(
    (planRes.data ?? []).map((r) => [r.chave, r.payload]),
  );
  const metasMesRaw = plan.get("metas_mes");

  const out: PainelDados = {
    os: asRows(real.os),
    desp: asRows(real.desp),
    notas: asRows(real.notas),
    cli: asRows(real.cli),
    veic: asRows(real.veic),
    serv: asRows(real.serv),
    mecs: asRows(real.mecs),
    dreBase: asRows(real.dreBase),
    fluxo: asRows(real.fluxo),
    ref: typeof real.ref === "string" ? real.ref : "",
    prem: [],
    prem27Desp: [],
    prem27Mes: [],
    feriados: [],
    metas27: [],
    dre27: [],
    dre27ind: [],
    tri27: [],
    oper27: [],
    acoes: [],
    metasMes:
      metasMesRaw && typeof metasMesRaw === "object" && !Array.isArray(metasMesRaw)
        ? (metasMesRaw as Record<string, number>)
        : {},
  };
  for (const k of PLAN_LIST_KEYS) out[k] = asRows(plan.get(k));
  return out;
}
