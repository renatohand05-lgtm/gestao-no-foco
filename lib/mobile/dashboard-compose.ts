import "server-only";

/**
 * Sprint 31.2 — Compose do Dashboard Executivo Mobile.
 * Reutiliza loaders/services/compose da web — sem novas regras de negócio.
 * Cliente: Bearer user OU service role no servidor após membership+RBAC
 * (service role nunca vai para o app).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildCockpitAlerts,
  buildCockpitKpis,
  buildExecutiveBriefV2,
  buildMetaPanel,
  type CockpitAlert,
  type CockpitKpiItem,
  type ExecutiveBriefV2Model,
  type MetaPanelModel,
} from "@/lib/dashboard/cockpit-v2";
import { defaultDashboardPeriodo } from "@/lib/dashboard/dashboard-service";
import { DashboardService } from "@/lib/dashboard/dashboard-service";
import { composeExecutiveDecision } from "@/lib/dashboard/executive-decision-service";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import {
  type ExecutiveDashboardContext,
  toDecisionFeeds,
  toIntelligenceFeeds,
} from "@/lib/dashboard/executive-dashboard-context-service";
import { composeExecutiveFinancialCockpit } from "@/lib/dashboard/executive-financial-cockpit-service";
import { getGreeting, formatCurrencyCompact, formatPercent } from "@/lib/dashboard/format";
import { buildPremiumInsights } from "@/lib/dashboard/premium-dashboard-map";
import {
  civilDateInTimezone,
  resolveTenantTimezone,
} from "@/lib/dashboard/tenant-timezone";
import { VendasDiaService } from "@/lib/dashboard/vendas-dia-service";
import { ResumoVendasMesService } from "@/lib/dashboard/resumo-vendas-mes-service";
import { composeOpsExecutiveIntelligence } from "@/lib/enterprise";
import { EstoqueDashboardService } from "@/lib/estoque/estoque-dashboard-service";
import { ContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import {
  addDays,
  calcSaldoPendente,
  todayISO,
} from "@/lib/financeiro/conta-pagar-utils";
import { ContaReceberService } from "@/lib/financeiro/conta-receber-service";
import {
  FluxoCaixaService,
  defaultFluxoCaixaPeriodo,
} from "@/lib/financeiro/fluxo-caixa-service";
import { CentroOperacoesService } from "@/lib/operacoes/centro-operacoes-service";
import { RecursosOcupacaoService } from "@/lib/operacoes/recursos-service";
import { hasExecutiveDashboardAccess } from "@/lib/rbac/executive-access";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type { TenantSegment } from "@/types";

async function soft<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

function resolveDataClient(
  userClient: SupabaseClient<Database>,
): SupabaseClient<Database> {
  if (isAdminClientAvailable()) return createAdminClient();
  return userClient;
}

/** Mesma orquestração de loadExecutiveDashboardContextUncached, com client injetável. */
async function loadExecContextWithClient(
  client: SupabaseClient<Database>,
  tenantId: string,
  tenantSlug: string,
): Promise<ExecutiveDashboardContext> {
  const today = todayISO();
  const mes = defaultFluxoCaixaPeriodo();
  const ate7 = addDays(today, 6);
  const ate30 = addDays(today, 29);

  const [centro, estoqueSvc, pagarBundle, receber, recursosRaw, fluxoBundle] =
    await Promise.all([
      soft(async () => new CentroOperacoesService(client, tenantId).getData(tenantSlug)),
      soft(async () =>
        new EstoqueDashboardService(client, tenantId).getData({ tenantSlug }),
      ),
      soft(async () => {
        const svc = new ContaPagarService(client, tenantId);
        const [pagar, list] = await Promise.all([
          svc.getResumo(),
          svc.list({
            status: "aberto",
            vencimentoDe: addDays(today, 1),
            vencimentoAte: ate7,
            sort: "data_vencimento",
            order: "asc",
            perPage: 40,
            page: 1,
          }),
        ]);
        let maior: ExecutiveDashboardContext["maiorCompromisso7d"] = null;
        for (const row of list.data) {
          const saldo = calcSaldoPendente(row);
          const valor =
            Number.isFinite(saldo) && saldo >= 0
              ? saldo
              : Number(row.valor_original) || 0;
          const valorSource =
            Number.isFinite(saldo) && saldo >= 0
              ? ("saldo_pendente" as const)
              : ("valor_original" as const);
          if (!maior || valor > maior.valor) {
            maior = {
              id: row.id,
              descricao: row.descricao,
              fornecedorNome: row.fornecedor_nome,
              valor,
              dataVencimento: row.data_vencimento,
              valorSource,
            };
          }
        }
        return { pagar, maior };
      }),
      soft(async () => new ContaReceberService(client, tenantId).getResumo()),
      soft(async () => new RecursosOcupacaoService(client, tenantId).getData()),
      soft(async () => {
        const svc = new FluxoCaixaService(client, tenantId);
        const [mesR, d7, d30, contas] = await Promise.all([
          svc.getFluxo({ dataDe: mes.dataDe, dataAte: mes.dataAte, includeItens: false }),
          svc.getFluxo({ dataDe: today, dataAte: ate7, includeItens: false }),
          svc.getFluxo({ dataDe: today, dataAte: ate30, includeItens: false }),
          svc.listContasComSaldo(),
        ]);
        return {
          fluxoMes: mesR.resumo,
          fluxo7d: d7.resumo,
          fluxo30d: d30.resumo,
          contasAtivas: contas.filter((c) => c.ativo).length,
        };
      }),
    ]);

  const estoque = estoqueSvc
    ? {
        abaixoMinimo: estoqueSvc.kpis.abaixoMinimo,
        zerados: estoqueSvc.kpis.zerados,
      }
    : null;

  return {
    centro,
    estoque,
    pagar: pagarBundle?.pagar ?? null,
    receber,
    recursosRaw,
    fluxoMes: fluxoBundle?.fluxoMes ?? null,
    fluxo7d: fluxoBundle?.fluxo7d ?? null,
    fluxo30d: fluxoBundle?.fluxo30d ?? null,
    maiorCompromisso7d: pagarBundle?.maior ?? null,
    temContaBancaria:
      fluxoBundle == null ? null : (fluxoBundle.contasAtivas ?? 0) > 0,
  };
}

export type MobileQuickAction = {
  id: string;
  label: string;
  href: string;
  permission: string | null;
  enabled: boolean;
};

export type MobileMetaDayWeek = {
  label: string;
  meta: string;
  realizado: string;
  pct: string;
  available: boolean;
};

export type MobileExecutiveDashboardDto = {
  generatedAt: string;
  greeting: string;
  welcome: string;
  user: {
    displayName: string | null;
    initials: string;
  };
  context: {
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    branchId: string | null;
    branchName: string | null;
    segment: string | null;
  };
  clock: {
    timeLabel: string;
    dateLabel: string;
    timezone: string;
  };
  kpis: Array<{
    id: string;
    title: string;
    value: string;
    supportingText: string;
    tone: CockpitKpiItem["tone"];
    trendLabel: string | null;
    unavailable: boolean;
  }>;
  brief: ExecutiveBriefV2Model;
  decision: {
    summary: ExecutiveDecisionResult["summary"];
    items: Array<{
      id: string;
      title: string;
      description: string;
      severity: string;
      category: string;
      actionLabel: string | null;
      href: string | null;
      source: string;
    }>;
  };
  alerts: CockpitAlert[];
  metas: {
    month: MetaPanelModel;
    day: MobileMetaDayWeek;
    week: MobileMetaDayWeek;
  };
  quickActions: MobileQuickAction[];
  updatedAtLabel: string;
};

function initialsFromName(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatTimeLabel(tz: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(new Date());
}

function formatDateLabel(civilDate: string): string {
  const [y, m, d] = civilDate.split("-").map(Number);
  if (!y || !m || !d) return civilDate;
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function buildQuickActions(
  tenantSlug: string,
  permissions: readonly string[],
): MobileQuickAction[] {
  const root = `/${tenantSlug}`;
  const can = (perm: string | null) =>
    !perm ||
    permissions.includes("*") ||
    permissions.includes(perm) ||
    hasExecutiveDashboardAccess(permissions);

  const items: Array<Omit<MobileQuickAction, "enabled">> = [
    { id: "nova-os", label: "Nova OS", href: `${root}/ordens/nova`, permission: "ordens.criar" },
    {
      id: "novo-cliente",
      label: "Novo Cliente",
      href: `${root}/clientes/novo`,
      permission: "clientes.criar",
    },
    {
      id: "novo-lancamento",
      label: "Novo Lançamento",
      href: `${root}/financeiro`,
      permission: "financeiro.visualizar",
    },
    {
      id: "nova-compra",
      label: "Nova Compra",
      href: `${root}/compras`,
      permission: "compras.visualizar",
    },
    { id: "agenda", label: "Agenda", href: `${root}/agenda`, permission: null },
    { id: "crm", label: "CRM", href: `${root}/crm`, permission: "crm.visualizar" },
    {
      id: "financeiro",
      label: "Financeiro",
      href: `${root}/financeiro`,
      permission: "financeiro.visualizar",
    },
    {
      id: "estoque",
      label: "Estoque",
      href: `${root}/estoque`,
      permission: "estoque.visualizar",
    },
  ];

  return items.map((item) => ({
    ...item,
    enabled: can(item.permission),
  }));
}

export type ComposeMobileDashboardInput = {
  userClient: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  segment: TenantSegment | null;
  displayName: string | null;
  branchId: string | null;
  branchName: string | null;
  permissions: readonly string[];
};

export async function composeMobileExecutiveDashboard(
  input: ComposeMobileDashboardInput,
): Promise<MobileExecutiveDashboardDto> {
  if (!hasExecutiveDashboardAccess(input.permissions)) {
    const err = new Error("FORBIDDEN_EXECUTIVE");
    throw err;
  }

  const client = resolveDataClient(input.userClient);
  const tz = resolveTenantTimezone();
  const filters = defaultDashboardPeriodo();
  const hojeCivil = civilDateInTimezone(new Date(), tz);
  const year = Number(hojeCivil.slice(0, 4));
  const month = Number(hojeCivil.slice(5, 7));

  const vendasSvc = new VendasDiaService(client, input.tenantId, tz);
  const resumoSvc = new ResumoVendasMesService(client, input.tenantId, tz);
  const dashboardSvc = new DashboardService(client, input.tenantId, input.segment);

  const [hoje, resumo, execCtx, primary] = await Promise.all([
    vendasSvc.getSnapshot(null),
    resumoSvc.getResumo({ year, month, centroCustoId: null }),
    loadExecContextWithClient(client, input.tenantId, input.tenantSlug),
    soft(() => dashboardSvc.getPrimaryData(filters)),
  ]);

  const decision = composeExecutiveDecision({
    tenantSlug: input.tenantSlug,
    hoje,
    resumo,
    feeds: toDecisionFeeds(execCtx),
  });
  const intelligence = composeOpsExecutiveIntelligence({
    feeds: toIntelligenceFeeds(execCtx),
  });
  const cockpit = composeExecutiveFinancialCockpit(execCtx);
  const estoqueAbaixoMinimo = execCtx.estoque?.abaixoMinimo ?? null;

  const insights = buildPremiumInsights({
    cockpit,
    intelligence,
    decision,
    estoqueAbaixoMinimo,
    primary,
    charts: null,
    tenantSlug: input.tenantSlug,
  });

  const kpisRaw = buildCockpitKpis({
    primary,
    hoje,
    intelligence,
    cockpit,
    tenantSlug: input.tenantSlug,
    segment: input.segment,
  });

  const alerts = buildCockpitAlerts({
    insights,
    decision,
    tenantSlug: input.tenantSlug,
  });

  const brief = buildExecutiveBriefV2({
    hoje,
    alerts,
    insights,
    tenantSlug: input.tenantSlug,
  });

  const metaMonth = buildMetaPanel({
    hoje,
    tenantSlug: input.tenantSlug,
  });

  const dayMeta: MobileMetaDayWeek = {
    label: "Meta do dia",
    meta:
      hoje.hoje.meta != null
        ? formatCurrencyCompact(hoje.hoje.meta)
        : "Não cadastrada",
    realizado: formatCurrencyCompact(hoje.hoje.faturamento),
    pct:
      hoje.hoje.percentual != null
        ? formatPercent(hoje.hoje.percentual)
        : "Indisponível",
    available: hoje.hoje.meta != null,
  };

  const weekSum =
    hoje.serie_diaria.length > 0
      ? hoje.serie_diaria.slice(-7).reduce((a, p) => a + (p.realizado ?? 0), 0)
      : null;

  const weekMeta: MobileMetaDayWeek = {
    label: "Meta da semana",
    meta: "Derivada da série diária",
    realizado:
      weekSum != null ? formatCurrencyCompact(weekSum) : "Indisponível",
    pct: "Indisponível",
    available: weekSum != null,
  };

  return {
    generatedAt: new Date().toISOString(),
    greeting: getGreeting(input.displayName),
    welcome: "Bem-vindo ao Gestão no Foco.",
    user: {
      displayName: input.displayName,
      initials: initialsFromName(input.displayName),
    },
    context: {
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      tenantName: input.tenantName,
      branchId: input.branchId,
      branchName: input.branchName,
      segment: input.segment,
    },
    clock: {
      timeLabel: formatTimeLabel(tz),
      dateLabel: formatDateLabel(hoje.data_hoje),
      timezone: tz,
    },
    kpis: kpisRaw.map((k) => ({
      id: k.id,
      title: k.title,
      value: k.value,
      supportingText: k.supportingText,
      tone: k.tone,
      trendLabel: k.trend?.label ?? k.comparisonLabel ?? null,
      unavailable: Boolean(k.unavailable),
    })),
    brief,
    decision: {
      summary: decision.summary,
      items: decision.items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        severity: item.severity,
        category: item.category,
        actionLabel: item.actionLabel ?? null,
        href: item.href ?? null,
        source: item.source,
      })),
    },
    alerts,
    metas: {
      month: metaMonth,
      day: dayMeta,
      week: weekMeta,
    },
    quickActions: buildQuickActions(input.tenantSlug, input.permissions),
    updatedAtLabel: hoje.atualizado_em_label,
  };
}
