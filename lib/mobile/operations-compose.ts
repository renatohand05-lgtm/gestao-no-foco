import "server-only";

/**
 * Sprint 31.6 — Compose Operação Mobile.
 * Orquestra OrdemServicoService, OsDashboardService, CentroOperacoesService,
 * AgendaEventService, MecanicoService, VeiculoService, ClienteService,
 * AlertasOperacionaisService, RecursosOcupacaoService, InspecaoStorageService.
 * Sem novas fórmulas operacionais.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { AgendaEventService } from "@/lib/agenda/agenda-service";
import { detectAgendaConflicts } from "@/lib/agenda/conflict";
import { ClienteService } from "@/lib/clientes/cliente-service";
import { formatCurrencyCompact } from "@/lib/dashboard/format";
import { MecanicoService } from "@/lib/mecanicos/mecanico-service";
import { AlertasOperacionaisService } from "@/lib/operacoes/alertas-service";
import { CentroOperacoesService } from "@/lib/operacoes/centro-operacoes-service";
import { MecanicosDashboardService } from "@/lib/operacoes/mecanicos-dashboard-service";
import { RecursosOcupacaoService } from "@/lib/operacoes/recursos-service";
import { OsDashboardService } from "@/lib/ordens/os-dashboard-service";
import { OrdemServicoService } from "@/lib/ordens/ordem-servico-service";
import { VeiculoService } from "@/lib/ordens/veiculo-service";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { isOpsActionRelevant } from "@/lib/segments/mobile-tabs.ts";
import { getSegmentUiCopy } from "@/lib/segments/copy.ts";
import type { ResolveSegmentInput } from "@/lib/segments/resolve.ts";

export function resolveOpsDataClient(
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

export function hasPerm(permissions: readonly string[], key: string): boolean {
  return permissions.includes("*") || permissions.includes(key);
}

export function canViewOps(permissions: readonly string[]): boolean {
  return (
    hasPerm(permissions, "os.visualizar") ||
    hasPerm(permissions, "centro_operacoes.visualizar") ||
    hasPerm(permissions, "dashboard.operacional") ||
    hasPerm(permissions, "agenda.visualizar") ||
    hasPerm(permissions, "mecanicos.visualizar") ||
    hasPerm(permissions, "clientes.visualizar")
  );
}

function assertOpsView(permissions: readonly string[]) {
  if (!canViewOps(permissions)) throw new Error("FORBIDDEN_OPS");
}

function money(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return formatCurrencyCompact(n);
}

function cardCount(
  cards: Array<{ key: string; count: number }> | undefined,
  key: string,
): number | null {
  const c = cards?.find((x) => x.key === key);
  return c ? c.count : null;
}

export type MobileOpsQuickAction = {
  id: string;
  label: string;
  href: string;
  permission: string | null;
  enabled: boolean;
  opensWeb: boolean;
};

export type MobileOpsAlert = {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  href: string | null;
};

export type MobileOpsDashboard = {
  generatedAt: string;
  updatedAtLabel: string;
  kpis: {
    aguardando: number | null;
    emExecucao: number | null;
    prontos: number | null;
    entreguesHoje: number | null;
    faturamento: string | null;
    ticketMedio: string | null;
    ocupacaoRecursos: string | null;
    produtividadeMecanicos: string | null;
  };
  recentOrders: Array<{
    id: string;
    numero: string;
    status: string;
    cliente: string | null;
    veiculo: string | null;
  }>;
  alerts: MobileOpsAlert[];
  quickActions: MobileOpsQuickAction[];
  unavailable: string[];
};

export type MobileOpsWorkOrderList = {
  items: Array<{
    id: string;
    numero: string;
    status: string;
    cliente: string | null;
    veiculo: string | null;
    valor: string | null;
    abertura: string;
    previsao: string | null;
    prioridade: string;
  }>;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type MobileOpsWorkOrderDetail = {
  id: string;
  numero: string;
  status: string;
  cliente: string | null;
  veiculo: string | null;
  placa: string | null;
  mecanico: string | null;
  previsao: string | null;
  prioridade: string;
  heading?: string;
  assigneeLabel?: string;
  fields: Array<{ label: string; value: string }>;
  services: Array<{ id: string; label: string; qty: string; valor: string | null }>;
  parts: Array<{ id: string; label: string; qty: string; valor: string | null }>;
  timeline: Array<{
    id: string;
    at: string;
    titulo: string;
    detalhe: string | null;
    kind: string;
  }>;
  photos: Array<{
    id: string;
    label: string;
    createdAt: string;
    etapa: string;
    tipo: string;
    group: string;
    mimeType: string | null;
    thumbUrl: string | null;
  }>;
  attachments: Array<{
    id: string;
    label: string;
    createdAt: string;
    etapa: string;
    tipo: string;
    group: string;
    mimeType: string | null;
    isPdf: boolean;
    isImage: boolean;
  }>;
  checklist: Array<{
    id: string;
    codigo: string;
    label: string;
    status: string;
    classificacao: string;
    observacao: string | null;
    registradoEm: string | null;
    responsavelId: string | null;
    done: boolean;
  }>;
  checklistSummary: { done: number; pending: number; total: number };
  signatures: Array<{
    id: string;
    label: string;
    createdAt: string;
    thumbUrl: string | null;
  }>;
  observations: string | null;
  canEdit: boolean;
  aceiteEntregaEm: string | null;
  webHref: string;
};

function buildQuickActions(
  slug: string,
  permissions: readonly string[],
  segment?: ResolveSegmentInput,
): MobileOpsQuickAction[] {
  const ui = segment
    ? getSegmentUiCopy(segment)
    : null;
  const all = [
    {
      id: "ordens",
      label: ui?.workOrders ?? "Ordens",
      href: "/operacao/ordens",
      permission: "os.visualizar",
      enabled: hasPerm(permissions, "os.visualizar"),
      opensWeb: false,
    },
    {
      id: "agenda",
      label: "Agenda",
      href: "/operacao/agenda",
      permission: "agenda.visualizar",
      enabled: hasPerm(permissions, "agenda.visualizar"),
      opensWeb: false,
    },
    {
      id: "equipe",
      label: ui?.professionals ?? "Equipe",
      href: "/operacao/equipe",
      permission: "mecanicos.visualizar",
      enabled: hasPerm(permissions, "mecanicos.visualizar"),
      opensWeb: false,
    },
    {
      id: "veiculos",
      label: "Veículos",
      href: "/operacao/veiculos",
      permission: "os.visualizar",
      enabled: hasPerm(permissions, "os.visualizar"),
      opensWeb: false,
    },
    {
      id: "clientes",
      label: "Clientes",
      href: "/operacao/clientes",
      permission: "clientes.visualizar",
      enabled: hasPerm(permissions, "clientes.visualizar"),
      opensWeb: false,
    },
    {
      id: "notif",
      label: "Alertas",
      href: "/operacao/notificacoes",
      permission: "centro_operacoes.ver_alertas",
      enabled:
        hasPerm(permissions, "centro_operacoes.ver_alertas") ||
        hasPerm(permissions, "centro_operacoes.visualizar"),
      opensWeb: false,
    },
    {
      id: "retornos",
      label: "Retornos",
      href: "/crm/retornos",
      permission: "crm.retornos.visualizar",
      enabled:
        hasPerm(permissions, "crm.retornos.visualizar") ||
        hasPerm(permissions, "crm.visualizar") ||
        hasPerm(permissions, "agenda.visualizar"),
      opensWeb: true,
    },
    {
      id: "web",
      label: "Continuar no portal",
      href: `/${slug}/centro-operacoes`,
      permission: "centro_operacoes.visualizar",
      enabled: hasPerm(permissions, "centro_operacoes.visualizar"),
      opensWeb: true,
    },
  ];
  if (!segment) return all;
  return all.filter((action) => isOpsActionRelevant(action.id, segment));
}

export async function composeOpsDashboard(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  permissions: readonly string[];
  segment?: string | null;
  segmentVersion?: number | null;
  segmentConfig?: unknown;
}): Promise<MobileOpsDashboard> {
  assertOpsView(input.permissions);
  const client = resolveOpsDataClient(input.client);

  const centro = new CentroOperacoesService(client, input.tenantId);
  const osDash = new OsDashboardService(client, input.tenantId);
  const recursos = new RecursosOcupacaoService(client, input.tenantId);
  const mecDash = new MecanicosDashboardService(client, input.tenantId);
  const osSvc = new OrdemServicoService(client, input.tenantId);
  const alertas = new AlertasOperacionaisService(
    client,
    input.tenantId,
    input.tenantSlug,
  );

  const [centroData, dash, ocup, mecs, recent, alerts] = await Promise.all([
    soft(() => centro.getData(input.tenantSlug)),
    soft(() => osDash.getData()),
    soft(() => recursos.getData()),
    soft(() => mecDash.getData()),
    soft(() => osSvc.list({ page: 1, perPage: 8, sort: "updated_at" })),
    soft(() => alertas.listPersisted(false)),
  ]);

  const unavailable: string[] = [];
  if (!centroData) unavailable.push("centro_operacoes");
  if (!dash) unavailable.push("os_dashboard");
  if (!ocup) unavailable.push("ocupacao_recursos");
  if (!mecs) unavailable.push("produtividade_mecanicos");

  const cards = centroData?.cards;
  const aguardando =
    (cardCount(cards, "aprovacao") ?? 0) +
    (cardCount(cards, "pecas") ?? 0) +
    (cardCount(cards, "diagnostico") ?? 0) +
    (cardCount(cards, "orcamento") ?? 0);
  const hasAguardando = cards != null;

  const prodValues = (mecs?.mecanicos ?? [])
    .map((m) => m.produtividade)
    .filter((p): p is number => p != null && Number.isFinite(p));
  const produtividadeMecanicos =
    prodValues.length > 0
      ? `${(prodValues.reduce((a, b) => a + b, 0) / prodValues.length).toFixed(0)}%`
      : null;

  return {
    generatedAt: new Date().toISOString(),
    updatedAtLabel: new Date().toLocaleString("pt-BR"),
    kpis: {
      aguardando: hasAguardando ? aguardando : null,
      emExecucao: cardCount(cards, "execucao"),
      prontos: cardCount(cards, "pronto"),
      entreguesHoje: cardCount(cards, "finalizadas_hoje"),
      faturamento: money(dash?.kpis.faturamento),
      ticketMedio: money(dash?.kpis.ticketMedio),
      ocupacaoRecursos:
        ocup?.kpis.taxaOcupacao != null
          ? `${ocup.kpis.taxaOcupacao}%`
          : null,
      produtividadeMecanicos,
    },
    recentOrders: (recent?.items ?? []).map((o) => ({
      id: o.id,
      numero: String(o.numero),
      status: o.status,
      cliente: o.cliente_nome,
      veiculo: [o.placa, o.modelo].filter(Boolean).join(" ") || null,
    })),
    alerts: (alerts ?? []).slice(0, 15).map((a) => ({
      id: a.id,
      title: a.titulo,
      description: a.descricao ?? a.tipo,
      priority: a.severidade,
      category: a.tipo,
      href: a.href,
    })),
    quickActions: buildQuickActions(input.tenantSlug, input.permissions, {
      segment: input.segment,
      segmentVersion: input.segmentVersion,
      segmentConfig: input.segmentConfig,
    }),
    unavailable,
  };
}

export async function composeOpsWorkOrders(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  q?: string;
  status?: string;
  page?: number;
}): Promise<MobileOpsWorkOrderList> {
  assertOpsView(input.permissions);
  if (!hasPerm(input.permissions, "os.visualizar") && !hasPerm(input.permissions, "*")) {
    throw new Error("FORBIDDEN_OPS");
  }
  const client = resolveOpsDataClient(input.client);
  const svc = new OrdemServicoService(client, input.tenantId);
  const result = await svc.list({
    q: input.q,
    status: input.status,
    page: input.page ?? 1,
    perPage: 25,
  });
  return {
    items: result.items.map((o) => ({
      id: o.id,
      numero: String(o.numero),
      status: o.status,
      cliente: o.cliente_nome,
      veiculo: [o.placa, o.modelo].filter(Boolean).join(" ") || null,
      valor: money(o.valor_total),
      abertura: o.data_abertura,
      previsao: o.previsao_entrega,
      prioridade: o.prioridade,
    })),
    total: result.total,
    page: result.page,
    perPage: result.perPage,
    totalPages: result.totalPages,
  };
}

export async function composeOpsWorkOrderDetail(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  permissions: readonly string[];
  id: string;
  segment?: string | null;
  segmentVersion?: number | null;
  segmentConfig?: unknown;
}): Promise<MobileOpsWorkOrderDetail> {
  assertOpsView(input.permissions);
  const client = resolveOpsDataClient(input.client);
  const svc = new OrdemServicoService(client, input.tenantId);
  const detail = await svc.getById(input.id);
  if (!detail) throw new Error("NOT_FOUND");

  const { listFieldAnexos, listFieldChecklist } = await import(
    "@/lib/mobile/field-compose"
  );

  const [anexos, checklist] = await Promise.all([
    soft(() =>
      listFieldAnexos({
        client,
        tenantId: input.tenantId,
        permissions: input.permissions,
        osId: input.id,
        includeSignedUrls: true,
        limit: 40,
      }),
    ),
    soft(() =>
      listFieldChecklist({
        client,
        tenantId: input.tenantId,
        permissions: input.permissions,
        osId: input.id,
      }),
    ),
  ]);

  let mecanicoNome: string | null = null;
  if (detail.mecanico_id) {
    const mec = await soft(async () => {
      const { data } = await client
        .from("profiles")
        .select("full_name")
        .eq("id", detail.mecanico_id as string)
        .maybeSingle();
      return data?.full_name ?? null;
    });
    mecanicoNome = mec;
    if (!mecanicoNome) {
      const mecRow = await soft(async () => {
        const { data } = await client
          .from("mecanicos" as never)
          .select("nome_completo")
          .eq("id", detail.mecanico_id as string)
          .eq("tenant_id", input.tenantId)
          .maybeSingle();
        return (data as { nome_completo?: string } | null)?.nome_completo ?? null;
      });
      mecanicoNome = mecRow;
    }
  }

  const itens = detail.itens ?? [];
  const services = itens
    .filter((i) => String(i.tipo_item).toLowerCase().includes("serv"))
    .map((i) => ({
      id: i.id,
      label: i.descricao,
      qty: String(i.quantidade ?? 1),
      valor: money(Number(i.valor_total ?? i.valor_unitario)),
    }));
  const parts = itens
    .filter((i) => !String(i.tipo_item).toLowerCase().includes("serv"))
    .map((i) => ({
      id: i.id,
      label: i.descricao,
      qty: String(i.quantidade ?? 1),
      valor: money(Number(i.valor_total ?? i.valor_unitario)),
    }));

  const timeline = (detail.eventos ?? []).slice(0, 60).map((e) => {
    const row = e as {
      id: string;
      created_at?: string;
      tipo?: string;
      descricao?: string | null;
      estado_anterior?: string | null;
      estado_posterior?: string | null;
      motivo?: string | null;
    };
    const statusLine = [row.estado_anterior, row.estado_posterior]
      .filter(Boolean)
      .join(" → ");
    return {
      id: row.id,
      at: row.created_at ?? "",
      titulo: row.tipo ?? "evento",
      detalhe: row.descricao ?? (statusLine || row.motivo || null),
      kind: String(row.tipo ?? "evento").toLowerCase(),
    };
  });

  const allAnexos = anexos ?? [];
  const photos = allAnexos
    .filter((a) => a.isImage && a.group !== "assinatura")
    .map((a) => ({
      id: a.id,
      label: a.label,
      createdAt: a.createdAt,
      etapa: a.etapa,
      tipo: a.tipo,
      group: a.group,
      mimeType: a.mimeType,
      thumbUrl: a.thumbUrl,
    }));
  const attachments = allAnexos.map((a) => ({
    id: a.id,
    label: a.label,
    createdAt: a.createdAt,
    etapa: a.etapa,
    tipo: a.tipo,
    group: a.group,
    mimeType: a.mimeType,
    isPdf: a.isPdf,
    isImage: a.isImage,
  }));
  const signatures = allAnexos
    .filter((a) => a.group === "assinatura")
    .map((a) => ({
      id: a.id,
      label: a.label,
      createdAt: a.createdAt,
      thumbUrl: a.thumbUrl,
    }));

  const checklistItems = checklist ?? [];
  const done = checklistItems.filter((c) => c.done).length;

  const canEdit =
    hasPerm(input.permissions, "os.editar") || hasPerm(input.permissions, "*");

  const ui = getSegmentUiCopy({
    segment: input.segment,
    segmentVersion: input.segmentVersion,
    segmentConfig: input.segmentConfig,
  });

  return {
    id: detail.id,
    numero: String(detail.numero),
    status: detail.status,
    cliente: detail.cliente_nome,
    veiculo: [detail.placa, detail.modelo].filter(Boolean).join(" ") || null,
    placa: detail.placa,
    mecanico: mecanicoNome,
    previsao: detail.previsao_entrega,
    prioridade: detail.prioridade || "normal",
    heading: ui.workOrderDetailTitle(detail.numero),
    assigneeLabel: ui.assigneeLabel,
    fields: [
      { label: ui.customer, value: detail.cliente_nome ?? "—" },
      {
        label: "Veículo",
        value: [detail.placa, detail.modelo].filter(Boolean).join(" ") || "—",
      },
      { label: "Placa", value: detail.placa ?? "—" },
      { label: "Status", value: detail.status || "—" },
      { label: ui.assigneeLabel, value: mecanicoNome ?? "—" },
      { label: "Abertura", value: detail.data_abertura || "—" },
      { label: "Previsão", value: detail.previsao_entrega ?? "—" },
      { label: "Valor", value: money(detail.valor_total) ?? "—" },
      { label: "Prioridade", value: detail.prioridade || "—" },
    ],
    services,
    parts,
    timeline,
    photos,
    attachments,
    checklist: checklistItems,
    checklistSummary: {
      done,
      pending: checklistItems.length - done,
      total: checklistItems.length,
    },
    signatures,
    observations: detail.observacoes ?? null,
    canEdit,
    aceiteEntregaEm: detail.aceite_entrega_em ?? null,
    webHref: `/${input.tenantSlug}/ordens/${detail.id}`,
  };
}

export async function composeOpsSchedule(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  range?: "hoje" | "semana";
}): Promise<{
  items: Array<{
    id: string;
    titulo: string;
    status: string;
    inicio: string;
    fim: string;
    clienteId: string | null;
    osId: string | null;
    responsavelId: string | null;
  }>;
  conflicts: Array<{ a: string; b: string; reason: string }>;
  unavailable: boolean;
}> {
  assertOpsView(input.permissions);
  if (
    !hasPerm(input.permissions, "agenda.visualizar") &&
    !hasPerm(input.permissions, "*")
  ) {
    throw new Error("FORBIDDEN_OPS");
  }

  const client = resolveOpsDataClient(input.client);
  const svc = new AgendaEventService(client, input.tenantId);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (input.range === "semana") end.setDate(end.getDate() + 7);
  else end.setDate(end.getDate() + 1);

  const events = await soft(() =>
    svc.listRange(start.toISOString(), end.toISOString()),
  );
  if (!events) {
    return { items: [], conflicts: [], unavailable: true };
  }

  const intervals = events.map((e) => ({
    id: e.id,
    inicio: e.inicio,
    fim: e.fim,
    responsavelId: e.responsavel_id,
    recursoId: e.recurso_id,
  }));

  const conflictPairs: Array<{ a: string; b: string; reason: string }> = [];
  for (let i = 0; i < intervals.length; i += 1) {
    const candidate = intervals[i];
    const found = detectAgendaConflicts(
      candidate,
      intervals.filter((_, j) => j !== i),
    );
    for (const c of found) {
      if ("withId" in c && c.withId) {
        conflictPairs.push({
          a: candidate.id ?? "",
          b: c.withId,
          reason: c.type,
        });
      }
    }
  }

  const seen = new Set<string>();
  const conflicts = conflictPairs.filter((c) => {
    const key = [c.a, c.b].sort().join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(c.a && c.b);
  });

  return {
    unavailable: false,
    items: events.slice(0, 80).map((e) => ({
      id: e.id,
      titulo: e.titulo,
      status: e.status,
      inicio: e.inicio,
      fim: e.fim,
      clienteId: e.cliente_id,
      osId: e.ordem_servico_id,
      responsavelId: e.responsavel_id,
    })),
    conflicts: conflicts.slice(0, 20),
  };
}

export async function composeOpsTeam(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
}): Promise<{
  items: Array<{
    id: string;
    nome: string;
    status: string;
    especialidade: string | null;
    produtividade: string | null;
    emExecucao: number | null;
    ocupacao: string | null;
  }>;
}> {
  assertOpsView(input.permissions);
  if (
    !hasPerm(input.permissions, "mecanicos.visualizar") &&
    !hasPerm(input.permissions, "*")
  ) {
    throw new Error("FORBIDDEN_OPS");
  }

  const client = resolveOpsDataClient(input.client);
  const [list, dash] = await Promise.all([
    soft(() => new MecanicoService(client, input.tenantId).list()),
    soft(() => new MecanicosDashboardService(client, input.tenantId).getData()),
  ]);

  const kpiById = new Map((dash?.mecanicos ?? []).map((m) => [m.id, m]));

  return {
    items: (list ?? []).slice(0, 60).map((m) => {
      const kpi = kpiById.get(m.id);
      return {
        id: m.id,
        nome: m.nome_completo,
        status: m.status,
        especialidade: m.especialidade,
        produtividade:
          kpi?.produtividade != null ? `${kpi.produtividade}%` : null,
        emExecucao: kpi?.emExecucao ?? null,
        ocupacao:
          kpi?.taxaOcupacao != null ? `${kpi.taxaOcupacao}%` : null,
      };
    }),
  };
}

export async function composeOpsVehicles(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  q?: string;
  page?: number;
}): Promise<{
  items: Array<{
    id: string;
    placa: string | null;
    modelo: string | null;
    clienteId: string;
    clienteNome: string | null;
    km: number | null;
  }>;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}> {
  assertOpsView(input.permissions);
  const client = resolveOpsDataClient(input.client);
  const page = Math.max(1, input.page ?? 1);
  const perPage = 40;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = client
    .from("veiculos")
    .select(
      "id, placa, marca, modelo, cliente_id, quilometragem, cliente:clientes(nome)",
      { count: "exact" },
    )
    .eq("tenant_id", input.tenantId)
    .eq("ativo", true)
    .is("deleted_at", null)
    .order("placa")
    .range(from, to);

  if (input.q?.trim()) {
    const s = input.q.trim();
    query = query.or(`placa.ilike.%${s}%,modelo.ilike.%${s}%,marca.ilike.%${s}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const total = count ?? 0;

  return {
    items: (data ?? []).map((v) => {
      const row = v as {
        id: string;
        placa: string | null;
        marca: string | null;
        modelo: string | null;
        cliente_id: string;
        quilometragem: number | null;
        cliente?: { nome?: string } | null;
      };
      return {
        id: row.id,
        placa: row.placa,
        modelo: [row.marca, row.modelo].filter(Boolean).join(" ") || null,
        clienteId: row.cliente_id,
        clienteNome: row.cliente?.nome ?? null,
        km: row.quilometragem,
      };
    }),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function composeOpsVehicleDetail(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  id: string;
}): Promise<{
  id: string;
  fields: Array<{ label: string; value: string }>;
  recentOrders: Array<{ id: string; numero: string; status: string; abertura: string }>;
}> {
  assertOpsView(input.permissions);
  const client = resolveOpsDataClient(input.client);
  const veiculo = await new VeiculoService(client, input.tenantId).getById(
    input.id,
  );
  if (!veiculo) throw new Error("NOT_FOUND");

  const orders = await soft(() =>
    new OrdemServicoService(client, input.tenantId).list({
      veiculo_id: input.id,
      page: 1,
      perPage: 15,
    }),
  );

  return {
    id: veiculo.id,
    fields: [
      { label: "Placa", value: veiculo.placa ?? "—" },
      {
        label: "Modelo",
        value: [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ") || "—",
      },
      {
        label: "KM",
        value:
          veiculo.quilometragem != null ? String(veiculo.quilometragem) : "—",
      },
      { label: "Ano", value: veiculo.ano != null ? String(veiculo.ano) : "—" },
      { label: "Cor", value: veiculo.cor ?? "—" },
    ],
    recentOrders: (orders?.items ?? []).map((o) => ({
      id: o.id,
      numero: String(o.numero),
      status: o.status,
      abertura: o.data_abertura,
    })),
  };
}

export async function composeOpsCustomers(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  q?: string;
  page?: number;
}): Promise<{
  items: Array<{
    id: string;
    nome: string;
    telefone: string | null;
    email: string | null;
    cidade: string | null;
  }>;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}> {
  assertOpsView(input.permissions);
  if (
    !hasPerm(input.permissions, "clientes.visualizar") &&
    !hasPerm(input.permissions, "*")
  ) {
    throw new Error("FORBIDDEN_OPS");
  }
  const client = resolveOpsDataClient(input.client);
  const result = await new ClienteService(client, input.tenantId).list({
    page: input.page ?? 1,
    perPage: 40,
    search: input.q,
  });
  return {
    items: result.data.map((c) => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      email: c.email,
      cidade: c.cidade,
    })),
    total: result.total,
    page: result.page,
    perPage: result.perPage,
    totalPages: result.totalPages,
  };
}

export async function composeOpsCustomerDetail(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  permissions: readonly string[];
  id: string;
}): Promise<{
  id: string;
  nome: string;
  fields: Array<{ label: string; value: string }>;
  vehicles: Array<{ id: string; label: string }>;
  recentOrders: Array<{ id: string; numero: string; status: string }>;
}> {
  assertOpsView(input.permissions);
  if (
    !hasPerm(input.permissions, "clientes.visualizar") &&
    !hasPerm(input.permissions, "*")
  ) {
    throw new Error("FORBIDDEN_OPS");
  }
  const client = resolveOpsDataClient(input.client);
  const cliente = await new ClienteService(client, input.tenantId).getById(
    input.id,
  );
  if (!cliente) throw new Error("NOT_FOUND");

  const [veiculos, orders] = await Promise.all([
    soft(() =>
      new VeiculoService(client, input.tenantId).listByCliente(input.id),
    ),
    soft(() =>
      new OrdemServicoService(client, input.tenantId).list({
        cliente_id: input.id,
        page: 1,
        perPage: 15,
      }),
    ),
  ]);

  return {
    id: cliente.id,
    nome: cliente.nome,
    fields: [
      { label: "Telefone", value: cliente.telefone ?? "—" },
      { label: "E-mail", value: cliente.email ?? "—" },
      { label: "Cidade", value: cliente.cidade ?? "—" },
      { label: "Documento", value: cliente.documento ?? "—" },
    ],
    vehicles: (veiculos ?? []).map((v) => ({
      id: v.id,
      label: [v.placa, v.modelo].filter(Boolean).join(" · ") || v.id.slice(0, 8),
    })),
    recentOrders: (orders?.items ?? []).map((o) => ({
      id: o.id,
      numero: String(o.numero),
      status: o.status,
    })),
  };
}

export async function composeOpsNotifications(input: {
  client: SupabaseClient<Database>;
  tenantId: string;
  tenantSlug: string;
  permissions: readonly string[];
}): Promise<{ alerts: MobileOpsAlert[] }> {
  assertOpsView(input.permissions);
  const client = resolveOpsDataClient(input.client);
  const svc = new AlertasOperacionaisService(
    client,
    input.tenantId,
    input.tenantSlug,
  );
  const alerts = await soft(() => svc.listPersisted(false));
  return {
    alerts: (alerts ?? []).slice(0, 50).map((a) => ({
      id: a.id,
      title: a.titulo,
      description: a.descricao ?? a.tipo,
      priority: a.severidade,
      category: a.tipo,
      href: a.href,
    })),
  };
}
