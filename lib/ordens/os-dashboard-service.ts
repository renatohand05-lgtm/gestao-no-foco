import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type OsDashboardFilters = {
  de?: string;
  ate?: string;
  status?: string;
  mecanico_id?: string;
  consultor_id?: string;
  cliente_id?: string;
  veiculo_id?: string;
  centro_custo_id?: string;
  incluir_arquivadas?: boolean;
};

export type OsDashboardKpis = {
  abertas: number;
  emDiagnostico: number;
  aguardandoAprovacao: number;
  aprovadas: number;
  emExecucao: number;
  pendentes: number;
  finalizadas: number;
  canceladas: number;
  vencidas: number;
  faturamento: number;
  ticketMedio: number;
  tempoMedioConclusaoDias: number | null;
  taxaAprovacao: number | null;
  indiceRetrabalho: number | null;
  retornoGarantia: number;
};

export type OsDashboardData = {
  kpis: OsDashboardKpis;
  porStatus: { label: string; valor: number }[];
  abertasPorDia: { label: string; valor: number }[];
  finalizadasPorDia: { label: string; valor: number }[];
  faturamentoPorDia: { label: string; valor: number }[];
  ticketPorDia: { label: string; valor: number }[];
  porMecanico: { label: string; valor: number }[];
  porConsultor: { label: string; valor: number }[];
  porTipoServico: { label: string; valor: number }[];
  produtosMaisUsados: { label: string; valor: number }[];
  tempoMedioPorEtapa: { label: string; valor: number }[];
};

type OsRow = {
  id: string;
  status: string;
  data_abertura: string;
  data_conclusao: string | null;
  faturado_em: string | null;
  previsao_entrega: string | null;
  valor_total: number;
  mecanico_id: string | null;
  consultor_id: string | null;
  arquivado_em: string | null;
};

const TERMINAL = new Set(["entregue", "faturado", "cancelado", "cancelada"]);

function periodBounds(de?: string, ate?: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  const mesIni = new Date();
  mesIni.setDate(1);
  return {
    de: de ?? mesIni.toISOString().slice(0, 10),
    ate: ate ?? hoje,
    hoje,
  };
}

export class OsDashboardService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async getData(filters: OsDashboardFilters = {}): Promise<OsDashboardData> {
    const { de, ate, hoje } = periodBounds(filters.de, filters.ate);

    let query = this.supabase
      .from("ordens_servico")
      .select(
        "id, status, data_abertura, data_conclusao, faturado_em, previsao_entrega, valor_total, mecanico_id, consultor_id, arquivado_em",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("data_abertura", de)
      .lte("data_abertura", ate);

    if (!filters.incluir_arquivadas) {
      query = query.is("arquivado_em", null);
    }
    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters.mecanico_id) query = query.eq("mecanico_id", filters.mecanico_id);
    if (filters.consultor_id) {
      query = query.eq("consultor_id", filters.consultor_id);
    }
    if (filters.cliente_id) query = query.eq("cliente_id", filters.cliente_id);
    if (filters.veiculo_id) query = query.eq("veiculo_id", filters.veiculo_id);
    if (filters.centro_custo_id) {
      query = query.eq("centro_custo_id", filters.centro_custo_id);
    }

    let { data, error } = await query;
    if (error && /arquivado_em/i.test(error.message)) {
      let fallback = this.supabase
        .from("ordens_servico")
        .select(
          "id, status, data_abertura, data_conclusao, faturado_em, previsao_entrega, valor_total, mecanico_id, consultor_id",
        )
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .gte("data_abertura", de)
        .lte("data_abertura", ate);
      if (filters.status && filters.status !== "all") {
        fallback = fallback.eq("status", filters.status);
      }
      const retry = await fallback;
      data = (retry.data ?? []).map((r) => ({ ...r, arquivado_em: null }));
      error = retry.error;
    }
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as OsRow[];

    const countIn = (statuses: string[]) =>
      rows.filter((r) => statuses.includes(r.status)).length;

    const abertas = countIn(["rascunho", "aguardando_diagnostico"]);
    const emDiagnostico = countIn([
      "aguardando_diagnostico",
      "diagnostico_concluido",
    ]);
    const aguardandoAprovacao = countIn(["aguardando_aprovacao"]);
    const aprovadas = countIn(["aprovado", "parcialmente_aprovado"]);
    const emExecucao = countIn([
      "em_execucao",
      "aguardando_peca",
      "aguardando_cliente",
    ]);
    const pendentes = countIn([
      "aguardando_orcamento",
      "aguardando_peca",
      "aguardando_cliente",
    ]);
    const finalizadas = countIn(["entregue", "faturado"]);
    const canceladas = countIn(["cancelado", "cancelada"]);
    const vencidas = rows.filter(
      (r) =>
        r.previsao_entrega &&
        r.previsao_entrega < hoje &&
        !TERMINAL.has(r.status),
    ).length;

    const faturadas = rows.filter((r) => r.status === "faturado");
    const faturamento = faturadas.reduce(
      (s, r) => s + Number(r.valor_total),
      0,
    );
    const ticketMedio =
      faturadas.length > 0 ? faturamento / faturadas.length : 0;

    const aprovadasCount = countIn(["aprovado", "parcialmente_aprovado"]);
    const passaramAprovacao =
      aprovadasCount +
      countIn(["aguardando_aprovacao"]) +
      countIn(["em_execucao", "pronto_para_entrega", "entregue", "faturado"]);
    const taxaAprovacao =
      passaramAprovacao > 0
        ? Number(
            (
              ((aprovadasCount +
                countIn([
                  "em_execucao",
                  "pronto_para_entrega",
                  "entregue",
                  "faturado",
                ])) /
                passaramAprovacao) *
              100
            ).toFixed(1),
          )
        : null;

    const finalizadasCount = finalizadas;
    const retrabalho = countIn(["retorno"]);
    const indiceRetrabalho =
      finalizadasCount > 0
        ? Number(((retrabalho / finalizadasCount) * 100).toFixed(1))
        : null;
    const retornoGarantia = countIn(["retorno", "garantia"]);

    const tempos: number[] = [];
    for (const r of rows) {
      const fim = r.data_conclusao ?? r.faturado_em;
      if (!fim) continue;
      const ms =
        new Date(fim).getTime() - new Date(r.data_abertura).getTime();
      if (ms >= 0) tempos.push(ms / (1000 * 60 * 60 * 24));
    }
    const tempoMedioConclusaoDias =
      tempos.length > 0
        ? Number(
            (tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1),
          )
        : null;

    const statusMap = new Map<string, number>();
    for (const r of rows) {
      statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1);
    }

    const dayKey = (d: string) => d.slice(0, 10);
    const abertasDia = new Map<string, number>();
    const finDia = new Map<string, number>();
    const fatDia = new Map<string, number>();
    const fatCountDia = new Map<string, number>();

    for (const r of rows) {
      const ab = dayKey(r.data_abertura);
      abertasDia.set(ab, (abertasDia.get(ab) ?? 0) + 1);
      const fim = r.data_conclusao ?? r.faturado_em;
      if (fim && ["entregue", "faturado"].includes(r.status)) {
        const f = dayKey(fim);
        finDia.set(f, (finDia.get(f) ?? 0) + 1);
      }
      if (r.status === "faturado") {
        const f = dayKey(r.faturado_em ?? r.data_abertura);
        fatDia.set(f, (fatDia.get(f) ?? 0) + Number(r.valor_total));
        fatCountDia.set(f, (fatCountDia.get(f) ?? 0) + 1);
      }
    }

    const mecMap = new Map<string, number>();
    const consMap = new Map<string, number>();
    for (const r of rows) {
      if (r.mecanico_id) {
        mecMap.set(r.mecanico_id, (mecMap.get(r.mecanico_id) ?? 0) + 1);
      }
      if (r.consultor_id) {
        consMap.set(r.consultor_id, (consMap.get(r.consultor_id) ?? 0) + 1);
      }
    }

    const ids = rows.map((r) => r.id);
    const tipoMap = new Map<string, number>();
    const prodMap = new Map<string, number>();
    if (ids.length) {
      const { data: itens } = await this.supabase
        .from("ordem_servico_itens")
        .select(
          "categoria_item, tipo_item, ordem_servico_id, descricao, quantidade, produto_id",
        )
        .eq("tenant_id", this.tenantId)
        .in("ordem_servico_id", ids.slice(0, 500))
        .is("deleted_at", null);
      for (const it of itens ?? []) {
        const key = String(it.categoria_item || it.tipo_item || "outro");
        tipoMap.set(key, (tipoMap.get(key) ?? 0) + 1);
        const tipo = String(it.tipo_item ?? "").toLowerCase();
        if (tipo.includes("peca") || tipo.includes("produto") || it.produto_id) {
          const label = String(it.descricao || "Produto").slice(0, 48);
          prodMap.set(
            label,
            (prodMap.get(label) ?? 0) + Number(it.quantidade ?? 1),
          );
        }
      }
    }

    // Tempo médio por etapa via eventos (aproximado)
    const etapaMap = new Map<string, number[]>();
    if (ids.length) {
      const { data: evs } = await this.supabase
        .from("ordem_servico_eventos")
        .select("ordem_servico_id, estado_posterior, created_at")
        .eq("tenant_id", this.tenantId)
        .in("ordem_servico_id", ids.slice(0, 200))
        .not("estado_posterior", "is", null)
        .order("created_at", { ascending: true });

      const byOs = new Map<string, Array<{ s: string; t: number }>>();
      for (const e of evs ?? []) {
        const list = byOs.get(e.ordem_servico_id) ?? [];
        list.push({
          s: String(e.estado_posterior),
          t: new Date(e.created_at).getTime(),
        });
        byOs.set(e.ordem_servico_id, list);
      }
      for (const list of byOs.values()) {
        for (let i = 1; i < list.length; i++) {
          const prev = list[i - 1];
          const cur = list[i];
          const days = (cur.t - prev.t) / (1000 * 60 * 60 * 24);
          if (days < 0 || days > 90) continue;
          const arr = etapaMap.get(prev.s) ?? [];
          arr.push(days);
          etapaMap.set(prev.s, arr);
        }
      }
    }

    const toSeries = (m: Map<string, number>) =>
      [...m.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, valor]) => ({ label, valor }));

    const resolveNames = async (idsMap: Map<string, number>) => {
      const idsList = [...idsMap.keys()];
      if (!idsList.length) return [] as { label: string; valor: number }[];
      const { data: profiles } = await this.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", idsList);
      const nameById = new Map(
        (profiles ?? []).map((p) => [
          p.id,
          p.full_name || p.id.slice(0, 8),
        ]),
      );
      return [...idsMap.entries()]
        .map(([id, valor]) => ({
          label: nameById.get(id) ?? id.slice(0, 8),
          valor,
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10);
    };

    return {
      kpis: {
        abertas,
        emDiagnostico,
        aguardandoAprovacao,
        aprovadas,
        emExecucao,
        pendentes,
        finalizadas,
        canceladas,
        vencidas,
        faturamento,
        ticketMedio,
        tempoMedioConclusaoDias,
        taxaAprovacao,
        indiceRetrabalho,
        retornoGarantia,
      },
      porStatus: [...statusMap.entries()]
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => b.valor - a.valor),
      abertasPorDia: toSeries(abertasDia),
      finalizadasPorDia: toSeries(finDia),
      faturamentoPorDia: toSeries(fatDia),
      ticketPorDia: [...fatDia.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, total]) => ({
          label,
          valor: Number(
            (total / Math.max(1, fatCountDia.get(label) ?? 1)).toFixed(2),
          ),
        })),
      porMecanico: await resolveNames(mecMap),
      porConsultor: await resolveNames(consMap),
      porTipoServico: [...tipoMap.entries()]
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 12),
      produtosMaisUsados: [...prodMap.entries()]
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 12),
      tempoMedioPorEtapa: [...etapaMap.entries()]
        .map(([label, vals]) => ({
          label,
          valor: Number(
            (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2),
          ),
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 12),
    };
  }
}

export async function createOsDashboardService(tenantId: string) {
  const supabase = await createClient();
  return new OsDashboardService(supabase, tenantId);
}
