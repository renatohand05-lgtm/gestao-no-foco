/**
 * Compose CRM Premium Dashboard — agrega serviços reais (Promise.all).
 * Sem inventar números; empty honesto quando base vazia.
 */

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createCrmDashboardService } from "@/lib/crm/cliente-360-service";
import { createCrmOportunidadeService } from "@/lib/crm/enterprise/oportunidade-service";
import {
  type FollowUpItem,
} from "@/lib/crm/phase28/follow-up-queue";
import { createClient } from "@/lib/supabase/server";
import type { CrmOportunidadeRow } from "@/types/crm-enterprise";

import { buildClientsAtRisk } from "./clients-at-risk";
import { computeCommercialScore, daysBetween } from "./commercial-score";
import { groupPremiumFollowUps } from "./follow-up-buckets";
import { buildLossReasonAnalysis } from "./loss-reasons";
import { buildOwnerRanking } from "./owner-ranking";
import { buildRevenueForecast } from "./revenue-forecast";
import type { CrmPremiumDashboard, MomDelta } from "./types";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonthKey(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return monthKey(x);
}

function momDelta(current: number, previous: number): MomDelta {
  if (previous === 0) {
    return { current, previous, deltaPct: current === 0 ? 0 : null };
  }
  return {
    current,
    previous,
    deltaPct: Math.round(((current - previous) / previous) * 1000) / 10,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
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

export async function composeCrmPremiumDashboard(args: {
  tenantId: string;
  hojeIso: string;
}): Promise<CrmPremiumDashboard> {
  const supabase = await createClient();
  const oppService = await createCrmOportunidadeService(args.tenantId);
  const dashService = await createCrmDashboardService(args.tenantId);

  const [opps, classicKpis, followUps, clientesRes] = await Promise.all([
    oppService.listAll(500).catch(() => [] as CrmOportunidadeRow[]),
    dashService.getKpis().catch(() => null),
    loadFollowUpItems(supabase, args.tenantId),
    supabase
      .from("clientes" as never)
      .select(
        "id, nome, estagio_funil, updated_at, created_at, consultor_id, score, valor_estimado, valor_potencial, probabilidade, origem, motivo_perda",
      )
      .eq("tenant_id", args.tenantId)
      .is("deleted_at", null)
      .limit(500),
  ]);

  const clienteRows = (clientesRes.data ?? []) as Array<{
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
  }>;

  const ownerIds = [
    ...opps.map((o) => o.responsavel_id).filter(Boolean),
    ...followUps.map((f) => f.responsavelId).filter(Boolean),
    ...clienteRows.map((c) => c.consultor_id).filter(Boolean),
  ] as string[];
  const nameByOwner = await resolveNames(supabase, ownerIds);

  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonth = prevMonthKey(now);

  const forecast = buildRevenueForecast(opps, {
    periodMonth: thisMonth,
    nameByOwner,
  });

  const abertas = opps.filter((o) => o.status === "aberta");
  const ganhas = opps.filter((o) => o.status === "ganha");
  const closed = opps.filter((o) => o.status === "ganha" || o.status === "perdida");

  const valorPipeline = abertas.reduce((a, o) => a + Number(o.valor_estimado ?? 0), 0);
  const receitaFechadaMes = opps
    .filter(
      (o) =>
        o.status === "ganha" &&
        (o.data_fechamento ?? o.updated_at).startsWith(thisMonth),
    )
    .reduce((a, o) => a + Number(o.valor_estimado ?? 0), 0);

  const prevPipeline = opps
    .filter(
      (o) =>
        o.status === "aberta" ||
        ((o.status === "ganha" || o.status === "perdida") &&
          (o.data_fechamento ?? o.updated_at).startsWith(lastMonth)),
    )
    .filter((o) => o.created_at.startsWith(lastMonth) || o.updated_at.startsWith(lastMonth))
    .reduce((a, o) => a + Number(o.valor_estimado ?? 0), 0);

  // MoM mais honesto: oportunidades criadas no mês vs mês anterior; receita fechada mês a mês.
  const oppsThisMonth = opps.filter((o) => o.created_at.startsWith(thisMonth)).length;
  const oppsLastMonth = opps.filter((o) => o.created_at.startsWith(lastMonth)).length;
  const receitaLastMonth = opps
    .filter(
      (o) =>
        o.status === "ganha" &&
        (o.data_fechamento ?? o.updated_at).startsWith(lastMonth),
    )
    .reduce((a, o) => a + Number(o.valor_estimado ?? 0), 0);

  const taxaConversao =
    closed.length > 0
      ? Math.round((ganhas.length / closed.length) * 1000) / 10
      : classicKpis?.taxa_conversao ?? 0;

  let tempoSum = 0;
  let tempoN = 0;
  for (const o of ganhas) {
    const start = Date.parse(o.created_at);
    const end = Date.parse(o.data_fechamento ?? o.updated_at);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      tempoSum += (end - start) / 86_400_000;
      tempoN += 1;
    }
  }

  const ticketMedio =
    ganhas.length > 0
      ? round2(
          ganhas.reduce((a, o) => a + Number(o.valor_estimado ?? 0), 0) /
            ganhas.length,
        )
      : classicKpis?.ticket_medio ?? 0;

  const premiumFu = groupPremiumFollowUps(followUps, args.hojeIso);
  const followUpsPendentes = followUps.filter(
    (f) => f.status !== "concluida" && f.status !== "cancelada",
  ).length;

  const STALE_DAYS = 14;
  const oportunidadesParadas = abertas.filter((o) => {
    const d = daysBetween(o.updated_at, now);
    return d != null && d >= STALE_DAYS;
  }).length;

  // Último contato aproximado: updated_at do cliente (honesto se não houver eventos bulk).
  const clientesSemContato = clienteRows.filter((c) => {
    const d = daysBetween(c.updated_at, now);
    return d == null || d >= 21;
  }).length;

  const overdueClienteIds = new Set(
    premiumFu.atrasados.map((f) => f.clienteId),
  );
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

  const owners = buildOwnerRanking({
    opps,
    followUpsByOwner,
    activitiesByOwner: new Map(),
    nameByOwner,
  });

  const lossReasons = buildLossReasonAnalysis(
    opps,
    classicKpis?.motivos_perda ?? [],
  );

  const empty =
    opps.length === 0 &&
    clienteRows.length === 0 &&
    followUps.length === 0;

  return {
    kpis: {
      totalOportunidades: opps.length,
      valorPipeline: round2(valorPipeline),
      receitaPrevista: forecast.receitaPrevista,
      receitaProvavel: forecast.receitaProvavel,
      receitaFechada: round2(receitaFechadaMes),
      taxaConversao,
      ticketMedio,
      tempoMedioFechamentoDias:
        tempoN > 0
          ? Math.round((tempoSum / tempoN) * 10) / 10
          : classicKpis?.tempo_medio_fechamento_dias ?? null,
      followUpsPendentes,
      oportunidadesParadas,
      clientesSemContato,
      mom: {
        valorPipeline: momDelta(round2(valorPipeline), round2(prevPipeline)),
        receitaFechada: momDelta(round2(receitaFechadaMes), round2(receitaLastMonth)),
        totalOportunidades: momDelta(oppsThisMonth, oppsLastMonth),
      },
    },
    forecast,
    lossReasons,
    atRisk,
    owners,
    empty,
    generatedAt: now.toISOString(),
  };
}

export const getCachedCrmPremiumDashboard = cache(
  async (tenantId: string, hojeIso: string) =>
    composeCrmPremiumDashboard({ tenantId, hojeIso }),
);
