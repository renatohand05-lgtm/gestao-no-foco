import type { SupabaseClient } from "@supabase/supabase-js";

import { CRM_FUNIL_STAGES, type CrmFunilStage } from "@/lib/crm/constants";
import {
  mergeClienteTimeline,
  resolveUltimoContato,
} from "@/lib/crm/cliente-timeline-merge";
import { createClient } from "@/lib/supabase/server";
import type { Cliente360Data, CrmDashboardKpis, CrmFunilColumnStats } from "@/types/crm";

import { createClienteAgendaService } from "./cliente-agenda-service";
import { createClienteDocumentoStorageService } from "./cliente-documento-storage-service";
import { createClienteTarefaService } from "./cliente-tarefa-service";
import { createClienteTimelineService } from "./cliente-timeline-service";

export class Cliente360Service {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  async load(clienteId: string): Promise<Cliente360Data> {
    const [
      tagsRes,
      ordens,
      vendas,
      orcamentos,
      veiculos,
      financeiro,
      eventosDb,
      tarefas,
      agendamentos,
      documentos,
    ] = await Promise.all([
      this.loadTags(clienteId),
      this.loadOrdens(clienteId),
      this.loadVendas(clienteId),
      this.loadOrcamentos(clienteId),
      this.loadVeiculos(clienteId),
      this.loadFinanceiro(clienteId),
      createClienteTimelineService(this.tenantId).then((s) =>
        s.listByCliente(clienteId, 100),
      ),
      createClienteTarefaService(this.tenantId).then((s) =>
        s.listByCliente(clienteId),
      ),
      createClienteAgendaService(this.tenantId).then((s) =>
        s.listByCliente(clienteId),
      ),
      createClienteDocumentoStorageService(this.tenantId).then((s) =>
        s.listByCliente(clienteId),
      ),
    ]);

    const profileIds = new Set<string>();
    for (const e of eventosDb) if (e.user_id) profileIds.add(e.user_id);
    for (const t of tarefas) if (t.created_by) profileIds.add(t.created_by);
    for (const a of agendamentos) if (a.created_by) profileIds.add(a.created_by);

    const profileNames = await this.loadProfileNames([...profileIds]);
    const eventos = mergeClienteTimeline({
      eventos: eventosDb,
      ordens,
      vendas,
      tarefas,
      agendamentos,
      profileNames,
    });

    const observacoes = eventosDb.filter((e) => e.tipo === "observacao");

    const receitaVendas = vendas.reduce((a, v) => a + Number(v.total ?? 0), 0);
    const receitaOrdens = ordens.reduce((a, o) => a + Number(o.valor_total ?? 0), 0);
    const receita_total = receitaVendas + receitaOrdens;
    const transacoes = vendas.length + ordens.length;

    const ultimaCompraCandidates = [
      ...vendas.map((v) => v.created_at),
      ...ordens.map((o) => o.created_at),
    ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return {
      tags: tagsRes,
      resumo: {
        ordens_total: ordens.length,
        vendas_total: vendas.length,
        receita_total,
        ticket_medio: transacoes > 0 ? receita_total / transacoes : 0,
        contas_abertas: financeiro.filter((f) => f.status === "aberto").length,
        veiculos_total: veiculos.length,
        ultima_compra: ultimaCompraCandidates[0] ?? null,
        ultimo_contato: resolveUltimoContato(eventos),
      },
      ordens,
      orcamentos,
      vendas,
      veiculos,
      financeiro,
      eventos,
      tarefas,
      agendamentos,
      documentos,
      observacoes,
    };
  }

  private async loadProfileNames(ids: string[]): Promise<Record<string, string>> {
    if (!ids.length) return {};
    const { data } = await this.supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    const map: Record<string, string> = {};
    for (const p of data ?? []) {
      map[p.id] = p.full_name?.trim() || p.email || p.id.slice(0, 8);
    }
    return map;
  }

  private async loadTags(clienteId: string): Promise<string[]> {
    const { data } = await this.supabase
      .from("entity_tags" as never)
      .select("tag_id, tags:tags ( nome )")
      .eq("tenant_id", this.tenantId)
      .eq("entity_type", "cliente")
      .eq("entity_id", clienteId);

    return ((data ?? []) as Array<{ tags?: { nome?: string } | null }>)
      .map((r) => r.tags?.nome)
      .filter(Boolean) as string[];
  }

  private async loadOrdens(clienteId: string) {
    const { data, error } = await this.supabase
      .from("ordens_servico")
      .select("id, numero, status, created_at, subtotal, desconto_total, acrescimo_total")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return [];
    return (data ?? []).map((row) => ({
      id: row.id as string,
      numero: row.numero as number | null,
      status: row.status as string,
      created_at: row.created_at as string,
      valor_total:
        Number(row.subtotal ?? 0) -
        Number(row.desconto_total ?? 0) +
        Number(row.acrescimo_total ?? 0),
    }));
  }

  private async loadVendas(clienteId: string) {
    const { data, error } = await this.supabase
      .from("vendas")
      .select("id, numero, status, total, created_at")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .is("deleted_at", null)
      .eq("status", "faturado")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return [];
    return (data ?? []).map((row) => ({
      id: row.id as string,
      numero: row.numero as number | null,
      status: row.status as string,
      total: Number(row.total ?? 0),
      created_at: row.created_at as string,
    }));
  }

  private async loadOrcamentos(clienteId: string) {
    const [vendasOrc, osRows] = await Promise.all([
      this.supabase
        .from("vendas")
        .select("id, numero, status, total, created_at")
        .eq("tenant_id", this.tenantId)
        .eq("cliente_id", clienteId)
        .is("deleted_at", null)
        .in("status", ["orcamento", "em_andamento"])
        .order("created_at", { ascending: false })
        .limit(20),
      this.supabase
        .from("ordens_servico")
        .select("id, numero, status, created_at, subtotal, desconto_total, acrescimo_total")
        .eq("tenant_id", this.tenantId)
        .eq("cliente_id", clienteId)
        .is("deleted_at", null)
        .in("status", ["orcamento", "aguardando_aprovacao"])
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const hits: Cliente360Data["orcamentos"] = [];
    for (const row of vendasOrc.data ?? []) {
      hits.push({
        id: row.id as string,
        numero: row.numero as number | null,
        status: row.status as string,
        total: Number(row.total ?? 0),
        created_at: row.created_at as string,
        origem: "venda",
      });
    }
    for (const row of osRows.data ?? []) {
      hits.push({
        id: row.id as string,
        numero: row.numero as number | null,
        status: row.status as string,
        total:
          Number(row.subtotal ?? 0) -
          Number(row.desconto_total ?? 0) +
          Number(row.acrescimo_total ?? 0),
        created_at: row.created_at as string,
        origem: "os",
      });
    }
    return hits.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  private async loadVeiculos(clienteId: string) {
    const { data, error } = await this.supabase
      .from("veiculos")
      .select("id, placa, marca, modelo, ano")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []) as Cliente360Data["veiculos"];
  }

  private async loadFinanceiro(clienteId: string) {
    const { data, error } = await this.supabase
      .from("contas_receber")
      .select("id, descricao, valor_original, status, data_vencimento")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .is("deleted_at", null)
      .order("data_vencimento", { ascending: false })
      .limit(30);

    if (error) return [];
    return (data ?? []).map((row) => ({
      id: row.id as string,
      descricao: row.descricao as string,
      valor_original: Number(row.valor_original ?? 0),
      status: row.status as string,
      data_vencimento: row.data_vencimento as string,
    }));
  }
}

export class CrmDashboardService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  async getKpis(days = 30): Promise<CrmDashboardKpis> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();

    const funil: CrmFunilColumnStats[] = CRM_FUNIL_STAGES.map((estagio) => ({
      estagio,
      total: 0,
      valor_total: 0,
    }));

    const { data: clientes } = await this.supabase
      .from("clientes" as never)
      .select("id, estagio_funil, consultor_id, created_at, ativo, updated_at")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null);

    const rows = (clientes ?? []) as Array<{
      id: string;
      estagio_funil?: CrmFunilStage;
      consultor_id: string | null;
      created_at: string;
      updated_at: string;
      ativo: boolean;
    }>;

    const clienteIds = rows.map((r) => r.id);
    const pipelineValues = await this.loadPipelineValues(clienteIds);

    let novos = 0;
    let ativos = 0;
    let fechados = 0;
    let perdidos = 0;
    let totalLeads = 0;
    let somaDiasFechamento = 0;
    let countFechamento = 0;
    let somaCarteira = 0;

    for (const c of rows) {
      const est = c.estagio_funil ?? "lead";
      const bucket = funil.find((f) => f.estagio === est);
      const pipeline = pipelineValues.get(c.id) ?? 0;
      if (bucket) {
        bucket.total += 1;
        bucket.valor_total += pipeline;
      }
      if (c.ativo) ativos += 1;
      if (c.created_at >= sinceIso) novos += 1;
      if (est === "lead") totalLeads += 1;
      if (est === "fechado") {
        fechados += 1;
        const dias =
          (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) /
          (1000 * 60 * 60 * 24);
        if (dias >= 0) {
          somaDiasFechamento += dias;
          countFechamento += 1;
        }
      }
      if (est === "perdido") perdidos += 1;
      somaCarteira += pipeline;
    }

    const { data: vendas } = await this.supabase
      .from("vendas")
      .select("total, cliente_id, created_by, created_at, status")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("created_at", sinceIso);

    const vendaRows = (vendas ?? []).filter((v) => v.status === "faturado");
    const receita = vendaRows.reduce((a, v) => a + Number(v.total ?? 0), 0);
    const clientesComVenda = new Set(vendaRows.map((v) => v.cliente_id)).size;
    const ticket = vendaRows.length > 0 ? receita / vendaRows.length : 0;

    const vendedorMap = new Map<string, { receita: number; clientes: Set<string> }>();
    for (const v of vendaRows) {
      const key = (v.created_by as string | null) ?? "sem_vendedor";
      if (!vendedorMap.has(key)) {
        vendedorMap.set(key, { receita: 0, clientes: new Set() });
      }
      const entry = vendedorMap.get(key)!;
      entry.receita += Number(v.total ?? 0);
      if (v.cliente_id) entry.clientes.add(v.cliente_id as string);
    }

    const receita_por_vendedor = await this.resolveVendedorStats(vendedorMap);
    const receita_mensal = this.buildReceitaMensal(vendaRows as Array<{ created_at: string; total: number }>);

    const taxa_conversao =
      rows.length > 0 ? Math.round((fechados / rows.length) * 1000) / 10 : 0;

    return {
      total_leads: totalLeads,
      novos_clientes: novos,
      clientes_ativos: ativos,
      clientes_perdidos: perdidos,
      receita_crm: Math.round(receita * 100) / 100,
      ticket_medio: Math.round(ticket * 100) / 100,
      receita_por_cliente:
        clientesComVenda > 0
          ? Math.round((receita / clientesComVenda) * 100) / 100
          : 0,
      valor_medio_carteira:
        rows.length > 0 ? Math.round((somaCarteira / rows.length) * 100) / 100 : 0,
      taxa_conversao,
      tempo_medio_fechamento_dias:
        countFechamento > 0
          ? Math.round((somaDiasFechamento / countFechamento) * 10) / 10
          : 0,
      receita_por_vendedor,
      funil,
      receita_mensal,
    };
  }

  private async loadPipelineValues(clienteIds: string[]) {
    const map = new Map<string, number>();
    if (!clienteIds.length) return map;

    const chunk = clienteIds.slice(0, 500);
    const [vendasRes, osRes] = await Promise.all([
      this.supabase
        .from("vendas")
        .select("cliente_id, total")
        .eq("tenant_id", this.tenantId)
        .in("cliente_id", chunk)
        .is("deleted_at", null)
        .in("status", ["orcamento", "em_andamento", "faturado"]),
      this.supabase
        .from("ordens_servico")
        .select("cliente_id, subtotal, desconto_total, acrescimo_total")
        .eq("tenant_id", this.tenantId)
        .in("cliente_id", chunk)
        .is("deleted_at", null),
    ]);

    for (const v of vendasRes.data ?? []) {
      if (!v.cliente_id) continue;
      map.set(
        v.cliente_id,
        (map.get(v.cliente_id) ?? 0) + Number(v.total ?? 0),
      );
    }
    for (const o of osRes.data ?? []) {
      if (!o.cliente_id) continue;
      const val =
        Number(o.subtotal ?? 0) -
        Number(o.desconto_total ?? 0) +
        Number(o.acrescimo_total ?? 0);
      map.set(o.cliente_id, (map.get(o.cliente_id) ?? 0) + val);
    }
    return map;
  }

  private buildReceitaMensal(vendas: Array<{ created_at: string; total: number }>) {
    const buckets = new Map<string, number>();
    for (const v of vendas) {
      const d = new Date(v.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, (buckets.get(key) ?? 0) + Number(v.total ?? 0));
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([data, value]) => ({
        data,
        label: data.slice(5) + "/" + data.slice(2, 4),
        value: Math.round(value * 100) / 100,
      }));
  }

  private async resolveVendedorStats(
    vendedorMap: Map<string, { receita: number; clientes: Set<string> }>,
  ) {
    const ids = Array.from(vendedorMap.keys()).filter((k) => k !== "sem_vendedor");
    const names = new Map<string, string>();

    if (ids.length) {
      const { data } = await this.supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      for (const p of data ?? []) {
        names.set(p.id, p.full_name?.trim() || p.email || p.id.slice(0, 8));
      }
    }

    return Array.from(vendedorMap.entries()).map(([consultor_id, stats]) => ({
      consultor_id: consultor_id === "sem_vendedor" ? null : consultor_id,
      nome:
        consultor_id === "sem_vendedor"
          ? "Sem vendedor"
          : (names.get(consultor_id) ?? consultor_id.slice(0, 8)),
      receita: stats.receita,
      clientes: stats.clientes.size,
    }));
  }
}

export async function createCliente360Service(tenantId: string) {
  const supabase = await createClient();
  return new Cliente360Service(supabase, tenantId);
}

export async function createCrmDashboardService(tenantId: string) {
  const supabase = await createClient();
  return new CrmDashboardService(supabase, tenantId);
}
