import type { SupabaseClient } from "@supabase/supabase-js";

import { calcVariation, resolvePreviousPeriod } from "@/lib/dashboard/period";
import { createClient } from "@/lib/supabase/server";
import type { DashboardFilters } from "@/types/dashboard-executive";
import type { Database } from "@/types/database";
import type {
  QualidadeOperacionalData,
  QualidadeOperacionalEvolucaoPoint,
  QualidadeOperacionalRankingItem,
  RetornoDrillDownItem,
  RetornoFinanceiroResumo,
  RetornoServicosKpi,
  RetornoStatusCor,
} from "@/types/qualidade-operacional";
import { RETORNO_SERVICOS_META_PCT } from "@/types/qualidade-operacional";

const RETORNO_SELECT = `
  id,
  data_retorno,
  data_servico_original,
  motivo,
  valor_retorno,
  valor_pecas_garantia,
  horas_mao_obra,
  valor_mao_obra,
  tipo_cobertura,
  ordem_servico_id,
  mecanico_id,
  servico_produto_id,
  cliente:clientes(nome),
  veiculo:veiculos(placa, marca, modelo),
  mecanico:profiles(full_name),
  ordem:ordens_servico(numero),
  servico_produto:produtos!servico_produto_id(nome)
`;

/** Colunas mínimas para evolução mensal (sem embeds de drill-down). */
const RETORNO_EVOLUCAO_SELECT = `
  data_retorno,
  tipo_cobertura,
  valor_retorno
`;

type RetornoRow = {
  id: string;
  data_retorno: string;
  data_servico_original: string;
  motivo: string;
  valor_retorno: number;
  valor_pecas_garantia: number;
  horas_mao_obra: number;
  valor_mao_obra: number;
  tipo_cobertura: "garantia" | "pago";
  ordem_servico_id: string;
  mecanico_id: string | null;
  servico_produto_id: string | null;
  categoria_id: string | null;
  cliente: { nome: string } | null;
  veiculo: {
    placa: string;
    marca: string | null;
    modelo: string | null;
  } | null;
  mecanico: { full_name: string | null } | null;
  ordem: { numero: number } | null;
  servico_produto: { nome: string } | null;
};

function resolveStatusCor(taxaPct: number): RetornoStatusCor {
  if (taxaPct <= RETORNO_SERVICOS_META_PCT) return "verde";
  if (taxaPct <= 5) return "amarelo";
  return "vermelho";
}

function formatVeiculo(
  veiculo: RetornoRow["veiculo"],
): string {
  if (!veiculo) return "—";
  const parts = [veiculo.placa];
  if (veiculo.marca) parts.push(veiculo.marca);
  if (veiculo.modelo) parts.push(veiculo.modelo);
  return parts.join(" · ");
}

function diffDays(from: string, to: string): number {
  const start = new Date(`${from.slice(0, 10)}T12:00:00`);
  const end = new Date(`${to.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function topRanking(
  map: Map<string, { label: string; quantidade: number; totalServicos?: number }>,
  limit = 5,
  asRate = false,
): QualidadeOperacionalRankingItem[] {
  return Array.from(map.entries())
    .map(([id, entry]) => ({
      id,
      label: entry.label,
      quantidade: entry.quantidade,
      value: asRate && entry.totalServicos
        ? (entry.quantidade / entry.totalServicos) * 100
        : entry.quantidade,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

export class QualidadeOperacionalService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async getQualidadeOperacional(
    filters: DashboardFilters,
  ): Promise<QualidadeOperacionalData> {
    const previousFilters = resolvePreviousPeriod(filters);

    const [
      retornosAtual,
      retornosAnterior,
      servicosConcluidosAtual,
      servicosConcluidosAnterior,
      evolucaoMensal,
    ] = await Promise.all([
      this.fetchRetornosPeriodo(filters),
      this.fetchRetornosPeriodo(previousFilters),
      this.countServicosConcluidos(filters),
      this.countServicosConcluidos(previousFilters),
      this.buildEvolucaoMensal(filters),
    ]);

    const kpi = this.buildKpi(
      retornosAtual.length,
      servicosConcluidosAtual,
      retornosAnterior.length,
      servicosConcluidosAnterior,
    );

    const financeiro = this.buildFinanceiroResumo(retornosAtual);
    const rankings = this.buildRankings(retornosAtual, servicosConcluidosAtual);
    const drillDown = retornosAtual.map((row) => this.mapDrillDownItem(row));

    return {
      kpi,
      financeiro,
      rankings,
      evolucaoMensal,
      drillDown,
      hasData: servicosConcluidosAtual > 0 || retornosAtual.length > 0,
    };
  }

  async listRetornosDrillDown(
    filters: DashboardFilters,
  ): Promise<RetornoDrillDownItem[]> {
    const rows = await this.fetchRetornosPeriodo(filters);
    return rows.map((row) => this.mapDrillDownItem(row));
  }

  private buildKpi(
    retornosAtual: number,
    servicosAtual: number,
    retornosAnterior: number,
    servicosAnterior: number,
  ): RetornoServicosKpi {
    const taxaAtual =
      servicosAtual > 0 ? (retornosAtual / servicosAtual) * 100 : 0;
    const taxaAnterior =
      servicosAnterior > 0 ? (retornosAnterior / servicosAnterior) * 100 : 0;
    const { variationPct, trend } = calcVariation(taxaAtual, taxaAnterior);

    return {
      taxaRetornoPct: taxaAtual,
      quantidadeRetornos: retornosAtual,
      totalServicosConcluidos: servicosAtual,
      metaPct: RETORNO_SERVICOS_META_PCT,
      statusCor: resolveStatusCor(taxaAtual),
      comparison: {
        current: taxaAtual,
        previous: taxaAnterior,
        variationPct,
        trend,
      },
    };
  }

  private buildFinanceiroResumo(rows: RetornoRow[]): RetornoFinanceiroResumo {
    let receita_perdida = 0;
    let pecas_garantia = 0;
    let horas_mao_obra = 0;
    let custo_total = 0;

    for (const row of rows) {
      pecas_garantia += Number(row.valor_pecas_garantia);
      horas_mao_obra += Number(row.horas_mao_obra);
      const custo =
        Number(row.valor_retorno) +
        Number(row.valor_pecas_garantia) +
        Number(row.valor_mao_obra);
      custo_total += custo;
      if (row.tipo_cobertura === "garantia") {
        receita_perdida += Number(row.valor_retorno);
      }
    }

    return {
      receita_perdida,
      pecas_garantia,
      horas_mao_obra,
      custo_total,
    };
  }

  private buildRankings(
    rows: RetornoRow[],
    totalServicosConcluidos: number,
  ): QualidadeOperacionalData["rankings"] {
    const mecanicos = new Map<
      string,
      { label: string; quantidade: number; totalServicos?: number }
    >();
    const motivos = new Map<string, { label: string; quantidade: number }>();
    const servicos = new Map<string, { label: string; quantidade: number }>();

    for (const row of rows) {
      const mecanicoId = row.mecanico_id ?? "sem-mecanico";
      const mecanicoLabel = row.mecanico?.full_name ?? "Sem mecânico";
      const mecanicoEntry = mecanicos.get(mecanicoId) ?? {
        label: mecanicoLabel,
        quantidade: 0,
        totalServicos: totalServicosConcluidos,
      };
      mecanicoEntry.quantidade += 1;
      mecanicos.set(mecanicoId, mecanicoEntry);

      const motivoKey = row.motivo.trim().toLowerCase();
      const motivoEntry = motivos.get(motivoKey) ?? {
        label: row.motivo,
        quantidade: 0,
      };
      motivoEntry.quantidade += 1;
      motivos.set(motivoKey, motivoEntry);

      if (row.servico_produto_id && row.servico_produto) {
        const servicoEntry = servicos.get(row.servico_produto_id) ?? {
          label: row.servico_produto.nome,
          quantidade: 0,
        };
        servicoEntry.quantidade += 1;
        servicos.set(row.servico_produto_id, servicoEntry);
      }
    }

    return {
      mecanicos: topRanking(mecanicos, 5, true),
      motivos: topRanking(motivos, 5),
      servicos: topRanking(servicos, 5),
    };
  }

  private async buildEvolucaoMensal(
    filters: DashboardFilters,
  ): Promise<QualidadeOperacionalEvolucaoPoint[]> {
    const start = new Date(`${filters.dataDe.slice(0, 7)}-01T12:00:00`);
    const end = new Date(`${filters.dataAte.slice(0, 10)}T12:00:00`);
    const months: string[] = [];

    const cursor = new Date(start);
    cursor.setDate(1);
    while (cursor <= end) {
      months.push(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      );
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const extendedFilters = {
      dataDe: `${months[0]}-01`,
      dataAte: filters.dataAte,
    };

    const [retornos, servicosPorMes] = await Promise.all([
      this.fetchRetornosEvolucao(extendedFilters),
      this.countServicosConcluidosPorMes(extendedFilters),
    ]);

    const retornosPorMes = new Map<
      string,
      { quantidade: number; valorPerdido: number }
    >();

    for (const row of retornos) {
      const key = monthKey(row.data_retorno);
      const entry = retornosPorMes.get(key) ?? {
        quantidade: 0,
        valorPerdido: 0,
      };
      entry.quantidade += 1;
      if (row.tipo_cobertura === "garantia") {
        entry.valorPerdido += Number(row.valor_retorno);
      }
      retornosPorMes.set(key, entry);
    }

    return months.map((key) => {
      const retorno = retornosPorMes.get(key) ?? {
        quantidade: 0,
        valorPerdido: 0,
      };
      const servicos = servicosPorMes.get(key) ?? 0;
      const taxaPct =
        servicos > 0 ? (retorno.quantidade / servicos) * 100 : 0;

      return {
        label: monthLabel(key),
        data: `${key}-01`,
        taxaPct,
        quantidade: retorno.quantidade,
        valorPerdido: retorno.valorPerdido,
      };
    });
  }

  private mapDrillDownItem(row: RetornoRow): RetornoDrillDownItem {
    return {
      id: row.id,
      cliente: row.cliente?.nome ?? "—",
      veiculo: formatVeiculo(row.veiculo),
      osOriginal: row.ordem ? `OS #${row.ordem.numero}` : "—",
      osOriginalId: row.ordem_servico_id,
      dataRetorno: row.data_retorno,
      diasEntreServicoRetorno: diffDays(
        row.data_servico_original,
        row.data_retorno,
      ),
      motivo: row.motivo,
      mecanico: row.mecanico?.full_name ?? "—",
      valorRetorno: Number(row.valor_retorno),
      tipoCobertura: row.tipo_cobertura,
    };
  }

  private async fetchRetornosPeriodo(
    filters: Pick<DashboardFilters, "dataDe" | "dataAte">,
  ): Promise<RetornoRow[]> {
    const { data, error } = await this.supabase
      .from("retornos_servico")
      .select(RETORNO_SELECT)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("data_retorno", filters.dataDe)
      .lte("data_retorno", filters.dataAte)
      .order("data_retorno", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as RetornoRow[];
  }

  /** Leitura enxuta só para série mensal (sem embeds). */
  private async fetchRetornosEvolucao(
    filters: Pick<DashboardFilters, "dataDe" | "dataAte">,
  ): Promise<
    Array<{
      data_retorno: string;
      tipo_cobertura: "garantia" | "pago";
      valor_retorno: number;
    }>
  > {
    const { data, error } = await this.supabase
      .from("retornos_servico")
      .select(RETORNO_EVOLUCAO_SELECT)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("data_retorno", filters.dataDe)
      .lte("data_retorno", filters.dataAte);

    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      data_retorno: string;
      tipo_cobertura: "garantia" | "pago";
      valor_retorno: number;
    }>;
  }

  private async countServicosConcluidos(
    filters: Pick<DashboardFilters, "dataDe" | "dataAte">,
  ): Promise<number> {
    const { data: ordens, error: ordensError } = await this.supabase
      .from("ordens_servico")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("status", "concluida")
      .gte("data_conclusao", filters.dataDe)
      .lte("data_conclusao", filters.dataAte);

    if (ordensError) throw new Error(ordensError.message);

    const ordemIds = (ordens ?? []).map((row) => row.id);
    if (ordemIds.length === 0) return 0;

    const { count, error } = await this.supabase
      .from("ordem_servico_itens")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("tipo_item", "servico")
      .in("ordem_servico_id", ordemIds);

    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  private async countServicosConcluidosPorMes(
    filters: Pick<DashboardFilters, "dataDe" | "dataAte">,
  ): Promise<Map<string, number>> {
    const { data: ordens, error } = await this.supabase
      .from("ordens_servico")
      .select("id, data_conclusao")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("status", "concluida")
      .gte("data_conclusao", filters.dataDe)
      .lte("data_conclusao", filters.dataAte);

    if (error) throw new Error(error.message);

    const ordemMonth = new Map<string, string>();
    for (const ordem of ordens ?? []) {
      if (!ordem.data_conclusao) continue;
      ordemMonth.set(ordem.id, monthKey(ordem.data_conclusao));
    }

    const ordemIds = Array.from(ordemMonth.keys());
    if (ordemIds.length === 0) return new Map();

    const { data: itens, error: itensError } = await this.supabase
      .from("ordem_servico_itens")
      .select("ordem_servico_id")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("tipo_item", "servico")
      .in("ordem_servico_id", ordemIds);

    if (itensError) throw new Error(itensError.message);

    const result = new Map<string, number>();
    for (const item of itens ?? []) {
      const key = ordemMonth.get(item.ordem_servico_id);
      if (!key) continue;
      result.set(key, (result.get(key) ?? 0) + 1);
    }

    return result;
  }
}

export async function createQualidadeOperacionalService(tenantId: string) {
  const supabase = await createClient();
  return new QualidadeOperacionalService(supabase, tenantId);
}
