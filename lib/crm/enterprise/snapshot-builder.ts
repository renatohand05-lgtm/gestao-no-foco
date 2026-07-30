/**
 * Fase 24 — Carrega snapshot a partir dos serviços CRM existentes (sem duplicar SQL).
 */

import type { CrmDashboardKpis } from "@/types/crm";

import type { CrmEnterpriseSnapshot } from "./types.ts";

type PortfolioLike = {
  kpis: {
    clientesAtivos?: number;
    novosMes?: number;
    recorrentes?: number;
    inativos?: number;
    ticketMedioPorCliente?: number;
    receitaPorCliente?: number;
  };
  rankings?: {
    faturamento?: Array<{ id: string; nome: string; faturamento?: number; valor?: number }>;
  };
  oportunidades?: unknown[];
};

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Monta snapshot a partir de KPIs do dashboard + portfolio executivo.
 * Falhas de fatia devem ser registradas em sourceHealth pelo caller.
 */
export function buildCrmEnterpriseSnapshotFromSources(args: {
  tenantId: string;
  tenantSlug: string;
  asOf?: string;
  empresaId?: string | null;
  filialId?: string | null;
  dashboard?: CrmDashboardKpis | null;
  portfolio?: PortfolioLike | null;
  followUpsPendentes?: number | null;
  metas?: { metaFaturamento?: number | null; realizado?: number | null };
  sourceHealth?: CrmEnterpriseSnapshot["sourceHealth"];
}): CrmEnterpriseSnapshot {
  const asOf = args.asOf ?? new Date().toISOString().slice(0, 10);
  const d = args.dashboard;
  const p = args.portfolio;

  const funil =
    d?.funil?.map((f) => ({
      estagio: f.estagio,
      total: f.total,
      valor_total: f.valor_total,
    })) ?? [];

  const valorNegociacao = funil
    .filter((f) => f.estagio === "proposta" || f.estagio === "negociacao")
    .reduce((a, f) => a + (Number(f.valor_total) || 0), 0);

  const oportunidadesAbertas = funil
    .filter((f) =>
      ["lead", "contato", "proposta", "negociacao"].includes(f.estagio),
    )
    .reduce((a, f) => a + (Number(f.total) || 0), 0);

  const ranking =
    p?.rankings?.faturamento?.slice(0, 50).map((r) => ({
      id: r.id,
      nome: r.nome,
      valor: num(r.faturamento ?? r.valor) ?? 0,
    })) ?? [];

  return {
    tenantId: args.tenantId,
    tenantSlug: args.tenantSlug,
    asOf,
    empresaId: args.empresaId ?? null,
    filialId: args.filialId ?? null,
    kpisRaw: {
      novos: num(d?.novos_clientes ?? p?.kpis?.novosMes),
      ativos: num(d?.clientes_ativos ?? p?.kpis?.clientesAtivos),
      inativos: num(d?.clientes_inativos ?? p?.kpis?.inativos),
      conversao: num(d?.taxa_conversao),
      ticketMedio: num(d?.ticket_medio ?? p?.kpis?.ticketMedioPorCliente),
      faturamentoPorCliente: num(
        d?.receita_por_cliente ?? p?.kpis?.receitaPorCliente,
      ),
      recorrentes: num(d?.clientes_recorrentes ?? p?.kpis?.recorrentes),
      retencao: null, // indisponível até coorte canônica
      perdidos: num(d?.clientes_perdidos),
      tempoMedioFechamentoDias: num(d?.tempo_medio_fechamento_dias),
      oportunidadesAbertas:
        num(oportunidadesAbertas) ??
        num(Array.isArray(p?.oportunidades) ? p!.oportunidades!.length : null),
      valorNegociacao: num(valorNegociacao),
    },
    funil,
    ranking,
    followUpsPendentes: num(args.followUpsPendentes),
    metas: args.metas,
    sourceHealth: args.sourceHealth ?? {},
  };
}

export function emptyCrmEnterpriseSnapshot(
  tenantId: string,
  tenantSlug: string,
): CrmEnterpriseSnapshot {
  return {
    tenantId,
    tenantSlug,
    asOf: new Date().toISOString().slice(0, 10),
    kpisRaw: {},
    funil: [],
    ranking: [],
    sourceHealth: {
      dashboard: { status: "empty", message: "Sem fontes carregadas" },
    },
  };
}
