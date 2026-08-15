import "server-only";

/**
 * Sprint 31.7 — Inteligência Operacional Mobile Enterprise.
 * Reutiliza builders/services Web — sem novas regras, sem IA generativa.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildExecutiveAnalyticsBundle,
  resolvePeriodPreset,
} from "@/lib/analytics/analytics-orchestrator";
import {
  composeDecisionCenterPack,
  type DecisionCenterPack,
  type KpiHealthItem,
} from "@/lib/analytics/decision-center";
import { loadAnalyticsDomainSnapshot } from "@/lib/analytics/snapshot-loader";
import { AgendaEventService } from "@/lib/agenda/agenda-service";
import { formatCurrencyCompact } from "@/lib/dashboard/format";
import type { CockpitAlert } from "@/lib/dashboard/cockpit-v2";
import {
  composeMobileExecutiveDashboard,
  type ComposeMobileDashboardInput,
  type MobileExecutiveDashboardDto,
  type MobileQuickAction,
} from "@/lib/mobile/dashboard-compose";
import { composeCrmAlerts } from "@/lib/mobile/crm-compose";
import { composeFinanceSummary } from "@/lib/mobile/finance-compose";
import {
  composeOpsDashboard,
  composeOpsNotifications,
  resolveOpsDataClient,
} from "@/lib/mobile/operations-compose";
import { composeStockAlerts } from "@/lib/mobile/stock-compose";
import { CentroOperacoesService } from "@/lib/operacoes/centro-operacoes-service";
import { MecanicosDashboardService } from "@/lib/operacoes/mecanicos-dashboard-service";
import { RecursosOcupacaoService } from "@/lib/operacoes/recursos-service";
import { OsDashboardService } from "@/lib/ordens/os-dashboard-service";
import {
  hasAnalyticsViewAccess,
  hasExecutiveDashboardAccess,
} from "@/lib/rbac/executive-access";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

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

function hasPerm(permissions: readonly string[], key: string): boolean {
  return permissions.includes("*") || permissions.includes(key);
}

function cardCount(
  cards: Array<{ key: string; count: number }> | undefined,
  key: string,
): number | null {
  const c = cards?.find((x) => x.key === key);
  return c ? c.count : null;
}

function money(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return formatCurrencyCompact(n);
}

export type MobileOperationalExecutive = {
  producaoDia: string | null;
  ordensAbertas: string | null;
  ordensAtrasadas: string | null;
  agendaDia: string | null;
  mecanicosAtivos: string | null;
  tempoMedioOs: string | null;
  ticketMedio: string | null;
  carrosEntregues: string | null;
  servicosPendentes: string | null;
  eficienciaOperacional: string | null;
  unavailable: string[];
};

export type MobileAlertCenterItem = {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  source: string;
  href: string | null;
  suggestedAction: string | null;
};

export type MobileAlertCenter = {
  operacional: MobileAlertCenterItem[];
  financeiro: MobileAlertCenterItem[];
  crm: MobileAlertCenterItem[];
  estoque: MobileAlertCenterItem[];
  agenda: MobileAlertCenterItem[];
  automacoes: MobileAlertCenterItem[];
  sistema: MobileAlertCenterItem[];
  total: number;
};

export type MobileKpiHealthRow = {
  metricId: string;
  name: string;
  level: "excelente" | "bom" | "atencao" | "critico";
  levelLabel: string;
  reason: string;
  trend: string;
  deltaPercent: number | null;
  formatted: string;
  historyHint: string;
};

export type MobileIntelligenceMetas = MobileExecutiveDashboardDto["metas"] & {
  dayTrend: string | null;
  weekTrend: string | null;
  monthTrend: string | null;
};

export type MobileIntelligencePack = {
  generatedAt: string;
  updatedAtLabel: string;
  dashboard: MobileExecutiveDashboardDto;
  operational: MobileOperationalExecutive;
  executiveBrief: MobileExecutiveDashboardDto["brief"];
  decision: MobileExecutiveDashboardDto["decision"];
  analyticsDecision: {
    available: boolean;
    headline: string | null;
    decisions: Array<{
      id: string;
      title: string;
      recommendation: string;
      priority: string;
      href: string | null;
    }>;
    risks: string[];
    opportunities: string[];
    bottlenecks: string[];
  };
  kpiHealth: MobileKpiHealthRow[];
  alertCenter: MobileAlertCenter;
  metas: MobileIntelligenceMetas;
  quickActions: MobileQuickAction[];
  moduleSync: {
    dashboard: string;
    operacao: string | null;
    crm: string | null;
    financeiro: string | null;
    estoque: string | null;
    lastSyncLabel: string;
  };
};

const LEVEL_LABEL: Record<KpiHealthItem["level"], string> = {
  excelente: "Excelente",
  bom: "Bom",
  atencao: "Atenção",
  critico: "Crítico",
};

function mapKpiHealth(items: KpiHealthItem[]): MobileKpiHealthRow[] {
  return items.map((k) => ({
    metricId: k.metricId,
    name: k.name,
    level: k.level,
    levelLabel: LEVEL_LABEL[k.level],
    reason: k.reason,
    trend: k.trend,
    deltaPercent: k.deltaPercent,
    formatted: k.formatted,
    historyHint: k.historyHint,
  }));
}

function buildSmartQuickActions(
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
      id: "novo-veiculo",
      label: "Novo Veículo",
      href: `${root}/veiculos/novo`,
      permission: "os.visualizar",
    },
    {
      id: "financeiro",
      label: "Financeiro",
      href: `${root}/financeiro`,
      permission: "financeiro.visualizar",
    },
    { id: "crm", label: "CRM", href: `${root}/crm`, permission: "crm.visualizar" },
    { id: "agenda", label: "Agenda", href: `${root}/agenda`, permission: "agenda.visualizar" },
    {
      id: "estoque",
      label: "Estoque",
      href: `${root}/estoque`,
      permission: "estoque.visualizar",
    },
    {
      id: "analytics",
      label: "Analytics",
      href: `${root}/analytics`,
      permission: "analytics.visualizar",
    },
    {
      id: "equipe",
      label: "Equipe",
      href: `${root}/configuracoes/equipe`,
      permission: "usuarios.visualizar",
    },
    {
      id: "automacoes",
      label: "Automações",
      href: `${root}/automacoes`,
      permission: "automacoes.visualizar",
    },
    {
      id: "integracoes",
      label: "Integrações",
      href: `${root}/integracoes`,
      permission: "integracoes.visualizar",
    },
  ];

  return items.map((item) => ({
    ...item,
    enabled: can(item.permission),
  }));
}

function toAlertItem(input: {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  source: string;
  href?: string | null;
  suggestedAction?: string | null;
}): MobileAlertCenterItem {
  return {
    id: input.id,
    title: input.title,
    description: input.description,
    priority: input.priority,
    category: input.category,
    source: input.source,
    href: input.href ?? null,
    suggestedAction: input.suggestedAction ?? null,
  };
}

function bucketForCategory(raw: string): keyof Omit<MobileAlertCenter, "total"> {
  const c = raw.toLowerCase();
  if (/financ|caixa|dre|pagar|receber|tribut/.test(c)) return "financeiro";
  if (/crm|lead|pipeline|oportun|cliente comercial/.test(c)) return "crm";
  if (/estoq|sku|reposi|compra|fornecedor/.test(c)) return "estoque";
  if (/agenda|agendament|compromisso/.test(c)) return "agenda";
  if (/automa/.test(c)) return "automacoes";
  if (/sistema|observab|infra|sync/.test(c)) return "sistema";
  return "operacional";
}

function emptyAlertCenter(): MobileAlertCenter {
  return {
    operacional: [],
    financeiro: [],
    crm: [],
    estoque: [],
    agenda: [],
    automacoes: [],
    sistema: [],
    total: 0,
  };
}

function pushAlert(
  center: MobileAlertCenter,
  item: MobileAlertCenterItem,
  forced?: keyof Omit<MobileAlertCenter, "total">,
) {
  const bucket = forced ?? bucketForCategory(item.category);
  center[bucket].push(item);
  center.total += 1;
}

async function composeOperationalExecutive(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
}): Promise<MobileOperationalExecutive> {
  const client = resolveOpsDataClient(input.client);
  const centro = new CentroOperacoesService(client, input.tenantId);
  const osDash = new OsDashboardService(client, input.tenantId);
  const recursos = new RecursosOcupacaoService(client, input.tenantId);
  const mecDash = new MecanicosDashboardService(client, input.tenantId);
  const agenda = new AgendaEventService(client, input.tenantId);

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [centroData, dash, ocup, mecs, events] = await Promise.all([
    soft(() => centro.getData(input.tenantSlug)),
    soft(() => osDash.getData()),
    soft(() => recursos.getData()),
    soft(() => mecDash.getData()),
    soft(() => agenda.listRange(start.toISOString(), end.toISOString())),
  ]);

  const unavailable: string[] = [];
  if (!centroData) unavailable.push("centro_operacoes");
  if (!dash) unavailable.push("os_dashboard");
  if (!ocup) unavailable.push("ocupacao_recursos");
  if (!mecs) unavailable.push("produtividade_mecanicos");
  if (!events) unavailable.push("agenda");

  const cards = centroData?.cards;
  const entregues = cardCount(cards, "finalizadas_hoje");
  const abertas = cardCount(cards, "abertas") ?? dash?.kpis.abertas ?? null;
  const atrasadas = cardCount(cards, "atrasadas") ?? dash?.kpis.vencidas ?? null;

  const prodValues = (mecs?.mecanicos ?? [])
    .map((m) => m.eficiencia)
    .filter((p): p is number => p != null && Number.isFinite(p));
  const eficienciaAvg =
    prodValues.length > 0
      ? prodValues.reduce((a, b) => a + b, 0) / prodValues.length
      : null;

  const ativos =
    mecs?.resumoCusto.ativosCadastro ??
    (mecs?.mecanicos.filter((m) => m.emExecucao > 0).length || null);

  const tempo = dash?.kpis.tempoMedioConclusaoDias;
  const pendentes = dash?.kpis.pendentes ?? null;

  return {
    producaoDia:
      entregues != null
        ? `${entregues} entregue(s) hoje`
        : money(dash?.kpis.faturamento),
    ordensAbertas: abertas != null ? String(abertas) : null,
    ordensAtrasadas: atrasadas != null ? String(atrasadas) : null,
    agendaDia: events != null ? `${events.length} compromisso(s)` : null,
    mecanicosAtivos: ativos != null ? String(ativos) : null,
    tempoMedioOs:
      tempo != null && Number.isFinite(tempo)
        ? `${tempo.toFixed(1)} dia(s)`
        : null,
    ticketMedio: money(dash?.kpis.ticketMedio),
    carrosEntregues: entregues != null ? String(entregues) : null,
    servicosPendentes: pendentes != null ? String(pendentes) : null,
    eficienciaOperacional:
      eficienciaAvg != null
        ? `${eficienciaAvg.toFixed(0)}%`
        : ocup?.kpis.taxaOcupacao != null
          ? `${ocup.kpis.taxaOcupacao}% ocupação`
          : null,
    unavailable,
  };
}

async function composeAnalyticsPack(input: {
  tenantId: string;
  tenantSlug: string;
  permissions: readonly string[];
}): Promise<DecisionCenterPack | null> {
  if (!hasAnalyticsViewAccess(input.permissions)) return null;
  const period = resolvePeriodPreset("last_30");
  const snap = await loadAnalyticsDomainSnapshot({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    period,
  });
  if (snap.tenantId !== input.tenantId) {
    throw new Error("Cross-tenant bloqueado no Analytics mobile.");
  }
  const bundle = buildExecutiveAnalyticsBundle({
    snap,
    permissions: input.permissions,
    periodPreset: "last_30",
  });
  return (
    bundle.decisionCenter ??
    composeDecisionCenterPack({
      kpis: bundle.kpis as NonNullable<(typeof bundle.kpis)[number]>[],
      metrics: bundle.metrics,
      comparisons: bundle.comparisons,
      alerts: bundle.alerts,
      insights: bundle.insights,
      trends: bundle.trends,
      targets: bundle.targets,
      context: bundle.context,
      updatedAt: bundle.updatedAt,
      empty: bundle.empty,
    })
  );
}

async function composeAlertCenter(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  permissions: readonly string[];
  cockpitAlerts: CockpitAlert[];
  analyticsAlerts: DecisionCenterPack["alerts"] | null;
}): Promise<MobileAlertCenter> {
  const center = emptyAlertCenter();
  const client = resolveDataClient(input.client);

  for (const a of input.cockpitAlerts) {
    pushAlert(
      center,
      toAlertItem({
        id: `cockpit-${a.id}`,
        title: a.title,
        description: a.description,
        priority: a.priority,
        category: a.category,
        source: a.source,
        href: a.href,
        suggestedAction: a.suggestedAction,
      }),
    );
  }

  for (const a of input.analyticsAlerts ?? []) {
    pushAlert(
      center,
      toAlertItem({
        id: `analytics-${a.id}`,
        title: a.title,
        description: a.description,
        priority: a.severity,
        category: a.category,
        source: "Analytics Decision Center",
        href: a.href,
        suggestedAction: a.recommendation,
      }),
    );
  }

  const [crm, stock, opsNotif, finance] = await Promise.all([
    soft(async () => {
      if (!hasPerm(input.permissions, "crm.visualizar")) return null;
      return composeCrmAlerts({
        client,
        tenantId: input.tenantId,
        tenantSlug: input.tenantSlug,
        permissions: input.permissions,
      });
    }),
    soft(async () => {
      if (!hasPerm(input.permissions, "estoque.visualizar")) return null;
      return composeStockAlerts({
        client,
        tenantId: input.tenantId,
        tenantSlug: input.tenantSlug,
        permissions: input.permissions,
      });
    }),
    soft(async () => {
      if (
        !hasPerm(input.permissions, "centro_operacoes.ver_alertas") &&
        !hasPerm(input.permissions, "centro_operacoes.visualizar") &&
        !hasPerm(input.permissions, "os.visualizar")
      ) {
        return null;
      }
      return composeOpsNotifications({
        client,
        tenantId: input.tenantId,
        tenantSlug: input.tenantSlug,
        permissions: input.permissions,
      });
    }),
    soft(async () => {
      if (!hasPerm(input.permissions, "financeiro.visualizar")) return null;
      return composeFinanceSummary({
        client,
        tenantId: input.tenantId,
        tenantSlug: input.tenantSlug,
        permissions: input.permissions,
      });
    }),
  ]);

  for (const row of crm?.alerts ?? []) {
    pushAlert(
      center,
      toAlertItem({
        id: `crm-${row.id}`,
        title: row.title,
        description: row.description,
        priority: row.priority,
        category: row.category,
        source: "CRM Enterprise",
        href: row.href,
      }),
      "crm",
    );
  }

  for (const row of stock?.alerts ?? []) {
    pushAlert(
      center,
      toAlertItem({
        id: `stock-${row.id}`,
        title: row.title,
        description: row.description,
        priority: row.priority,
        category: row.category,
        source: "Estoque / Supply",
        href: row.href,
      }),
      "estoque",
    );
  }

  for (const row of opsNotif?.alerts ?? []) {
    const forced = /agenda/i.test(`${row.category} ${row.title}`)
      ? ("agenda" as const)
      : ("operacional" as const);
    pushAlert(
      center,
      toAlertItem({
        id: `ops-${row.id}`,
        title: row.title,
        description: row.description,
        priority: row.priority,
        category: row.category,
        source: "Operação",
        href: row.href,
      }),
      forced,
    );
  }

  for (const a of finance?.alerts ?? []) {
    pushAlert(
      center,
      toAlertItem({
        id: `fin-${a.id}`,
        title: a.title,
        description: a.description,
        priority: a.priority,
        category: a.category,
        source: "Financeiro Mobile",
        href: a.href,
      }),
      "financeiro",
    );
  }

  return center;
}

export type ComposeMobileIntelligenceInput = ComposeMobileDashboardInput;

export async function composeMobileIntelligencePack(
  input: ComposeMobileIntelligenceInput,
): Promise<MobileIntelligencePack> {
  if (!hasExecutiveDashboardAccess(input.permissions)) {
    throw new Error("FORBIDDEN_EXECUTIVE");
  }

  const client = resolveDataClient(input.userClient);

  const [dashboard, operational, analytics] = await Promise.all([
    composeMobileExecutiveDashboard(input),
    soft(() =>
      composeOperationalExecutive({
        client,
        tenantId: input.tenantId,
        tenantSlug: input.tenantSlug,
      }),
    ),
    soft(() =>
      composeAnalyticsPack({
        tenantId: input.tenantId,
        tenantSlug: input.tenantSlug,
        permissions: input.permissions,
      }),
    ),
  ]);

  const alertCenter =
    (await soft(() =>
      composeAlertCenter({
        client: input.userClient,
        tenantId: input.tenantId,
        tenantSlug: input.tenantSlug,
        permissions: input.permissions,
        cockpitAlerts: dashboard.alerts,
        analyticsAlerts: analytics?.alerts ?? null,
      }),
    )) ?? emptyAlertCenter();

  const opsDash = await soft(() =>
    composeOpsDashboard({
      client: input.userClient,
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      permissions: input.permissions,
      segment: input.segment,
      segmentVersion: input.segmentVersion,
      segmentConfig: input.segmentConfig,
    }),
  );

  const kpiFromPack = analytics?.kpiHealth
    ? mapKpiHealth(analytics.kpiHealth)
    : [];

  const decisions = (analytics?.decisions ?? []).slice(0, 12).map((d) => ({
    id: d.id,
    title: d.problem,
    recommendation: d.recommendation,
    priority: d.priority,
    href: d.href ?? null,
  }));

  const risks = [
    ...(analytics?.brief?.biggestRisk
      ? [analytics.brief.biggestRisk.evidence]
      : []),
    ...dashboard.decision.items
      .filter((i) => i.severity === "critica" || i.severity === "alta")
      .slice(0, 3)
      .map((i) => i.title),
  ];

  const opportunities = [
    ...(analytics?.brief?.biggestOpportunity
      ? [analytics.brief.biggestOpportunity.evidence]
      : []),
    ...dashboard.decision.items
      .filter((i) => /oportun/i.test(i.category) || i.severity === "baixa")
      .slice(0, 3)
      .map((i) => i.title),
  ];

  const bottlenecks = dashboard.decision.items
    .filter((i) => /gargalo|atras|ocupa|pendenc/i.test(`${i.title} ${i.description}`))
    .slice(0, 5)
    .map((i) => i.title);

  const monthTone = dashboard.metas.month.tone;
  const metas: MobileIntelligenceMetas = {
    ...dashboard.metas,
    dayTrend: dashboard.metas.day.available ? dashboard.metas.day.pct : null,
    weekTrend: dashboard.metas.week.available ? "Série diária (7d)" : null,
    monthTrend: dashboard.metas.month.available
      ? `${dashboard.metas.month.pct}${
          monthTone ? ` · ${monthTone}` : ""
        }`
      : null,
  };

  const quickActions = buildSmartQuickActions(
    input.tenantSlug,
    input.permissions,
  );

  const fallbackOperational: MobileOperationalExecutive = {
    producaoDia: null,
    ordensAbertas: null,
    ordensAtrasadas: null,
    agendaDia: null,
    mecanicosAtivos: null,
    tempoMedioOs: null,
    ticketMedio: null,
    carrosEntregues: null,
    servicosPendentes: null,
    eficienciaOperacional: null,
    unavailable: ["operational_compose"],
  };

  return {
    generatedAt: new Date().toISOString(),
    updatedAtLabel: dashboard.updatedAtLabel,
    dashboard: {
      ...dashboard,
      quickActions,
    },
    operational: operational ?? fallbackOperational,
    executiveBrief: dashboard.brief,
    decision: dashboard.decision,
    analyticsDecision: {
      available: Boolean(analytics),
      headline:
        analytics?.report?.summary ??
        analytics?.brief?.nextAction?.title ??
        null,
      decisions,
      risks,
      opportunities,
      bottlenecks,
    },
    kpiHealth: kpiFromPack,
    alertCenter,
    metas,
    quickActions,
    moduleSync: {
      dashboard: dashboard.generatedAt,
      operacao: opsDash?.generatedAt ?? null,
      crm: null,
      financeiro: null,
      estoque: null,
      lastSyncLabel: new Date().toLocaleString("pt-BR"),
    },
  };
}

export async function composeMobileOperationalDashboardOnly(
  input: ComposeMobileIntelligenceInput,
): Promise<MobileOperationalExecutive> {
  if (!hasExecutiveDashboardAccess(input.permissions)) {
    throw new Error("FORBIDDEN_EXECUTIVE");
  }
  const client = resolveDataClient(input.userClient);
  return (
    (await soft(() =>
      composeOperationalExecutive({
        client,
        tenantId: input.tenantId,
        tenantSlug: input.tenantSlug,
      }),
    )) ?? {
      producaoDia: null,
      ordensAbertas: null,
      ordensAtrasadas: null,
      agendaDia: null,
      mecanicosAtivos: null,
      tempoMedioOs: null,
      ticketMedio: null,
      carrosEntregues: null,
      servicosPendentes: null,
      eficienciaOperacional: null,
      unavailable: ["operational_compose"],
    }
  );
}
