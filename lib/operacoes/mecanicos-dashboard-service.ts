import type { SupabaseClient } from "@supabase/supabase-js";

import { OS_STATUS_TERMINAL } from "@/lib/operacoes/metricas";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type MecanicoKpi = {
  id: string;
  nome: string;
  atribuidas: number;
  concluidas: number;
  atrasadas: number;
  horasEstimadas: number;
  horasRealizadas: number;
  produtividade: number | null;
  eficiencia: number | null;
  faturamento: number;
  receitaMaoObra: number;
  custoMaoObra: number;
  margemGerada: number;
  pecasAplicadas: number;
  ticketMedio: number;
  retrabalho: number;
  garantias: number;
  emExecucao: number;
  tempoMedioServicoHoras: number | null;
  taxaOcupacao: number | null;
};

export type MecanicosDashboardData = {
  mecanicos: MecanicoKpi[];
  rankings: {
    faturamento: MecanicoKpi[];
    concluidas: MecanicoKpi[];
    menorRetrabalho: MecanicoKpi[];
    produtividade: MecanicoKpi[];
    margem: MecanicoKpi[];
    eficiencia: MecanicoKpi[];
  };
  resumoCusto: {
    ativosCadastro: number;
    custoCompetencia: number;
    mesAnterior: number;
    variacaoPercentual: number | null;
  };
  formulas: Record<string, string>;
  syncedAt: string;
};

/**
 * Fórmulas:
 * - horas estimadas/realizadas: soma de ordem_servico_itens.horas_* das OS do mecânico
 * - produtividade: concluídas ÷ atribuídas
 * - eficiência: horas realizadas ÷ horas estimadas (quando estimadas > 0)
 * - receita mão de obra: valor_total de itens tipo serviço nas OS faturadas do mecânico
 * - taxa ocupação: horas realizadas ÷ (dias no período × 8h) aproximado no mês corrente
 */
export class MecanicosDashboardService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async getData(): Promise<MecanicosDashboardData> {
    const hoje = new Date().toISOString().slice(0, 10);
    const mesIni = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    )
      .toISOString()
      .slice(0, 10);
    const diasMes = Math.max(
      1,
      Math.ceil(
        (Date.now() - new Date(`${mesIni}T00:00:00`).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    const { data: rows, error } = await this.supabase
      .from("ordens_servico")
      .select(
        "id, status, mecanico_id, valor_total, previsao_entrega, data_abertura",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .not("mecanico_id", "is", null)
      .limit(1000);

    if (error) throw new Error(error.message);

    type Acc = {
      atribuidas: number;
      concluidas: number;
      atrasadas: number;
      faturamento: number;
      fatCount: number;
      retrabalho: number;
      garantias: number;
      emExecucao: number;
      osIds: string[];
    };

    const byMec = new Map<string, Acc>();

    for (const r of rows ?? []) {
      const id = r.mecanico_id as string;
      const cur = byMec.get(id) ?? {
        atribuidas: 0,
        concluidas: 0,
        atrasadas: 0,
        faturamento: 0,
        fatCount: 0,
        retrabalho: 0,
        garantias: 0,
        emExecucao: 0,
        osIds: [],
      };
      cur.atribuidas += 1;
      cur.osIds.push(r.id);
      if (["entregue", "faturado"].includes(r.status)) cur.concluidas += 1;
      if (r.status === "faturado") {
        cur.faturamento += Number(r.valor_total);
        cur.fatCount += 1;
      }
      if (r.status === "retorno") cur.retrabalho += 1;
      if (r.status === "garantia") cur.garantias += 1;
      if (
        ["em_execucao", "aprovado", "parcialmente_aprovado"].includes(r.status)
      ) {
        cur.emExecucao += 1;
      }
      if (
        r.previsao_entrega &&
        r.previsao_entrega.slice(0, 10) < hoje &&
        !OS_STATUS_TERMINAL.has(r.status)
      ) {
        cur.atrasadas += 1;
      }
      byMec.set(id, cur);
    }

    const allOsIds = [...byMec.values()].flatMap((v) => v.osIds).slice(0, 800);
    const horasByOs = new Map<
      string,
      { prev: number; real: number; servico: number; pecas: number }
    >();

    if (allOsIds.length) {
      const { data: itens } = await this.supabase
        .from("ordem_servico_itens")
        .select(
          "ordem_servico_id, tipo_item, horas_previstas, horas_realizadas, valor_total, quantidade",
        )
        .eq("tenant_id", this.tenantId)
        .in("ordem_servico_id", allOsIds)
        .is("deleted_at", null);

      for (const it of itens ?? []) {
        const osId = it.ordem_servico_id;
        const cur = horasByOs.get(osId) ?? {
          prev: 0,
          real: 0,
          servico: 0,
          pecas: 0,
        };
        cur.prev += Number(it.horas_previstas ?? 0);
        cur.real += Number(it.horas_realizadas ?? 0);
        const tipo = String(it.tipo_item ?? "").toLowerCase();
        if (tipo.includes("servico") || tipo.includes("serviço")) {
          cur.servico += Number(it.valor_total ?? 0);
        } else {
          cur.pecas += Number(it.quantidade ?? 0);
        }
        horasByOs.set(osId, cur);
      }
    }

    const ids = [...byMec.keys()];
    const nameById = new Map<string, string>();
    if (ids.length) {
      const { data: profiles } = await this.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      for (const p of profiles ?? []) {
        nameById.set(p.id, p.full_name || p.id.slice(0, 8));
      }
    }

    const mecanicos: MecanicoKpi[] = ids.map((id) => {
      const c = byMec.get(id)!;
      let horasEstimadas = 0;
      let horasRealizadas = 0;
      let receitaMaoObra = 0;
      let pecasAplicadas = 0;
      for (const osId of c.osIds) {
        const h = horasByOs.get(osId);
        if (!h) continue;
        horasEstimadas += h.prev;
        horasRealizadas += h.real;
        receitaMaoObra += h.servico;
        pecasAplicadas += h.pecas;
      }
      const produtividade =
        c.atribuidas > 0
          ? Number(((c.concluidas / c.atribuidas) * 100).toFixed(1))
          : null;
      const eficiencia =
        horasEstimadas > 0
          ? Number(((horasRealizadas / horasEstimadas) * 100).toFixed(1))
          : null;
      const disponiveis = diasMes * 8;
      const taxaOcupacao =
        disponiveis > 0 && horasRealizadas > 0
          ? Number(((horasRealizadas / disponiveis) * 100).toFixed(1))
          : horasRealizadas === 0
            ? 0
            : null;
      const tempoMedioServicoHoras =
        c.concluidas > 0 && horasRealizadas > 0
          ? Number((horasRealizadas / c.concluidas).toFixed(2))
          : null;

      return {
        id,
        nome: nameById.get(id) ?? id.slice(0, 8),
        atribuidas: c.atribuidas,
        concluidas: c.concluidas,
        atrasadas: c.atrasadas,
        horasEstimadas: Number(horasEstimadas.toFixed(2)),
        horasRealizadas: Number(horasRealizadas.toFixed(2)),
        produtividade,
        eficiencia,
        faturamento: Number(c.faturamento.toFixed(2)),
        receitaMaoObra: Number(receitaMaoObra.toFixed(2)),
        custoMaoObra: 0,
        margemGerada: Number(receitaMaoObra.toFixed(2)),
        pecasAplicadas: Number(pecasAplicadas.toFixed(2)),
        ticketMedio:
          c.fatCount > 0
            ? Number((c.faturamento / c.fatCount).toFixed(2))
            : 0,
        retrabalho: c.retrabalho,
        garantias: c.garantias,
        emExecucao: c.emExecucao,
        tempoMedioServicoHoras,
        taxaOcupacao,
      };
    });

    // Enriquecer com custo real (apontamentos / cadastro) quando migration existir
    const custoByProfile = new Map<string, number>();
    try {
      const { data: apts } = await this.supabase
        .from("mecanico_apontamentos" as never)
        .select("mecanico_id, custo_mao_obra, mecanico:mecanicos(profile_id)")
        .eq("tenant_id", this.tenantId)
        .eq("status", "finalizado")
        .is("deleted_at", null)
        .gte("inicio_em", `${mesIni}T00:00:00`)
        .limit(2000);
      for (const row of (apts ?? []) as Array<{
        custo_mao_obra: number | null;
        mecanico: { profile_id: string | null } | null;
      }>) {
        const pid = row.mecanico?.profile_id;
        if (!pid) continue;
        custoByProfile.set(
          pid,
          (custoByProfile.get(pid) ?? 0) + Number(row.custo_mao_obra ?? 0),
        );
      }
    } catch {
      /* ok */
    }

    for (const m of mecanicos) {
      const custo = custoByProfile.get(m.id) ?? 0;
      m.custoMaoObra = Number(custo.toFixed(2));
      m.margemGerada = Number((m.receitaMaoObra - custo).toFixed(2));
    }

    let ativosCadastro = 0;
    let custoCompetencia = 0;
    let mesAnterior = 0;
    try {
      const { count } = await this.supabase
        .from("mecanicos" as never)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", this.tenantId)
        .eq("status", "ativo")
        .is("deleted_at", null);
      ativosCadastro = count ?? 0;

      const compAtual = `${mesIni.slice(0, 7)}-01`;
      const prev = new Date(`${mesIni}T12:00:00`);
      prev.setMonth(prev.getMonth() - 1);
      const compAnt = `${prev.toISOString().slice(0, 7)}-01`;

      const { data: comps } = await this.supabase
        .from("mecanico_competencias" as never)
        .select("competencia, valor, status")
        .eq("tenant_id", this.tenantId)
        .in("competencia", [compAtual, compAnt])
        .is("deleted_at", null)
        .in("status", ["gerada", "paga"]);
      for (const c of (comps ?? []) as Array<{
        competencia: string;
        valor: number;
      }>) {
        if (c.competencia === compAtual) custoCompetencia += Number(c.valor);
        if (c.competencia === compAnt) mesAnterior += Number(c.valor);
      }
    } catch {
      /* migration pendente */
    }

    const variacaoPercentual =
      mesAnterior > 0
        ? Number(
            (((custoCompetencia - mesAnterior) / mesAnterior) * 100).toFixed(1),
          )
        : null;

    return {
      mecanicos: mecanicos.sort((a, b) => b.faturamento - a.faturamento),
      rankings: {
        faturamento: [...mecanicos]
          .sort((a, b) => b.faturamento - a.faturamento)
          .slice(0, 10),
        concluidas: [...mecanicos]
          .sort((a, b) => b.concluidas - a.concluidas)
          .slice(0, 10),
        menorRetrabalho: [...mecanicos]
          .filter((m) => m.concluidas > 0)
          .sort((a, b) => a.retrabalho - b.retrabalho)
          .slice(0, 10),
        produtividade: [...mecanicos]
          .filter((m) => m.produtividade != null)
          .sort((a, b) => (b.produtividade ?? 0) - (a.produtividade ?? 0))
          .slice(0, 10),
        margem: [...mecanicos]
          .sort((a, b) => b.margemGerada - a.margemGerada)
          .slice(0, 10),
        eficiencia: [...mecanicos]
          .filter((m) => m.eficiencia != null)
          .sort((a, b) => (b.eficiencia ?? 0) - (a.eficiencia ?? 0))
          .slice(0, 10),
      },
      resumoCusto: {
        ativosCadastro,
        custoCompetencia: Number(custoCompetencia.toFixed(2)),
        mesAnterior: Number(mesAnterior.toFixed(2)),
        variacaoPercentual,
      },
      formulas: {
        horas:
          "Soma de horas_previstas / horas_realizadas dos itens das OS do mecânico",
        produtividade: "OS concluídas ÷ OS atribuídas",
        eficiencia: "Horas realizadas ÷ horas estimadas",
        ocupacao: "Horas realizadas ÷ (dias do mês decorridos × 8h)",
        custoMaoObra:
          "Σ (horas apontadas × custo/hora vigente) — via apontamentos",
        dre: "Custo de pessoal entra no DRE só via competência → conta a pagar (sem lançamento direto)",
      },
      syncedAt: new Date().toISOString(),
    };
  }
}

export async function createMecanicosDashboardService(tenantId: string) {
  const supabase = await createClient();
  return new MecanicosDashboardService(supabase, tenantId);
}
