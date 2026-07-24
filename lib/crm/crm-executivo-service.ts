/**
 * Loader de leitura — Central Inteligente de Clientes (Gate 18.2).
 * Não altera contratos públicos existentes; apenas leituras das tabelas atuais.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Cliente360Data } from "@/types/crm";

import {
  composeCrmExecPerfil,
  composeCrmExecPortfolio,
  type CrmExecAgendaRef,
  type CrmExecClienteBase,
  type CrmExecItemFreq,
  type CrmExecOsEvent,
  type CrmExecTagRef,
  type CrmExecTarefaRef,
  type CrmExecVendaEvent,
  type CrmExecVeiculoRef,
} from "./crm-executivo-compose";

function osValor(row: {
  subtotal?: number | null;
  desconto_total?: number | null;
  acrescimo_total?: number | null;
}): number {
  return (
    Number(row.subtotal ?? 0) -
    Number(row.desconto_total ?? 0) +
    Number(row.acrescimo_total ?? 0)
  );
}

export class CrmExecutivoService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  async loadPortfolio(now: Date = new Date()) {
    const [
      clientes,
      ordens,
      vendas,
      veiculos,
      tarefas,
      agendamentos,
      tags,
    ] = await Promise.all([
      this.loadClientes(),
      this.loadOrdens(),
      this.loadVendas(),
      this.loadVeiculos(),
      this.loadTarefasAbertas(),
      this.loadAgendamentos(),
      this.loadVipTags(),
    ]);

    return composeCrmExecPortfolio({
      clientes,
      ordens,
      vendas,
      veiculos,
      tarefas,
      agendamentos,
      tags,
      now,
    });
  }

  async loadPerfilFrom360(
    cliente: CrmExecClienteBase,
    data360: Cliente360Data,
    now: Date = new Date(),
  ) {
    const ordemIds = data360.ordens.map((o) => o.id);
    const { servicos, pecas } = await this.loadItensFrequencia(ordemIds);

    return composeCrmExecPerfil({
      cliente,
      ordens: data360.ordens.map((o) => ({
        id: o.id,
        cliente_id: cliente.id,
        status: o.status,
        created_at: o.created_at,
        valor_total: o.valor_total,
      })),
      vendas: [
        ...data360.vendas.map((v) => ({
          id: v.id,
          cliente_id: cliente.id,
          status: v.status,
          total: v.total,
          created_at: v.created_at,
        })),
        ...data360.orcamentos
          .filter((o) => o.origem === "venda")
          .map((o) => ({
            id: o.id,
            cliente_id: cliente.id,
            status: o.status,
            total: o.total,
            created_at: o.created_at,
          })),
      ],
      veiculos: data360.veiculos.map((v) => ({
        id: v.id,
        cliente_id: cliente.id,
      })),
      tarefas: data360.tarefas.map((t) => ({
        id: t.id,
        cliente_id: cliente.id,
        tipo: t.tipo,
        status: t.status,
        data_vencimento: t.data_vencimento,
        titulo: t.titulo,
      })),
      agendamentos: data360.agendamentos.map((a) => ({
        id: a.id,
        cliente_id: cliente.id,
        tipo: a.tipo,
        status: a.status,
        inicio: a.inicio,
        titulo: a.titulo,
      })),
      tags: data360.tags,
      financeiro: data360.financeiro,
      itensServico: servicos,
      itensPeca: pecas,
      now,
    });
  }

  private async loadClientes(): Promise<CrmExecClienteBase[]> {
    const { data, error } = await this.supabase
      .from("clientes")
      .select("id, nome, telefone, whatsapp, ativo, created_at")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("nome", { ascending: true })
      .limit(3000);

    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id as string,
      nome: String(r.nome ?? ""),
      telefone: (r.telefone as string | null) ?? null,
      whatsapp: (r.whatsapp as string | null) ?? null,
      ativo: Boolean(r.ativo),
      created_at: r.created_at as string,
    }));
  }

  private async loadOrdens(): Promise<CrmExecOsEvent[]> {
    const { data, error } = await this.supabase
      .from("ordens_servico")
      .select(
        "id, cliente_id, status, created_at, subtotal, desconto_total, acrescimo_total",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) return [];
    return (data ?? [])
      .filter((r) => r.cliente_id)
      .map((r) => ({
        id: r.id as string,
        cliente_id: r.cliente_id as string,
        status: String(r.status ?? ""),
        created_at: r.created_at as string,
        valor_total: osValor(r),
      }));
  }

  private async loadVendas(): Promise<CrmExecVendaEvent[]> {
    const { data, error } = await this.supabase
      .from("vendas")
      .select("id, cliente_id, status, total, created_at, data_venda")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .in("status", ["faturado", "orcamento", "em_andamento"])
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) return [];
    return (data ?? [])
      .filter((r) => r.cliente_id)
      .map((r) => ({
        id: r.id as string,
        cliente_id: r.cliente_id as string,
        status: String(r.status ?? ""),
        total: Number(r.total ?? 0),
        created_at: r.created_at as string,
        data_venda: (r.data_venda as string | null) ?? null,
      }));
  }

  private async loadVeiculos(): Promise<CrmExecVeiculoRef[]> {
    const { data, error } = await this.supabase
      .from("veiculos")
      .select("id, cliente_id")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .limit(5000);

    if (error) return [];
    return (data ?? [])
      .filter((r) => r.cliente_id)
      .map((r) => ({
        id: r.id as string,
        cliente_id: r.cliente_id as string,
      }));
  }

  private async loadTarefasAbertas(): Promise<CrmExecTarefaRef[]> {
    const { data, error } = await this.supabase
      .from("cliente_tarefas" as never)
      .select("id, cliente_id, tipo, status, data_vencimento, titulo")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .in("status", ["pendente", "em_andamento"])
      .limit(2000);

    if (error) return [];
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      cliente_id: r.cliente_id as string,
      tipo: String(r.tipo ?? ""),
      status: String(r.status ?? ""),
      data_vencimento: (r.data_vencimento as string | null) ?? null,
      titulo: String(r.titulo ?? ""),
    }));
  }

  private async loadAgendamentos(): Promise<CrmExecAgendaRef[]> {
    const { data, error } = await this.supabase
      .from("cliente_agendamentos" as never)
      .select("id, cliente_id, tipo, status, inicio, titulo")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("inicio", { ascending: false })
      .limit(2000);

    if (error) return [];
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      cliente_id: r.cliente_id as string,
      tipo: String(r.tipo ?? ""),
      status: String(r.status ?? "agendado"),
      inicio: r.inicio as string,
      titulo: String(r.titulo ?? ""),
    }));
  }

  private async loadVipTags(): Promise<CrmExecTagRef[]> {
    const { data, error } = await this.supabase
      .from("entity_tags" as never)
      .select("entity_id, tags:tags ( nome )")
      .eq("tenant_id", this.tenantId)
      .eq("entity_type", "cliente");

    if (error) return [];
    return ((data ?? []) as Array<{
      entity_id?: string;
      tags?: { nome?: string } | null;
    }>)
      .filter((r) => r.entity_id && r.tags?.nome)
      .map((r) => ({
        entity_id: r.entity_id as string,
        nome: String(r.tags?.nome),
      }));
  }

  private async loadItensFrequencia(ordemIds: string[]): Promise<{
    servicos: CrmExecItemFreq[];
    pecas: CrmExecItemFreq[];
  }> {
    if (!ordemIds.length) return { servicos: [], pecas: [] };

    const chunk = ordemIds.slice(0, 50);
    const { data, error } = await this.supabase
      .from("ordem_servico_itens")
      .select("descricao, tipo_item, quantidade, ordem_servico_id")
      .eq("tenant_id", this.tenantId)
      .in("ordem_servico_id", chunk)
      .is("deleted_at", null)
      .limit(500);

    if (error) return { servicos: [], pecas: [] };

    const servMap = new Map<string, number>();
    const pecaMap = new Map<string, number>();

    for (const row of data ?? []) {
      const desc = String(row.descricao ?? "").trim();
      if (!desc) continue;
      const qtd = Number(row.quantidade ?? 1) || 1;
      const tipo = String(row.tipo_item ?? "").toLowerCase();
      if (tipo === "produto" || tipo === "peca" || tipo === "peça") {
        pecaMap.set(desc, (pecaMap.get(desc) ?? 0) + qtd);
      } else {
        servMap.set(desc, (servMap.get(desc) ?? 0) + qtd);
      }
    }

    const toList = (m: Map<string, number>): CrmExecItemFreq[] =>
      [...m.entries()]
        .map(([descricao, quantidade]) => ({ descricao, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade);

    return { servicos: toList(servMap), pecas: toList(pecaMap) };
  }
}

export async function createCrmExecutivoService(tenantId: string) {
  const supabase = await createClient();
  return new CrmExecutivoService(supabase, tenantId);
}
