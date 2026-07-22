import type { SupabaseClient } from "@supabase/supabase-js";

import {
  civilDateInTimezone,
  firstDayOfMonthCivil,
  resolveTenantTimezone,
  shiftCivilDate,
} from "@/lib/dashboard/tenant-timezone";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Delta = {
  atual: number;
  anterior: number;
  pct: number | null;
};

function delta(atual: number, anterior: number): Delta {
  const pct =
    anterior === 0
      ? atual === 0
        ? 0
        : null
      : Number((((atual - anterior) / Math.abs(anterior)) * 100).toFixed(1));
  return { atual, anterior, pct };
}

export type OperacionalOverview = {
  vendas: {
    dia: Delta;
    mes: Delta;
    ticketMedio: Delta;
    margemBruta: number;
    descontos: number;
    canceladas: number;
    itensVendidos: number;
    clientesAtendidos: number;
  };
  os: {
    abertas: number;
    pendentes: number;
    aguardandoAprovacao: number;
    emExecucao: number;
    finalizadasHoje: number;
    finalizadasMes: number;
    canceladas: number;
    ticketMedio: number;
    faturamento: number;
    tempoMedioDias: number | null;
  };
  estoque: {
    baixo: number;
    zerados: number;
    valorTotal: number;
    semGiro: number;
    saidasDia: number;
  };
  financeiro: {
    receberAberto: number;
    receberVencido: number;
    entradasDia: number;
    saidasDia: number;
    saldoProjetado: number;
  };
  crm: {
    novosMes: number;
    ativos: number;
    leads: number;
    oportunidadesAbertas: number;
  };
};

export class OperacionalOverviewService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async getOverview(): Promise<OperacionalOverview> {
    const tz = resolveTenantTimezone();
    const hoje = civilDateInTimezone(new Date(), tz);
    const ontem = shiftCivilDate(hoje, -1);
    const mesIni = firstDayOfMonthCivil(hoje);
    const mesAntFim = shiftCivilDate(mesIni, -1);
    const mesAntIni = firstDayOfMonthCivil(mesAntFim);

    const { data: vendas } = await this.supabase
      .from("vendas")
      .select(
        "id, data_venda, status, total, desconto_total, margem_total, cliente_id, consumidor_nao_identificado",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("data_venda", mesAntIni)
      .lte("data_venda", hoje);

    const vrows = vendas ?? [];
    const fat = (list: typeof vrows) =>
      list.filter((v) => v.status === "faturado");
    const sum = (list: typeof vrows) =>
      list.reduce((s, v) => s + Number(v.total), 0);

    const fatHoje = fat(vrows.filter((v) => v.data_venda === hoje));
    const fatOntem = fat(vrows.filter((v) => v.data_venda === ontem));
    const fatMes = fat(
      vrows.filter((v) => v.data_venda >= mesIni && v.data_venda <= hoje),
    );
    const fatMesAnt = fat(
      vrows.filter(
        (v) => v.data_venda >= mesAntIni && v.data_venda <= mesAntFim,
      ),
    );

    const vendasDia = delta(sum(fatHoje), sum(fatOntem));
    const vendasMes = delta(sum(fatMes), sum(fatMesAnt));
    const ticketAtual =
      fatMes.length > 0 ? sum(fatMes) / fatMes.length : 0;
    const ticketAnt =
      fatMesAnt.length > 0 ? sum(fatMesAnt) / fatMesAnt.length : 0;

    const idsMes = fatMes.map((v) => v.id);
    let itensVendidos = 0;
    if (idsMes.length) {
      const { data: itens } = await this.supabase
        .from("venda_itens")
        .select("quantidade")
        .eq("tenant_id", this.tenantId)
        .in("venda_id", idsMes.slice(0, 500))
        .is("deleted_at", null);
      itensVendidos = (itens ?? []).reduce(
        (s, i) => s + Number(i.quantidade),
        0,
      );
    }

    const clientesSet = new Set(
      fatMes
        .filter((v) => v.cliente_id && !v.consumidor_nao_identificado)
        .map((v) => v.cliente_id as string),
    );

    const { data: osRows } = await this.supabase
      .from("ordens_servico")
      .select(
        "id, status, data_abertura, data_conclusao, faturado_em, valor_total, previsao_entrega",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("data_abertura", mesAntIni);

    const os = (osRows ?? []) as Array<{
      id: string;
      status: string;
      data_abertura: string;
      data_conclusao: string | null;
      faturado_em: string | null;
      valor_total: number;
      previsao_entrega: string | null;
    }>;

    const countStatus = (statuses: string[]) =>
      os.filter((o) => statuses.includes(o.status)).length;
    const finalizadas = os.filter((o) =>
      ["entregue", "faturado"].includes(o.status),
    );
    const fatOs = os.filter((o) => o.status === "faturado");
    const fatOsSum = fatOs.reduce((s, o) => s + Number(o.valor_total), 0);
    const tempos: number[] = [];
    for (const o of finalizadas) {
      const fim = o.data_conclusao ?? o.faturado_em;
      if (!fim) continue;
      const days =
        (new Date(fim).getTime() - new Date(o.data_abertura).getTime()) /
        (1000 * 60 * 60 * 24);
      if (days >= 0 && days < 120) tempos.push(days);
    }

    const { data: produtos } = await this.supabase
      .from("produtos")
      .select("id, estoque_atual, estoque_minimo, custo, preco_venda, tipo")
      .eq("tenant_id", this.tenantId)
      .eq("ativo", true)
      .is("deleted_at", null)
      .neq("tipo", "servico");

    let baixo = 0;
    let zerados = 0;
    let valorTotal = 0;
    const produtoIds: string[] = [];
    for (const p of produtos ?? []) {
      produtoIds.push(p.id);
      const est = Number(p.estoque_atual ?? 0);
      const min = Number(p.estoque_minimo ?? 0);
      if (est <= 0) zerados += 1;
      else if (min > 0 && est <= min) baixo += 1;
      valorTotal += est * Number(p.custo ?? p.preco_venda ?? 0);
    }

    const { count: saidasDia } = await this.supabase
      .from("estoque_movimentacoes")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.tenantId)
      .eq("tipo", "saida")
      .gte("created_at", `${hoje}T00:00:00`);

    const limiarSemGiro = shiftCivilDate(hoje, -90);
    const { data: movRecentes } = await this.supabase
      .from("estoque_movimentacoes")
      .select("produto_id")
      .eq("tenant_id", this.tenantId)
      .gte("created_at", `${limiarSemGiro}T00:00:00`)
      .limit(5000);
    const comGiro = new Set((movRecentes ?? []).map((m) => m.produto_id));
    const semGiro = produtoIds.filter((id) => !comGiro.has(id)).length;

    const { data: crs } = await this.supabase
      .from("contas_receber")
      .select("valor_original, valor_recebido, status, data_vencimento")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .in("status", ["aberto", "parcial", "vencido"]);

    let receberAberto = 0;
    let receberVencido = 0;
    for (const c of crs ?? []) {
      const saldo =
        Number(c.valor_original) - Number(c.valor_recebido ?? 0);
      receberAberto += Math.max(0, saldo);
      if (
        c.data_vencimento &&
        c.data_vencimento < hoje &&
        saldo > 0
      ) {
        receberVencido += saldo;
      }
    }

    const { data: movs } = await this.supabase
      .from("movimentacoes_bancarias")
      .select("tipo, valor, data_movimentacao")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .eq("data_movimentacao", hoje);

    let entradasDia = 0;
    let saidasDiaFin = 0;
    for (const m of movs ?? []) {
      if (m.tipo === "entrada") entradasDia += Number(m.valor);
      if (m.tipo === "saida") saidasDiaFin += Number(m.valor);
    }

    const { data: contas } = await this.supabase
      .from("contas_bancarias")
      .select("saldo_atual")
      .eq("tenant_id", this.tenantId)
      .eq("ativo", true)
      .is("deleted_at", null);

    const saldoAtual = (contas ?? []).reduce(
      (s, c) => s + Number(c.saldo_atual ?? 0),
      0,
    );

    const { count: novosMes } = await this.supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("created_at", `${mesIni}T00:00:00`);

    const { count: ativos } = await this.supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.tenantId)
      .eq("ativo", true)
      .is("deleted_at", null);

    let leads = 0;
    let oportunidadesAbertas = 0;
    const { data: crmRows, error: crmErr } = await this.supabase
      .from("clientes")
      .select("estagio_funil")
      .eq("tenant_id", this.tenantId)
      .eq("ativo", true)
      .is("deleted_at", null)
      .limit(2000);
    if (!crmErr) {
      for (const c of crmRows ?? []) {
        const est = String(c.estagio_funil ?? "");
        if (est === "lead") leads += 1;
        if (
          ["lead", "contato", "proposta", "negociacao"].includes(est)
        ) {
          oportunidadesAbertas += 1;
        }
      }
    }

    return {
      vendas: {
        dia: vendasDia,
        mes: vendasMes,
        ticketMedio: delta(ticketAtual, ticketAnt),
        margemBruta: fatMes.reduce(
          (s, v) => s + Number(v.margem_total ?? 0),
          0,
        ),
        descontos: fatMes.reduce(
          (s, v) => s + Number(v.desconto_total ?? 0),
          0,
        ),
        canceladas: vrows.filter(
          (v) =>
            v.status === "cancelado" &&
            v.data_venda >= mesIni &&
            v.data_venda <= hoje,
        ).length,
        itensVendidos,
        clientesAtendidos: clientesSet.size,
      },
      os: {
        abertas: countStatus(["rascunho", "aguardando_diagnostico"]),
        pendentes: countStatus([
          "aguardando_orcamento",
          "aguardando_peca",
          "aguardando_cliente",
        ]),
        aguardandoAprovacao: countStatus(["aguardando_aprovacao"]),
        emExecucao: countStatus([
          "em_execucao",
          "aguardando_peca",
          "aguardando_cliente",
        ]),
        finalizadasHoje: finalizadas.filter((o) => {
          const fim = (o.data_conclusao ?? o.faturado_em ?? "").slice(0, 10);
          return fim === hoje;
        }).length,
        finalizadasMes: finalizadas.filter((o) => {
          const fim = (o.data_conclusao ?? o.faturado_em ?? "").slice(0, 10);
          return fim >= mesIni && fim <= hoje;
        }).length,
        canceladas: countStatus(["cancelado", "cancelada"]),
        ticketMedio:
          fatOs.length > 0 ? Number((fatOsSum / fatOs.length).toFixed(2)) : 0,
        faturamento: fatOsSum,
        tempoMedioDias:
          tempos.length > 0
            ? Number(
                (
                  tempos.reduce((a, b) => a + b, 0) / tempos.length
                ).toFixed(1),
              )
            : null,
      },
      estoque: {
        baixo,
        zerados,
        valorTotal: Number(valorTotal.toFixed(2)),
        semGiro,
        saidasDia: saidasDia ?? 0,
      },
      financeiro: {
        receberAberto: Number(receberAberto.toFixed(2)),
        receberVencido: Number(receberVencido.toFixed(2)),
        entradasDia: Number(entradasDia.toFixed(2)),
        saidasDia: Number(saidasDiaFin.toFixed(2)),
        saldoProjetado: Number(
          (saldoAtual + receberAberto - receberVencido * 0).toFixed(2),
        ),
      },
      crm: {
        novosMes: novosMes ?? 0,
        ativos: ativos ?? 0,
        leads,
        oportunidadesAbertas,
      },
    };
  }
}

export async function createOperacionalOverviewService(tenantId: string) {
  const supabase = await createClient();
  return new OperacionalOverviewService(supabase, tenantId);
}
