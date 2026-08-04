import "server-only";

/**
 * Sprint 31.4 — Compose CRM Mobile.
 * Orquestra services/premium existentes — sem novas fórmulas comerciais.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { formatCurrencyCompact, formatPercent } from "@/lib/dashboard/format";
import { ClienteTimelineService } from "@/lib/crm/cliente-timeline-service";
import { CrmFunilService } from "@/lib/crm/crm-funnel-service";
import { CrmOportunidadeService } from "@/lib/crm/enterprise/oportunidade-service";
import { hasCrmViewAccess } from "@/lib/crm/rbac-compat";
import { buildClientsAtRisk } from "@/lib/crm/premium/clients-at-risk";
import {
  computeCommercialScore,
  daysBetween,
} from "@/lib/crm/premium/commercial-score";
import { groupPremiumFollowUps } from "@/lib/crm/premium/follow-up-buckets";
import { buildOwnerRanking } from "@/lib/crm/premium/owner-ranking";
import { buildRevenueForecast } from "@/lib/crm/premium/revenue-forecast";
import type { FollowUpItem } from "@/lib/crm/phase28/follow-up-queue";
import type { CrmFunilStage } from "@/lib/crm/constants";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type { CrmOportunidadeRow } from "@/types/crm-enterprise";

export function resolveCrmDataClient(
  userClient: SupabaseClient<Database>,
): SupabaseClient<Database> {
  if (isAdminClientAvailable()) return createAdminClient();
  return userClient;
}

async function soft<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

function hasPerm(permissions: readonly string[], key: string): boolean {
  return permissions.includes("*") || permissions.includes(key);
}

export function canViewCrm(permissions: readonly string[]): boolean {
  return (
    hasCrmViewAccess(permissions) ||
    hasPerm(permissions, "clientes.visualizar") ||
    hasPerm(permissions, "crm.dashboard.visualizar") ||
    hasPerm(permissions, "crm.pipeline.visualizar")
  );
}

function assertCrmView(permissions: readonly string[]) {
  if (!canViewCrm(permissions)) throw new Error("FORBIDDEN_CRM");
}

function money(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return formatCurrencyCompact(n);
}

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

async function loadFollowUpItems(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<FollowUpItem[]> {
  const items: FollowUpItem[] = [];
  const { data, error } = await supabase
    .from("cliente_tarefas" as never)
    .select("id, titulo, tipo, status, data_vencimento, cliente_id, responsavel_id")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .in("status", ["pendente", "em_andamento"])
    .limit(400);

  if (error || !data) return items;
  const rows = data as Array<Record<string, unknown>>;
  const clienteIds = [...new Set(rows.map((r) => String(r.cliente_id)))];
  const nomes = new Map<string, string>();
  if (clienteIds.length) {
    const { data: clientes } = await supabase
      .from("clientes")
      .select("id, nome")
      .eq("tenant_id", tenantId)
      .in("id", clienteIds.slice(0, 300));
    for (const c of clientes ?? []) nomes.set(c.id, c.nome);
  }
  for (const r of rows) {
    items.push({
      id: String(r.id),
      tipo: String(r.tipo ?? "tarefa"),
      titulo: String(r.titulo ?? "Follow-up"),
      clienteId: String(r.cliente_id),
      clienteNome: nomes.get(String(r.cliente_id)) ?? "Cliente",
      responsavelId: (r.responsavel_id as string | null) ?? null,
      dataRef: String(r.data_vencimento ?? "").slice(0, 10),
      status: String(r.status ?? "pendente"),
      origem: "tarefa",
    });
  }
  return items;
}

async function resolveNames(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return map;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", unique.slice(0, 80));
  for (const p of data ?? []) {
    map.set(p.id, p.full_name?.trim() || p.email || p.id.slice(0, 8));
  }
  return map;
}

export type MobileCrmQuickAction = {
  id: string;
  label: string;
  href: string;
  permission: string | null;
  enabled: boolean;
  opensWeb: boolean;
};

export type MobileCrmAlert = {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  href: string | null;
};

export type MobileCrmDashboard = {
  generatedAt: string;
  updatedAtLabel: string;
  kpis: {
    receitaPrevista: string | null;
    receitaFechada: string | null;
    receitaProvavel: string | null;
    conversao: string | null;
    followUpsPendentes: number | null;
    negociosEmRisco: number | null;
    valorPipeline: string | null;
    ticketMedio: string | null;
  };
  forecast: {
    prevista: string | null;
    provavel: string | null;
    fechada: string | null;
    conversao: string | null;
  };
  ranking: Array<{ nome: string; prevista: string; fechada: string }>;
  alerts: MobileCrmAlert[];
  decisionBrief: string[];
  quickActions: MobileCrmQuickAction[];
  unavailable: string[];
};

export type MobileCrmPipelineColumn = {
  stage: string;
  label: string;
  count: number;
  totalValor: string;
  cards: Array<{
    id: string;
    nome: string;
    valor: string | null;
    score: number | null;
    origem: string | null;
    diasParado: number | null;
    responsavelId: string | null;
  }>;
};

export type MobileCrmClientListItem = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  segmento: string | null;
  status: string | null;
  score: number | null;
  responsavel: string | null;
  ultimaInteracao: string | null;
  valorGerado: string | null;
};

export type MobileCrmClientDetail = {
  id: string;
  nome: string;
  fields: Array<{ label: string; value: string }>;
  score: number | null;
  tags: string[];
};

export type MobileCrmTimelineItem = {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  autor: string | null;
  at: string;
  clienteId: string | null;
  clienteNome: string | null;
};

export type MobileCrmFollowUpBucket = {
  id: string;
  label: string;
  items: Array<{
    id: string;
    titulo: string;
    clienteNome: string;
    clienteId: string;
    dataRef: string;
    status: string;
    responsavelId: string | null;
  }>;
};

function buildQuickActions(
  tenantSlug: string,
  permissions: readonly string[],
): MobileCrmQuickAction[] {
  const en = (key: string) => hasPerm(permissions, "*") || hasPerm(permissions, key);
  return [
    {
      id: "novo-cliente",
      label: "Novo cliente",
      href: `/${tenantSlug}/clientes`,
      permission: "clientes.criar",
      enabled: en("clientes.criar") || en("crm.criar"),
      opensWeb: true,
    },
    {
      id: "novo-followup",
      label: "Novo follow-up",
      href: `/${tenantSlug}/crm/follow-ups`,
      permission: "crm.atividades.criar",
      enabled: en("crm.atividades.criar") || en("crm.criar"),
      opensWeb: true,
    },
    {
      id: "nova-oportunidade",
      label: "Nova oportunidade",
      href: `/${tenantSlug}/crm/oportunidades`,
      permission: "crm.oportunidades.criar",
      enabled: en("crm.oportunidades.criar") || en("crm.criar"),
      opensWeb: true,
    },
    {
      id: "pipeline",
      label: "Abrir Pipeline",
      href: "/crm/pipeline",
      permission: "crm.pipeline.visualizar",
      enabled: true,
      opensWeb: false,
    },
    {
      id: "timeline",
      label: "Abrir Timeline",
      href: "/crm/timeline",
      permission: "crm.visualizar",
      enabled: true,
      opensWeb: false,
    },
    {
      id: "forecast",
      label: "Abrir Forecast",
      href: "/crm/forecast",
      permission: "crm.dashboard.visualizar",
      enabled: true,
      opensWeb: false,
    },
    {
      id: "crm-web",
      label: "Abrir CRM Web",
      href: `/${tenantSlug}/crm/executivo`,
      permission: "crm.visualizar",
      enabled: true,
      opensWeb: true,
    },
  ];
}

async function loadClienteRows(client: SupabaseClient, tenantId: string) {
  const { data } = await client
    .from("clientes" as never)
    .select(
      "id, nome, estagio_funil, updated_at, created_at, consultor_id, score, valor_estimado, valor_potencial, probabilidade, origem, motivo_perda, telefone, email, cidade, segmento, status",
    )
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .limit(500);
  return (data ?? []) as Array<{
    id: string;
    nome: string;
    estagio_funil: string;
    updated_at: string;
    created_at: string;
    consultor_id: string | null;
    score: number | null;
    valor_estimado: number | null;
    valor_potencial: number | null;
    probabilidade: number | null;
    origem: string | null;
    motivo_perda: string | null;
    telefone: string | null;
    email: string | null;
    cidade: string | null;
    segmento: string | null;
    status: string | null;
  }>;
}

export async function composeCrmDashboard(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  permissions: readonly string[];
}): Promise<MobileCrmDashboard> {
  assertCrmView(input.permissions);
  const client = resolveCrmDataClient(input.client);
  const unavailable: string[] = [];
  const now = new Date();
  const thisMonth = monthKey(now);
  const hoje = hojeIso();

  const oppService = new CrmOportunidadeService(client, input.tenantId);
  const opps =
    (await soft(() => oppService.listAll(500))) ?? ([] as CrmOportunidadeRow[]);
  if (!opps.length) unavailable.push("oportunidades");

  const followUps =
    (await soft(() => loadFollowUpItems(client, input.tenantId))) ?? [];
  const clienteRows = await loadClienteRows(client, input.tenantId);

  const ownerIds = [
    ...opps.map((o) => o.responsavel_id).filter(Boolean),
    ...followUps.map((f) => f.responsavelId).filter(Boolean),
    ...clienteRows.map((c) => c.consultor_id).filter(Boolean),
  ] as string[];
  const nameByOwner = await resolveNames(client, ownerIds);

  const forecast = buildRevenueForecast(opps, {
    periodMonth: thisMonth,
    nameByOwner,
  });

  const premiumFu = groupPremiumFollowUps(followUps, hoje);
  const overdueClienteIds = new Set(premiumFu.atrasados.map((f) => f.clienteId));
  const abertas = opps.filter((o) => o.status === "aberta");
  const staleOppClientes = new Set(
    abertas
      .filter((o) => (daysBetween(o.updated_at, now) ?? 0) >= 21)
      .map((o) => o.cliente_id),
  );

  const atRisk = buildClientsAtRisk(
    clienteRows.map((c) => {
      const valor = Number(c.valor_estimado ?? c.valor_potencial ?? 0);
      const score = computeCommercialScore({
        daysWithoutContact: daysBetween(c.updated_at, now),
        valorEstimado: valor,
        stage: c.estagio_funil,
        historicoCount: 0,
        atividadeCount: 0,
        origem: c.origem,
      });
      return {
        id: c.id,
        nome: c.nome,
        estagio: c.estagio_funil ?? "lead",
        updatedAt: c.updated_at,
        ultimoContatoAt: c.updated_at,
        followUpVencido: overdueClienteIds.has(c.id),
        openOppStale: staleOppClientes.has(c.id),
        activityCount30d: 0,
        commercialScore: score.score,
      };
    }),
    now,
  );

  const followUpsByOwner = new Map<string, number>();
  for (const f of followUps) {
    const key = f.responsavelId ?? "sem";
    followUpsByOwner.set(key, (followUpsByOwner.get(key) ?? 0) + 1);
  }
  const ranking = buildOwnerRanking({
    opps,
    followUpsByOwner,
    activitiesByOwner: new Map(),
    nameByOwner,
  });

  const valorPipeline = abertas.reduce(
    (a, o) => a + Number(o.valor_estimado ?? 0),
    0,
  );
  const closed = opps.filter((o) => o.status === "ganha" || o.status === "perdida");
  const ganhas = opps.filter((o) => o.status === "ganha");
  const conversao =
    closed.length > 0 ? Math.round((ganhas.length / closed.length) * 1000) / 10 : null;
  const ticketMedio =
    ganhas.length > 0
      ? ganhas.reduce((a, o) => a + Number(o.valor_estimado ?? 0), 0) / ganhas.length
      : null;

  const alerts: MobileCrmAlert[] = [];
  if (premiumFu.atrasados.length > 0) {
    alerts.push({
      id: "followup-atrasado",
      title: "Follow-up atrasado",
      description: `${premiumFu.atrasados.length} follow-up(s) vencido(s)`,
      priority: "alta",
      category: "followup",
      href: "/crm/followups",
    });
  }
  if (atRisk.length > 0) {
    alerts.push({
      id: "negocio-risco",
      title: "Negócio em risco",
      description: `${atRisk.length} cliente(s) com sinal de risco`,
      priority: "alta",
      category: "risco",
      href: "/crm/clients",
    });
  }
  if (abertas.length === 0) {
    alerts.push({
      id: "pipeline-vazio",
      title: "Pipeline vazio",
      description: "Não há oportunidades abertas no momento",
      priority: "media",
      category: "pipeline",
      href: "/crm/pipeline",
    });
  }
  if (conversao != null && conversao < 20 && closed.length >= 5) {
    alerts.push({
      id: "queda-conversao",
      title: "Conversão baixa",
      description: `Taxa de conversão em ${formatPercent(conversao)}`,
      priority: "media",
      category: "conversao",
      href: "/crm/forecast",
    });
  }

  const decisionBrief: string[] = [
    forecast.receitaProvavel > 0
      ? `Receita provável ${money(forecast.receitaProvavel)}`
      : "Sem receita provável calculável no período",
  ];
  if (followUps.length) {
    decisionBrief.push(`${followUps.length} follow-up(s) pendente(s)`);
  }
  if (atRisk.length) {
    decisionBrief.push(`${atRisk.length} cliente(s) em risco comercial`);
  }

  return {
    generatedAt: new Date().toISOString(),
    updatedAtLabel: new Date().toLocaleString("pt-BR"),
    kpis: {
      receitaPrevista: money(forecast.receitaPrevista),
      receitaFechada: money(forecast.receitaFechada),
      receitaProvavel: money(forecast.receitaProvavel),
      conversao: conversao != null ? formatPercent(conversao) : null,
      followUpsPendentes: followUps.length,
      negociosEmRisco: atRisk.length,
      valorPipeline: money(valorPipeline),
      ticketMedio: money(ticketMedio),
    },
    forecast: {
      prevista: money(forecast.receitaPrevista),
      provavel: money(forecast.receitaProvavel),
      fechada: money(forecast.receitaFechada),
      conversao: conversao != null ? formatPercent(conversao) : null,
    },
    ranking: ranking.slice(0, 8).map((r) => ({
      nome: r.nome,
      prevista: money(r.pipeline) ?? "—",
      fechada: money(r.receita) ?? "—",
    })),
    alerts,
    decisionBrief,
    quickActions: buildQuickActions(input.tenantSlug, input.permissions),
    unavailable,
  };
}

export async function composeCrmPipeline(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
}): Promise<{ columns: MobileCrmPipelineColumn[]; unavailable: boolean }> {
  assertCrmView(input.permissions);
  const client = resolveCrmDataClient(input.client);
  const funil = new CrmFunilService(client, input.tenantId);
  const byStage = await soft(() => funil.listByStage());
  if (!byStage) return { columns: [], unavailable: true };

  const columns: MobileCrmPipelineColumn[] = (
    Object.entries(byStage) as Array<[CrmFunilStage, (typeof byStage)[CrmFunilStage]]>
  ).map(([stage, cards]) => {
    const total = cards.reduce(
      (a, c) => a + Number(c.valor_estimado ?? c.valor_pipeline ?? 0),
      0,
    );
    return {
      stage,
      label: stage.replace(/_/g, " "),
      count: cards.length,
      totalValor: money(total) ?? "—",
      cards: cards.slice(0, 40).map((c) => ({
        id: c.id,
        nome: c.nome,
        valor: money(c.valor_estimado ?? c.valor_pipeline),
        score: c.score ?? null,
        origem: c.origem ?? null,
        diasParado: c.tempo_parado_dias ?? null,
        responsavelId: c.consultor_id ?? null,
      })),
    };
  });

  return { columns, unavailable: false };
}

export async function composeCrmClients(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  q?: string | null;
}): Promise<{ items: MobileCrmClientListItem[]; total: number }> {
  assertCrmView(input.permissions);
  const client = resolveCrmDataClient(input.client);
  let rows = await loadClienteRows(client, input.tenantId);
  const q = (input.q ?? "").trim().toLowerCase();
  if (q) {
    rows = rows.filter((r) => r.nome.toLowerCase().includes(q));
  }
  const names = await resolveNames(
    client,
    rows.map((r) => r.consultor_id).filter(Boolean) as string[],
  );

  return {
    total: rows.length,
    items: rows.slice(0, 100).map((r) => ({
      id: r.id,
      nome: r.nome,
      telefone: r.telefone,
      email: r.email,
      cidade: r.cidade,
      segmento: r.segmento,
      status: r.status ?? r.estagio_funil,
      score: r.score,
      responsavel: r.consultor_id ? names.get(r.consultor_id) ?? null : null,
      ultimaInteracao: r.updated_at?.slice(0, 10) ?? null,
      valorGerado: money(r.valor_estimado),
    })),
  };
}

export async function composeCrmClientDetail(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  clienteId: string;
}): Promise<MobileCrmClientDetail> {
  assertCrmView(input.permissions);
  const client = resolveCrmDataClient(input.client);
  const { data, error } = await client
    .from("clientes" as never)
    .select(
      "id, nome, telefone, email, cidade, segmento, status, estagio_funil, score, valor_estimado, valor_potencial, probabilidade, origem, updated_at, tags",
    )
    .eq("tenant_id", input.tenantId)
    .eq("id", input.clienteId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Cliente não encontrado");
  const c = data as Record<string, unknown>;
  const now = new Date();
  const score = computeCommercialScore({
    daysWithoutContact: daysBetween(String(c.updated_at ?? ""), now),
    valorEstimado: Number(c.valor_estimado ?? c.valor_potencial ?? 0),
    stage: String(c.estagio_funil ?? c.status ?? ""),
    historicoCount: 0,
    atividadeCount: 0,
    origem: (c.origem as string | null) ?? null,
  });

  const tagsRaw = c.tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map((t) => (typeof t === "string" ? t : String(t)))
    : [];

  return {
    id: input.clienteId,
    nome: String(c.nome ?? "Cliente"),
    fields: [
      { label: "Empresa", value: String(c.nome ?? "—") },
      { label: "Telefone", value: String(c.telefone ?? "—") },
      { label: "E-mail", value: String(c.email ?? "—") },
      { label: "Cidade", value: String(c.cidade ?? "—") },
      { label: "Segmento", value: String(c.segmento ?? "—") },
      { label: "Status", value: String(c.status ?? c.estagio_funil ?? "—") },
      {
        label: "Valor estimado",
        value: money(Number(c.valor_estimado ?? 0)) ?? "—",
      },
      { label: "Score", value: String(score.score) },
    ],
    score: score.score,
    tags,
  };
}

export async function composeCrmTimeline(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  clienteId?: string | null;
}): Promise<{ items: MobileCrmTimelineItem[] }> {
  assertCrmView(input.permissions);
  const client = resolveCrmDataClient(input.client);

  if (input.clienteId) {
    const svc = new ClienteTimelineService(client, input.tenantId);
    const events = await svc.listByCliente(input.clienteId);
    return {
      items: events.slice(0, 80).map((e) => ({
        id: e.id,
        tipo: e.tipo ?? "observacao",
        titulo: e.titulo ?? e.tipo ?? "Evento",
        descricao: e.descricao ?? null,
        autor: null,
        at: e.created_at,
        clienteId: input.clienteId!,
        clienteNome: null,
      })),
    };
  }

  const { data, error } = await client
    .from("cliente_eventos" as never)
    .select("id, tipo, titulo, descricao, created_at, cliente_id, user_id")
    .eq("tenant_id", input.tenantId)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return {
    items: rows.map((e) => ({
      id: String(e.id),
      tipo: String(e.tipo ?? "observacao"),
      titulo: String(e.titulo ?? e.tipo ?? "Evento"),
      descricao: (e.descricao as string | null) ?? null,
      autor: null,
      at: String(e.created_at),
      clienteId: e.cliente_id ? String(e.cliente_id) : null,
      clienteNome: null,
    })),
  };
}

export async function composeCrmFollowups(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
}): Promise<{ buckets: MobileCrmFollowUpBucket[] }> {
  assertCrmView(input.permissions);
  const client = resolveCrmDataClient(input.client);
  const followUps = await loadFollowUpItems(client, input.tenantId);
  const grouped = groupPremiumFollowUps(followUps, hojeIso());

  const labelMap: Record<string, string> = {
    hoje: "Hoje",
    atrasados: "Atrasados",
    amanha: "Amanhã",
    esta_semana: "Semana",
    sem_responsavel: "Sem responsável",
    sem_data: "Sem data",
  };

  return {
    buckets: (Object.entries(grouped) as Array<[string, FollowUpItem[]]>).map(
      ([id, items]) => ({
        id,
        label: labelMap[id] ?? id,
        items: items.map((i) => ({
          id: i.id,
          titulo: i.titulo,
          clienteNome: i.clienteNome,
          clienteId: i.clienteId,
          dataRef: i.dataRef,
          status: i.status,
          responsavelId: i.responsavelId,
        })),
      }),
    ),
  };
}

export async function composeCrmOpportunities(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
}): Promise<{
  items: Array<{
    id: string;
    titulo: string;
    stage: string;
    status: string;
    valor: string | null;
    probabilidade: number | null;
    clienteId: string;
  }>;
}> {
  assertCrmView(input.permissions);
  const client = resolveCrmDataClient(input.client);
  const svc = new CrmOportunidadeService(client, input.tenantId);
  const rows = (await soft(() => svc.listAll(200))) ?? [];
  return {
    items: rows.map((o) => ({
      id: o.id,
      titulo: o.titulo,
      stage: o.stage_key,
      status: o.status,
      valor: money(o.valor_estimado),
      probabilidade: o.probabilidade,
      clienteId: o.cliente_id,
    })),
  };
}

export async function composeCrmForecast(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
}): Promise<{
  prevista: string | null;
  provavel: string | null;
  fechada: string | null;
  conversao: string | null;
  funil: Array<{ stage: string; count: number; valor: string; ponderado: string }>;
  porResponsavel: Array<{
    nome: string;
    prevista: string;
    provavel: string;
    fechada: string;
  }>;
}> {
  assertCrmView(input.permissions);
  const client = resolveCrmDataClient(input.client);
  const svc = new CrmOportunidadeService(client, input.tenantId);
  const opps = (await soft(() => svc.listAll(500))) ?? [];
  const nameByOwner = await resolveNames(
    client,
    opps.map((o) => o.responsavel_id).filter(Boolean) as string[],
  );
  const forecast = buildRevenueForecast(opps, {
    periodMonth: monthKey(),
    nameByOwner,
  });
  const closed = opps.filter((o) => o.status === "ganha" || o.status === "perdida");
  const ganhas = opps.filter((o) => o.status === "ganha");
  const conversao =
    closed.length > 0 ? Math.round((ganhas.length / closed.length) * 1000) / 10 : null;

  return {
    prevista: money(forecast.receitaPrevista),
    provavel: money(forecast.receitaProvavel),
    fechada: money(forecast.receitaFechada),
    conversao: conversao != null ? formatPercent(conversao) : null,
    funil: forecast.funil.map((f) => ({
      stage: f.stage,
      count: f.count,
      valor: money(f.valor) ?? "—",
      ponderado: money(f.ponderado) ?? "—",
    })),
    porResponsavel: forecast.porResponsavel.slice(0, 12).map((r) => ({
      nome: r.nome,
      prevista: money(r.prevista) ?? "—",
      provavel: money(r.provavel) ?? "—",
      fechada: money(r.fechada) ?? "—",
    })),
  };
}

export async function composeCrmRanking(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
}): Promise<{
  items: Array<{
    nome: string;
    prevista: string;
    fechada: string;
    abertas: number;
  }>;
}> {
  assertCrmView(input.permissions);
  const client = resolveCrmDataClient(input.client);
  const svc = new CrmOportunidadeService(client, input.tenantId);
  const opps = (await soft(() => svc.listAll(500))) ?? [];
  const nameByOwner = await resolveNames(
    client,
    opps.map((o) => o.responsavel_id).filter(Boolean) as string[],
  );
  const followUps =
    (await soft(() => loadFollowUpItems(client, input.tenantId))) ?? [];
  const followUpsByOwner = new Map<string, number>();
  for (const f of followUps) {
    const key = f.responsavelId ?? "sem";
    followUpsByOwner.set(key, (followUpsByOwner.get(key) ?? 0) + 1);
  }
  const ranking = buildOwnerRanking({
    opps,
    followUpsByOwner,
    activitiesByOwner: new Map(),
    nameByOwner,
  });
  return {
    items: ranking.slice(0, 20).map((r) => ({
      nome: r.nome,
      prevista: money(r.pipeline) ?? "—",
      fechada: money(r.receita) ?? "—",
      abertas: opps.filter(
        (o) => o.responsavel_id === r.responsavelId && o.status === "aberta",
      ).length,
    })),
  };
}

export async function composeCrmAlerts(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  permissions: readonly string[];
}): Promise<{ alerts: MobileCrmAlert[] }> {
  const dash = await composeCrmDashboard(input);
  return { alerts: dash.alerts };
}
