import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createVendaService } from "@/lib/vendas/venda-service";
import {
  assertTransition,
  canApplyAprovacao,
  canEditOrcamento,
  canFaturarStatus,
  findTransitionPath,
  isTerminalCancelado,
  OS_CHECKLIST_TEMPLATE,
  OS_STATUS_LABELS,
  type OsStatus,
} from "@/lib/ordens/os-status";
import { formatVeiculoLabel } from "@/lib/ordens/veiculo-shared";
import type { Database } from "@/types/database";
import type {
  OsAprovacaoFormValues,
  OsDiagnosticoFormValues,
  OsEntregaFormValues,
  OsExecucaoFormValues,
  OsFaturarFormValues,
  OsHeaderUpdateFormValues,
  OsItemFormValues,
  OsOpenFormValues,
  OsPrevisaoFormValues,
  OsRetornoFormValues,
  OsStatusFormValues,
} from "@/lib/ordens/validations";

export type OrdemServicoListItem = {
  id: string;
  numero: number;
  status: string;
  cliente_id: string;
  cliente_nome: string | null;
  veiculo_id: string | null;
  placa: string | null;
  modelo: string | null;
  data_abertura: string;
  previsao_entrega: string | null;
  valor_total: number;
  mecanico_id: string | null;
  venda_id: string | null;
  prioridade: string;
};

export type OrdemServicoItem = {
  id: string;
  descricao: string;
  tipo_item: string;
  categoria_item: string;
  produto_id: string | null;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  acrescimo: number;
  valor_total: number;
  custo_unitario: number | null;
  aprovacao_status: string;
  estoque_status: string;
  peca_origem: string;
  execucao_status: string;
  execucao_inicio: string | null;
  execucao_fim: string | null;
  mecanico_id: string | null;
  horas_previstas: number | null;
  horas_realizadas: number | null;
  observacoes: string | null;
};

export type OrdemServicoDetail = OrdemServicoListItem & {
  quilometragem_entrada: number | null;
  quilometragem_saida: number | null;
  data_hora_entrada: string | null;
  reclamacao_cliente: string | null;
  observacoes: string | null;
  nivel_combustivel: string | null;
  objetos_deixados: string | null;
  danos_aparentes: string | null;
  centro_custo_id: string | null;
  origem_atendimento: string | null;
  consultor_id: string | null;
  subtotal: number;
  desconto_total: number;
  acrescimo_total: number;
  data_conclusao: string | null;
  garantia_dias: number | null;
  itens: OrdemServicoItem[];
  checklist: Array<{
    id: string;
    item_codigo: string;
    item_label: string;
    status: string;
    observacao: string | null;
    categoria?: string | null;
    classificacao?: string | null;
    ordem?: number;
  }>;
  diagnosticos: Array<Record<string, unknown>>;
  eventos: Array<{
    id: string;
    tipo: string;
    descricao: string;
    estado_anterior: string | null;
    estado_posterior: string | null;
    motivo: string | null;
    created_at: string;
  }>;
  previsoes: Array<{
    id: string;
    previsao_anterior: string | null;
    previsao_nova: string;
    motivo: string | null;
    created_at: string;
  }>;
};

function emptyUuid(value?: string | null) {
  if (!value || value === "") return null;
  return value;
}

function lineTotal(q: number, vu: number, desc: number, acr: number) {
  return Number(Math.max(0, q * vu - desc + acr).toFixed(2));
}

const CLASSIFICACAO_STATUS_VALUES = new Set([
  "bom",
  "atencao",
  "critico",
  "nao_verificado",
  "nao_aplicavel",
]);

function mapStatusToClassificacao(status: string): string | null {
  if (CLASSIFICACAO_STATUS_VALUES.has(status)) {
    return status;
  }
  switch (status) {
    case "ok":
      return "bom";
    case "danificado":
    case "ausente":
      return "critico";
    case "na":
      return "nao_aplicavel";
    default:
      return null;
  }
}

export class OrdemServicoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(filters: {
    status?: string;
    q?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ items: OrdemServicoListItem[]; total: number }> {
    const page = filters.page ?? 1;
    const perPage = filters.perPage ?? 20;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = this.supabase
      .from("ordens_servico")
      .select(
        "id, numero, status, cliente_id, veiculo_id, data_abertura, previsao_entrega, valor_total, mecanico_id, venda_id, prioridade, cliente:clientes(nome), veiculo:veiculos(placa, modelo)",
        { count: "exact" },
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("numero", { ascending: false })
      .range(from, to);

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    let items = (data ?? []).map((row) => {
      const cliente = row.cliente as unknown as { nome: string } | null;
      const veiculo = row.veiculo as unknown as {
        placa: string;
        modelo: string | null;
      } | null;
      return {
        id: row.id,
        numero: Number(row.numero),
        status: row.status,
        cliente_id: row.cliente_id,
        cliente_nome: cliente?.nome ?? null,
        veiculo_id: row.veiculo_id,
        placa: veiculo?.placa ?? null,
        modelo: veiculo?.modelo ?? null,
        data_abertura: row.data_abertura,
        previsao_entrega: row.previsao_entrega ?? null,
        valor_total: Number(row.valor_total),
        mecanico_id: row.mecanico_id,
        venda_id: row.venda_id,
        prioridade: row.prioridade ?? "normal",
      } satisfies OrdemServicoListItem;
    });

    if (filters.q?.trim()) {
      const q = filters.q.trim().toLowerCase();
      items = items.filter(
        (item) =>
          String(item.numero).includes(q) ||
          item.cliente_nome?.toLowerCase().includes(q) ||
          item.placa?.toLowerCase().includes(q) ||
          item.modelo?.toLowerCase().includes(q),
      );
    }

    return { items, total: count ?? items.length };
  }

  async getById(id: string): Promise<OrdemServicoDetail | null> {
    const { data, error } = await this.supabase
      .from("ordens_servico")
      .select(
        "*, cliente:clientes(nome), veiculo:veiculos(placa, modelo)",
      )
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const [itens, checklist, diagnosticos, eventos, previsoes] =
      await Promise.all([
        this.supabase
          .from("ordem_servico_itens")
          .select("*")
          .eq("tenant_id", this.tenantId)
          .eq("ordem_servico_id", id)
          .is("deleted_at", null)
          .order("ordem"),
        this.supabase
          .from("ordem_servico_checklist" as never)
          .select("*")
          .eq("tenant_id", this.tenantId)
          .eq("ordem_servico_id", id)
          .is("deleted_at", null),
        this.supabase
          .from("ordem_servico_diagnosticos" as never)
          .select("*")
          .eq("tenant_id", this.tenantId)
          .eq("ordem_servico_id", id)
          .is("deleted_at", null)
          .order("registrado_em", { ascending: false }),
        this.supabase
          .from("ordem_servico_eventos" as never)
          .select("id, tipo, descricao, estado_anterior, estado_posterior, motivo, created_at")
          .eq("tenant_id", this.tenantId)
          .eq("ordem_servico_id", id)
          .order("created_at", { ascending: false })
          .limit(100),
        this.supabase
          .from("ordem_servico_previsoes" as never)
          .select("id, previsao_anterior, previsao_nova, motivo, created_at")
          .eq("tenant_id", this.tenantId)
          .eq("ordem_servico_id", id)
          .order("created_at", { ascending: false }),
      ]);

    if (itens.error) throw new Error(itens.error.message);

    const cliente = data.cliente as unknown as { nome: string } | null;
    const veiculo = data.veiculo as unknown as {
      placa: string;
      modelo: string | null;
    } | null;
    const row = data as unknown as Record<string, unknown>;

    return {
      id: data.id,
      numero: Number(data.numero),
      status: data.status,
      cliente_id: data.cliente_id,
      cliente_nome: cliente?.nome ?? null,
      veiculo_id: data.veiculo_id,
      placa: veiculo?.placa ?? null,
      modelo: veiculo?.modelo ?? null,
      data_abertura: data.data_abertura,
      previsao_entrega: (row.previsao_entrega as string | null) ?? null,
      valor_total: Number(data.valor_total),
      mecanico_id: data.mecanico_id,
      venda_id: data.venda_id,
      prioridade: (row.prioridade as string) ?? "normal",
      quilometragem_entrada: (row.quilometragem_entrada as number | null) ?? null,
      quilometragem_saida: (row.quilometragem_saida as number | null) ?? null,
      data_hora_entrada: (row.data_hora_entrada as string | null) ?? null,
      reclamacao_cliente: (row.reclamacao_cliente as string | null) ?? null,
      observacoes: (row.observacoes as string | null) ?? data.descricao,
      nivel_combustivel: (row.nivel_combustivel as string | null) ?? null,
      objetos_deixados: (row.objetos_deixados as string | null) ?? null,
      danos_aparentes: (row.danos_aparentes as string | null) ?? null,
      centro_custo_id: (row.centro_custo_id as string | null) ?? null,
      origem_atendimento: (row.origem_atendimento as string | null) ?? null,
      consultor_id: (row.consultor_id as string | null) ?? null,
      subtotal: Number(row.subtotal ?? 0),
      desconto_total: Number(row.desconto_total ?? 0),
      acrescimo_total: Number(row.acrescimo_total ?? 0),
      data_conclusao: data.data_conclusao,
      garantia_dias: (row.garantia_dias as number | null) ?? null,
      itens: ((itens.data ?? []) as Array<Record<string, unknown>>).map((item) => ({
        id: String(item.id),
        descricao: String(item.descricao),
        tipo_item: String(item.tipo_item),
        categoria_item: String(item.categoria_item ?? "servico"),
        produto_id: (item.produto_id as string | null) ?? null,
        quantidade: Number(item.quantidade),
        valor_unitario: Number(item.valor_unitario),
        desconto: Number(item.desconto ?? 0),
        acrescimo: Number(item.acrescimo ?? 0),
        valor_total: Number(item.valor_total),
        custo_unitario:
          item.custo_unitario == null ? null : Number(item.custo_unitario),
        aprovacao_status: String(item.aprovacao_status ?? "pendente"),
        estoque_status: String(item.estoque_status ?? "nao_aplicavel"),
        peca_origem: String(item.peca_origem ?? "estoque"),
        execucao_status: String(item.execucao_status ?? "pendente"),
        execucao_inicio: (item.execucao_inicio as string | null) ?? null,
        execucao_fim: (item.execucao_fim as string | null) ?? null,
        mecanico_id: (item.mecanico_id as string | null) ?? null,
        horas_previstas:
          item.horas_previstas == null ? null : Number(item.horas_previstas),
        horas_realizadas:
          item.horas_realizadas == null ? null : Number(item.horas_realizadas),
        observacoes: (item.observacoes as string | null) ?? null,
      })),
      checklist: ((checklist.data ?? []) as Array<Record<string, unknown>>).map(
        (c) => {
          const status = String(c.status);
          const classificacaoRaw = c.classificacao as string | null | undefined;
          return {
            id: String(c.id),
            item_codigo: String(c.item_codigo),
            item_label: String(c.item_label),
            status,
            observacao: (c.observacao as string | null) ?? null,
            categoria: (c.categoria as string | null) ?? null,
            classificacao:
              classificacaoRaw ?? mapStatusToClassificacao(status),
            ordem: c.ordem == null ? undefined : Number(c.ordem),
          };
        },
      ),
      diagnosticos: (diagnosticos.data ?? []) as Array<Record<string, unknown>>,
      eventos: ((eventos.data ?? []) as Array<Record<string, unknown>>).map((e) => ({
        id: String(e.id),
        tipo: String(e.tipo),
        descricao: String(e.descricao),
        estado_anterior: (e.estado_anterior as string | null) ?? null,
        estado_posterior: (e.estado_posterior as string | null) ?? null,
        motivo: (e.motivo as string | null) ?? null,
        created_at: String(e.created_at),
      })),
      previsoes: ((previsoes.data ?? []) as Array<Record<string, unknown>>).map(
        (p) => ({
          id: String(p.id),
          previsao_anterior: (p.previsao_anterior as string | null) ?? null,
          previsao_nova: String(p.previsao_nova),
          motivo: (p.motivo as string | null) ?? null,
          created_at: String(p.created_at),
        }),
      ),
    };
  }

  async create(
    input: OsOpenFormValues,
    userId: string | null,
  ): Promise<OrdemServicoDetail> {
    await this.assertCliente(input.cliente_id);

    const veiculoId = emptyUuid(input.veiculo_id);
    if (!veiculoId) {
      throw new Error("Selecione ou cadastre um veículo para abrir a OS.");
    }
    await this.assertVeiculo(veiculoId, input.cliente_id);

    const { data, error } = await this.supabase
      .from("ordens_servico")
      .insert({
        tenant_id: this.tenantId,
        cliente_id: input.cliente_id,
        veiculo_id: veiculoId,
        status: "rascunho",
        mecanico_id: emptyUuid(input.mecanico_id),
        consultor_id: emptyUuid(input.consultor_id),
        centro_custo_id: emptyUuid(input.centro_custo_id),
        quilometragem_entrada: input.quilometragem_entrada ?? null,
        data_hora_entrada: input.data_hora_entrada || new Date().toISOString(),
        previsao_entrega: input.previsao_entrega || null,
        reclamacao_cliente: input.reclamacao_cliente ?? null,
        observacoes: input.observacoes ?? null,
        descricao: input.reclamacao_cliente ?? input.observacoes ?? null,
        nivel_combustivel: input.nivel_combustivel ?? null,
        objetos_deixados: input.objetos_deixados ?? null,
        danos_aparentes: input.danos_aparentes ?? null,
        origem_atendimento: input.origem_atendimento ?? null,
        prioridade: input.prioridade,
        responsavel_recebimento_id: userId,
      } as never)
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await this.seedChecklist(data.id, userId);
    await this.recordEvent(data.id, userId, {
      tipo: "abertura",
      descricao: "OS aberta",
      estado_posterior: "rascunho",
    });

    const detail = await this.getById(data.id);
    if (!detail) throw new Error("Erro ao carregar OS criada.");
    return detail;
  }

  async updateVeiculoVinculo(
    id: string,
    veiculoId: string,
    userId: string | null,
  ): Promise<OrdemServicoDetail> {
    const current = await this.getById(id);
    if (!current) throw new Error("OS não encontrada.");
    if (current.venda_id || current.status === "faturado") {
      throw new Error("Não é possível alterar o veículo de OS faturada.");
    }
    if (["cancelado", "cancelada"].includes(current.status)) {
      throw new Error("Não é possível alterar veículo de OS cancelada.");
    }

    await this.assertVeiculo(veiculoId, current.cliente_id);

    const { error } = await this.supabase
      .from("ordens_servico")
      .update({ veiculo_id: veiculoId } as never)
      .eq("id", id)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    const oldLabel = [current.placa, current.modelo].filter(Boolean).join(" ") || "sem placa";
    const { data: novoVeiculo } = await this.supabase
      .from("veiculos")
      .select("placa, modelo, marca, ano, cor")
      .eq("tenant_id", this.tenantId)
      .eq("id", veiculoId)
      .maybeSingle();
    const newLabel = novoVeiculo
      ? formatVeiculoLabel({
          id: veiculoId,
          placa: (novoVeiculo as { placa: string | null }).placa,
          marca: (novoVeiculo as { marca: string | null }).marca,
          modelo: (novoVeiculo as { modelo: string | null }).modelo,
          ano: (novoVeiculo as { ano: number | null }).ano,
          cor: (novoVeiculo as { cor: string | null }).cor,
        })
      : "veículo";

    await this.recordEvent(id, userId, {
      tipo: "alteracao",
      descricao: `Veículo alterado: ${oldLabel} → ${newLabel}`,
      estado_anterior: oldLabel,
      estado_posterior: newLabel,
      entidade_tipo: "veiculo",
      entidade_id: veiculoId,
    });

    const detail = await this.getById(id);
    if (!detail) throw new Error("Erro ao recarregar OS.");
    return detail;
  }

  async changeStatus(
    id: string,
    input: OsStatusFormValues,
    userId: string | null,
  ) {
    const current = await this.getById(id);
    if (!current) throw new Error("OS não encontrada.");
    if (isTerminalCancelado(current.status) && input.status !== current.status) {
      throw new Error("OS cancelada não pode mudar de status.");
    }
    if (current.status === "faturado" && input.status === "cancelado") {
      throw new Error("OS faturada não pode ser cancelada. Use estorno da venda.");
    }
    assertTransition(current.status, input.status);

    const { error } = await this.supabase
      .from("ordens_servico")
      .update({ status: input.status } as never)
      .eq("id", id)
      .eq("tenant_id", this.tenantId);

    if (error) throw new Error(error.message);

    await this.recordEvent(id, userId, {
      tipo: "status",
      descricao: `Status alterado para ${OS_STATUS_LABELS[input.status as OsStatus] ?? input.status}`,
      estado_anterior: current.status,
      estado_posterior: input.status,
      motivo: input.motivo ?? null,
    });
  }

  /**
   * Avança status passo a passo pelas transições adjacentes válidas.
   * Não permite saltos — usa o grafo de OS_TRANSITIONS.
   */
  private async advanceTo(
    osId: string,
    target: OsStatus,
    userId: string | null,
    motivo: string,
  ) {
    const current = await this.getById(osId);
    if (!current) throw new Error("OS não encontrada.");
    if (current.status === target) return;

    const path = findTransitionPath(current.status, target);
    if (!path) {
      throw new Error(
        `Não há caminho válido de ${OS_STATUS_LABELS[current.status as OsStatus] ?? current.status} para ${OS_STATUS_LABELS[target]}.`,
      );
    }

    for (const next of path) {
      await this.changeStatus(osId, { status: next, motivo }, userId);
    }
  }

  async updateOsHeader(
    id: string,
    input: OsHeaderUpdateFormValues,
    userId: string | null,
  ): Promise<OrdemServicoDetail> {
    const current = await this.getById(id);
    if (!current) throw new Error("OS não encontrada.");
    if (current.venda_id || current.status === "faturado") {
      throw new Error("Não é possível editar OS faturada.");
    }
    if (isTerminalCancelado(current.status)) {
      throw new Error("Não é possível editar OS cancelada.");
    }

    const patch: Record<string, unknown> = {};
    if (input.reclamacao_cliente !== undefined) {
      patch.reclamacao_cliente = input.reclamacao_cliente ?? null;
    }
    if (input.observacoes !== undefined) {
      patch.observacoes = input.observacoes ?? null;
    }
    if (input.quilometragem_entrada !== undefined) {
      patch.quilometragem_entrada = input.quilometragem_entrada ?? null;
    }
    if (input.previsao_entrega !== undefined) {
      patch.previsao_entrega = input.previsao_entrega ?? null;
    }
    if (input.nivel_combustivel !== undefined) {
      patch.nivel_combustivel = input.nivel_combustivel ?? null;
    }
    if (input.objetos_deixados !== undefined) {
      patch.objetos_deixados = input.objetos_deixados ?? null;
    }
    if (input.danos_aparentes !== undefined) {
      patch.danos_aparentes = input.danos_aparentes ?? null;
    }
    if (input.prioridade !== undefined) {
      patch.prioridade = input.prioridade;
    }
    if (input.origem_atendimento !== undefined) {
      patch.origem_atendimento = input.origem_atendimento ?? null;
    }

    if (Object.keys(patch).length === 0) {
      return current;
    }

    const { error } = await this.supabase
      .from("ordens_servico")
      .update(patch as never)
      .eq("id", id)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await this.recordEvent(id, userId, {
      tipo: "alteracao",
      descricao: "Dados da OS atualizados",
    });

    const detail = await this.getById(id);
    if (!detail) throw new Error("Erro ao recarregar OS.");
    return detail;
  }

  async addItem(osId: string, input: OsItemFormValues, userId: string | null) {
    const current = await this.getById(osId);
    if (!current) throw new Error("OS não encontrada.");
    if (["faturado", "cancelado", "cancelada"].includes(current.status)) {
      throw new Error("Não é possível alterar itens nesta OS.");
    }
    if (current.venda_id) {
      throw new Error("OS já faturada — itens bloqueados.");
    }
    if (["rascunho", "aguardando_diagnostico"].includes(current.status)) {
      throw new Error(
        "Conclua o diagnóstico antes de montar o orçamento.",
      );
    }
    if (!canEditOrcamento(current.status) && current.status !== "aprovado") {
      throw new Error(
        `Status atual (${OS_STATUS_LABELS[current.status as OsStatus] ?? current.status}) não permite editar orçamento.`,
      );
    }

    const total = lineTotal(
      input.quantidade,
      input.valor_unitario,
      input.desconto,
      input.acrescimo,
    );

    const estoqueStatus =
      input.tipo_item === "produto" && input.peca_origem === "estoque"
        ? "disponivel"
        : input.peca_origem === "cliente"
          ? "fornecido_cliente"
          : input.peca_origem === "compra"
            ? "pendente_compra"
            : "nao_aplicavel";

    const { error } = await this.supabase.from("ordem_servico_itens").insert({
      tenant_id: this.tenantId,
      ordem_servico_id: osId,
      produto_id: emptyUuid(input.produto_id),
      descricao: input.descricao,
      tipo_item: input.tipo_item,
      categoria_item: input.categoria_item,
      quantidade: input.quantidade,
      valor_unitario: input.valor_unitario,
      desconto: input.desconto,
      acrescimo: input.acrescimo,
      valor_total: total,
      custo_unitario: input.custo_unitario ?? null,
      mecanico_id: emptyUuid(input.mecanico_id),
      horas_previstas: input.horas_previstas ?? null,
      peca_origem: input.peca_origem,
      fornecedor_sugerido_id: emptyUuid(input.fornecedor_sugerido_id),
      estoque_status: estoqueStatus,
      aprovacao_status: "pendente",
      execucao_status: "pendente",
      observacoes: input.observacoes ?? null,
      ordem: current.itens.length,
    } as never);

    if (error) throw new Error(error.message);

    if (current.status === "diagnostico_concluido") {
      await this.advanceTo(
        osId,
        "aguardando_orcamento",
        userId,
        "Orçamento iniciado",
      );
    }

    await this.recalcTotals(osId);
    await this.recordEvent(osId, userId, {
      tipo: "orcamento",
      descricao: `Item adicionado: ${input.descricao}`,
    });
  }

  async updateItem(
    osId: string,
    itemId: string,
    input: OsItemFormValues,
    userId: string | null,
  ) {
    const current = await this.getById(osId);
    if (!current) throw new Error("OS não encontrada.");
    if (["faturado", "cancelado", "cancelada"].includes(current.status)) {
      throw new Error("Não é possível alterar itens nesta OS.");
    }
    if (current.venda_id) {
      throw new Error("OS já faturada — itens bloqueados.");
    }

    const item = current.itens.find((i) => i.id === itemId);
    if (!item) throw new Error("Item não encontrado.");
    if (item.aprovacao_status !== "pendente") {
      throw new Error(
        "Somente itens pendentes de aprovação podem ser editados. Reabra o orçamento se necessário.",
      );
    }

    const total = lineTotal(
      input.quantidade,
      input.valor_unitario,
      input.desconto,
      input.acrescimo,
    );

    const estoqueStatus =
      input.tipo_item === "produto" && input.peca_origem === "estoque"
        ? "disponivel"
        : input.peca_origem === "cliente"
          ? "fornecido_cliente"
          : input.peca_origem === "compra"
            ? "pendente_compra"
            : "nao_aplicavel";

    const { error } = await this.supabase
      .from("ordem_servico_itens")
      .update({
        produto_id: emptyUuid(input.produto_id),
        descricao: input.descricao,
        tipo_item: input.tipo_item,
        categoria_item: input.categoria_item,
        quantidade: input.quantidade,
        valor_unitario: input.valor_unitario,
        desconto: input.desconto,
        acrescimo: input.acrescimo,
        valor_total: total,
        custo_unitario: input.custo_unitario ?? null,
        mecanico_id: emptyUuid(input.mecanico_id),
        horas_previstas: input.horas_previstas ?? null,
        peca_origem: input.peca_origem,
        fornecedor_sugerido_id: emptyUuid(input.fornecedor_sugerido_id),
        estoque_status: estoqueStatus,
        observacoes: input.observacoes ?? null,
      } as never)
      .eq("id", itemId)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await this.recalcTotals(osId);
    await this.recordEvent(osId, userId, {
      tipo: "orcamento",
      descricao: `Item atualizado: ${input.descricao}`,
      entidade_tipo: "ordem_servico_item",
      entidade_id: itemId,
    });
  }

  async removeItem(osId: string, itemId: string, userId: string | null) {
    const current = await this.getById(osId);
    if (!current) throw new Error("OS não encontrada.");
    if (["faturado", "cancelado", "cancelada"].includes(current.status)) {
      throw new Error("Não é possível alterar itens nesta OS.");
    }
    if (current.venda_id) {
      throw new Error("OS já faturada — itens bloqueados.");
    }

    const item = current.itens.find((i) => i.id === itemId);
    if (!item) throw new Error("Item não encontrado.");
    if (item.aprovacao_status === "aprovado") {
      throw new Error(
        "Item aprovado não pode ser removido. Reprove o orçamento antes de excluir.",
      );
    }

    const { error } = await this.supabase
      .from("ordem_servico_itens")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", itemId)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await this.recalcTotals(osId);
    await this.recordEvent(osId, userId, {
      tipo: "orcamento",
      descricao: `Item removido: ${item.descricao}`,
      entidade_tipo: "ordem_servico_item",
      entidade_id: itemId,
    });
  }

  async saveDiagnostico(
    osId: string,
    input: OsDiagnosticoFormValues,
    userId: string | null,
  ) {
    const current = await this.getById(osId);
    if (!current) throw new Error("OS não encontrada.");

    const { error } = await this.supabase
      .from("ordem_servico_diagnosticos" as never)
      .insert({
        tenant_id: this.tenantId,
        ordem_servico_id: osId,
        sintoma_relatado: input.sintoma_relatado ?? null,
        diagnostico_tecnico: input.diagnostico_tecnico ?? null,
        causa_provavel: input.causa_provavel ?? null,
        recomendacao: input.recomendacao ?? null,
        gravidade: input.gravidade ?? null,
        urgencia: input.urgencia ?? null,
        testes_realizados: input.testes_realizados ?? null,
        pecas_necessarias: input.pecas_necessarias ?? null,
        servicos_necessarios: input.servicos_necessarios ?? null,
        observacoes_internas: input.observacoes_internas ?? null,
        observacoes_cliente: input.observacoes_cliente ?? null,
        tecnico_id: userId,
      } as never);

    if (error) throw new Error(error.message);

    if (
      current.status === "rascunho" ||
      current.status === "aguardando_diagnostico"
    ) {
      await this.advanceTo(
        osId,
        "diagnostico_concluido",
        userId,
        "Diagnóstico registrado",
      );
    }

    await this.recordEvent(osId, userId, {
      tipo: "diagnostico",
      descricao: "Diagnóstico registrado (sem impacto financeiro).",
    });
  }

  async applyAprovacao(
    osId: string,
    input: OsAprovacaoFormValues,
    userId: string | null,
  ) {
    const current = await this.getById(osId);
    if (!current) throw new Error("OS não encontrada.");
    if (current.itens.length === 0) {
      throw new Error("Adicione itens ao orçamento antes de aprovar.");
    }
    if (!canApplyAprovacao(current.status)) {
      throw new Error(
        `Status atual (${OS_STATUS_LABELS[current.status as OsStatus] ?? current.status}) não permite aprovação. Avance checklist, diagnóstico e orçamento.`,
      );
    }

    if (current.status !== "aguardando_aprovacao") {
      await this.advanceTo(
        osId,
        "aguardando_aprovacao",
        userId,
        "Orçamento pronto para aprovação",
      );
    }

    const now = new Date().toISOString();
    let nextStatus: OsStatus = "aprovado";

    if (input.modo === "reprovar") {
      for (const item of current.itens) {
        await this.supabase
          .from("ordem_servico_itens")
          .update({
            aprovacao_status: "reprovado",
            aprovacao_motivo: input.motivo ?? null,
            aprovacao_em: now,
            aprovacao_canal: input.canal,
            estoque_status:
              item.estoque_status === "reservado"
                ? "disponivel"
                : item.estoque_status,
          } as never)
          .eq("id", item.id)
          .eq("tenant_id", this.tenantId);
      }
      nextStatus = "aguardando_orcamento";
    } else if (input.modo === "total") {
      for (const item of current.itens) {
        const reservar =
          item.tipo_item === "produto" &&
          item.peca_origem === "estoque" &&
          item.estoque_status === "disponivel";
        await this.supabase
          .from("ordem_servico_itens")
          .update({
            aprovacao_status: "aprovado",
            aprovacao_em: now,
            aprovacao_canal: input.canal,
            estoque_status: reservar ? "reservado" : item.estoque_status,
          } as never)
          .eq("id", item.id)
          .eq("tenant_id", this.tenantId);
      }
      nextStatus = "aprovado";
    } else {
      const approved = new Set(input.item_ids_aprovados ?? []);
      if (approved.size === 0) {
        throw new Error("Selecione ao menos um item para aprovação parcial.");
      }
      for (const item of current.itens) {
        const ok = approved.has(item.id);
        const reservar =
          ok &&
          item.tipo_item === "produto" &&
          item.peca_origem === "estoque" &&
          item.estoque_status === "disponivel";
        await this.supabase
          .from("ordem_servico_itens")
          .update({
            aprovacao_status: ok ? "aprovado" : "reprovado",
            aprovacao_em: now,
            aprovacao_canal: input.canal,
            aprovacao_motivo: ok ? null : input.motivo ?? "Não aprovado",
            estoque_status: reservar ? "reservado" : item.estoque_status,
          } as never)
          .eq("id", item.id)
          .eq("tenant_id", this.tenantId);
      }
      nextStatus = "parcialmente_aprovado";
    }

    await this.changeStatus(
      osId,
      { status: nextStatus, motivo: input.motivo ?? `Aprovação ${input.modo}` },
      userId,
    );
    await this.recordEvent(osId, userId, {
      tipo: "aprovacao",
      descricao: `Aprovação ${input.modo} via ${input.canal}`,
      motivo: input.motivo ?? null,
    });
  }

  async updateItemExecucao(
    osId: string,
    itemId: string,
    input: OsExecucaoFormValues,
    userId: string | null,
  ) {
    const current = await this.getById(osId);
    if (!current) throw new Error("OS não encontrada.");
    const item = current.itens.find((i) => i.id === itemId);
    if (!item) throw new Error("Item não encontrado.");
    if (item.aprovacao_status !== "aprovado") {
      throw new Error("Item não aprovado não entra em execução.");
    }

    const status = input.status;
    const patch: Record<string, unknown> = { execucao_status: status };
    if (status === "em_execucao") {
      if (!item.execucao_inicio) {
        patch.execucao_inicio = new Date().toISOString();
      }
    }
    if (status === "concluido") {
      if (!item.execucao_inicio) {
        throw new Error("Conclua somente após iniciar a execução do item.");
      }
      patch.execucao_fim = new Date().toISOString();
      if (input.horas_realizadas != null) {
        patch.horas_realizadas = input.horas_realizadas;
      } else if (item.horas_previstas != null) {
        patch.horas_realizadas = item.horas_previstas;
      }
    }
    if (status === "cancelado" && item.estoque_status === "reservado") {
      patch.estoque_status = "disponivel";
    }
    if (input.horas_realizadas != null && status !== "concluido") {
      patch.horas_realizadas = input.horas_realizadas;
    }

    const { error } = await this.supabase
      .from("ordem_servico_itens")
      .update(patch as never)
      .eq("id", itemId)
      .eq("tenant_id", this.tenantId);
    if (error) throw new Error(error.message);

    if (
      ["aprovado", "parcialmente_aprovado"].includes(current.status) &&
      status === "em_execucao"
    ) {
      await this.changeStatus(
        osId,
        { status: "em_execucao", motivo: "Execução iniciada" },
        userId,
      );
    }

    await this.recordEvent(osId, userId, {
      tipo: "execucao",
      descricao: `Item "${item.descricao}" → ${status}`,
      entidade_tipo: "ordem_servico_item",
      entidade_id: itemId,
    });
  }

  async updatePrevisao(
    osId: string,
    input: OsPrevisaoFormValues,
    userId: string | null,
  ) {
    const current = await this.getById(osId);
    if (!current) throw new Error("OS não encontrada.");

    await this.supabase.from("ordem_servico_previsoes" as never).insert({
      tenant_id: this.tenantId,
      ordem_servico_id: osId,
      previsao_anterior: current.previsao_entrega,
      previsao_nova: input.previsao_entrega,
      motivo: input.motivo,
      user_id: userId,
    } as never);

    const { error } = await this.supabase
      .from("ordens_servico")
      .update({
        previsao_entrega_revisada: input.previsao_entrega,
        previsao_entrega: input.previsao_entrega,
      } as never)
      .eq("id", osId)
      .eq("tenant_id", this.tenantId);
    if (error) throw new Error(error.message);

    await this.recordEvent(osId, userId, {
      tipo: "previsao",
      descricao: "Previsão de entrega alterada",
      motivo: input.motivo,
    });
  }

  async concluirEntrega(
    osId: string,
    input: OsEntregaFormValues,
    userId: string | null,
  ) {
    const current = await this.getById(osId);
    if (!current) throw new Error("OS não encontrada.");

    const aprovados = current.itens.filter((i) => i.aprovacao_status === "aprovado");
    const pendentes = aprovados.filter((i) => i.execucao_status !== "concluido");
    if (pendentes.length > 0 && !input.forcar) {
      throw new Error(
        "Há serviços aprovados não concluídos. Use exceção autorizada com motivo.",
      );
    }
    if (input.forcar && !input.motivo_excecao?.trim()) {
      throw new Error("Informe o motivo da exceção.");
    }

    if (current.status !== "entregue") {
      if (current.status === "em_execucao" || current.status === "aguardando_cliente") {
        await this.advanceTo(
          osId,
          "pronto_para_entrega",
          userId,
          "Serviços concluídos — pronto para entrega",
        );
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    // data_conclusao precisa existir antes do status 'entregue' (check constraint).
    const { error } = await this.supabase
      .from("ordens_servico")
      .update({
        data_conclusao: today,
        quilometragem_saida: input.quilometragem_saida ?? null,
        garantia_dias: input.garantia_dias ?? null,
        aceite_entrega_em: new Date().toISOString(),
        aceite_entrega_por: userId,
        observacoes: input.observacoes ?? current.observacoes,
      } as never)
      .eq("id", osId)
      .eq("tenant_id", this.tenantId);
    if (error) throw new Error(error.message);

    if (current.status !== "entregue") {
      await this.advanceTo(
        osId,
        "entregue",
        userId,
        input.motivo_excecao ?? "Entrega ao cliente",
      );
    }

    await this.recordEvent(osId, userId, {
      tipo: "entrega",
      descricao: "OS entregue ao cliente",
      estado_anterior: current.status,
      estado_posterior: "entregue",
      motivo: input.motivo_excecao ?? null,
    });
  }

  /**
   * Faturamento: cria venda com itens APROVADOS e chama motor existente.
   * Estoque é baixado apenas pela venda (não houve baixa na OS).
   */
  async faturar(
    osId: string,
    input: OsFaturarFormValues,
    userId: string | null,
  ) {
    const current = await this.getById(osId);
    if (!current) throw new Error("OS não encontrada.");
    if (current.venda_id || current.status === "faturado") {
      throw new Error("OS já faturada.");
    }
    if (isTerminalCancelado(current.status)) {
      throw new Error("OS cancelada não pode ser faturada.");
    }
    if (!canFaturarStatus(current.status) && current.status !== "entregue") {
      // allow entregue and ready statuses
      if (!["entregue", "pronto_para_entrega"].includes(current.status)) {
        throw new Error("OS ainda não está pronta para faturamento.");
      }
    }

    const aprovados = current.itens.filter(
      (i) => i.aprovacao_status === "aprovado" && i.execucao_status !== "cancelado",
    );
    if (aprovados.length === 0) {
      throw new Error("Não há itens aprovados para faturar.");
    }

    const missingProduto = aprovados.filter((i) => !i.produto_id);
    if (missingProduto.length > 0) {
      throw new Error(
        "Itens aprovados precisam de produto/serviço cadastrado para faturar via venda.",
      );
    }

    const vendaService = await createVendaService(this.tenantId);
    const venda = await vendaService.create(
      {
        cliente_id: current.cliente_id,
        data_venda: input.data_venda,
        status: "orcamento",
        forma_pagamento_id: input.forma_pagamento_id,
        observacoes: `OS #${current.numero}`,
        centro_custo_id: current.centro_custo_id,
        itens: aprovados.map((item) => ({
          produto_id: item.produto_id!,
          quantidade: item.quantidade,
          preco_unitario: item.valor_unitario,
          desconto: item.desconto,
        })),
      },
      userId,
    );

    await vendaService.faturar(venda.id, userId);

    const { error } = await this.supabase
      .from("ordens_servico")
      .update({
        venda_id: venda.id,
        faturado_em: new Date().toISOString(),
        data_conclusao: current.data_conclusao ?? new Date().toISOString().slice(0, 10),
      } as never)
      .eq("id", osId)
      .eq("tenant_id", this.tenantId)
      .is("venda_id", null);

    if (error) throw new Error(error.message);

    if (current.status !== "faturado") {
      await this.advanceTo(
        osId,
        "faturado",
        userId,
        `Faturada via venda ${venda.id}`,
      );
    }

    // Marca peças como consumidas logicamente (baixa física veio da venda)
    for (const item of aprovados) {
      if (item.tipo_item === "produto" && item.peca_origem === "estoque") {
        await this.supabase
          .from("ordem_servico_itens")
          .update({ estoque_status: "consumido" } as never)
          .eq("id", item.id)
          .eq("tenant_id", this.tenantId);
      }
    }

    await this.recordEvent(osId, userId, {
      tipo: "faturamento",
      descricao: `Faturada via venda ${venda.id}`,
      estado_anterior: current.status,
      estado_posterior: "faturado",
      entidade_tipo: "venda",
      entidade_id: venda.id,
    });

    return venda.id;
  }

  async createRetorno(
    osId: string,
    input: OsRetornoFormValues,
    userId: string | null,
  ) {
    const current = await this.getById(osId);
    if (!current) throw new Error("OS original não encontrada.");
    if (!["entregue", "faturado", "garantia"].includes(current.status)) {
      throw new Error("Retorno só pode ser aberto a partir de OS entregue/faturada.");
    }

    const { data, error } = await this.supabase
      .from("retornos_servico")
      .insert({
        tenant_id: this.tenantId,
        ordem_servico_id: osId,
        cliente_id: current.cliente_id,
        veiculo_id: current.veiculo_id,
        mecanico_id: current.mecanico_id,
        data_retorno: new Date().toISOString().slice(0, 10),
        data_servico_original: current.data_abertura,
        motivo: input.motivo,
        tipo_cobertura: input.tipo_cobertura,
        tipo_retorno: input.tipo_retorno,
        quilometragem: input.quilometragem ?? null,
        diagnostico: input.diagnostico ?? null,
        item_id: emptyUuid(input.item_id),
      } as never)
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    const nextStatus =
      input.tipo_retorno === "garantia" || input.tipo_cobertura === "garantia"
        ? "garantia"
        : "retorno";

    await this.changeStatus(
      osId,
      { status: nextStatus, motivo: input.motivo },
      userId,
    );
    await this.recordEvent(osId, userId, {
      tipo: "retorno",
      descricao: `Retorno/garantia registrado (${input.tipo_retorno})`,
      motivo: input.motivo,
      entidade_tipo: "retorno_servico",
      entidade_id: data.id,
    });

    return data.id;
  }

  async updateChecklistItem(
    osId: string,
    checklistId: string,
    status: string,
    observacao: string | null,
    userId: string | null,
  ) {
    const current = await this.getById(osId);
    if (!current) throw new Error("OS não encontrada.");

    const { data: row, error: fetchError } = await this.supabase
      .from("ordem_servico_checklist" as never)
      .select("item_label")
      .eq("id", checklistId)
      .eq("ordem_servico_id", osId)
      .eq("tenant_id", this.tenantId)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);

    const classificacao = mapStatusToClassificacao(status);
    const patch: Record<string, unknown> = {
      status,
      observacao,
      responsavel_id: userId,
      registrado_em: new Date().toISOString(),
    };
    if (classificacao) {
      patch.classificacao = classificacao;
    }

    const { error } = await this.supabase
      .from("ordem_servico_checklist" as never)
      .update(patch as never)
      .eq("id", checklistId)
      .eq("ordem_servico_id", osId)
      .eq("tenant_id", this.tenantId);
    if (error) throw new Error(error.message);

    if (current.status === "rascunho") {
      await this.advanceTo(
        osId,
        "aguardando_diagnostico",
        userId,
        "Checklist de entrada iniciado",
      );
    }

    const label = (row as { item_label?: string } | null)?.item_label ?? "item";
    const display = classificacao ?? status;
    await this.recordEvent(osId, userId, {
      tipo: "checklist",
      descricao: `Checklist "${label}" → ${display}`,
      motivo: observacao,
    });
  }

  private async recalcTotals(osId: string) {
    const { data, error } = await this.supabase
      .from("ordem_servico_itens")
      .select("valor_total, desconto, acrescimo")
      .eq("ordem_servico_id", osId)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);

    const subtotal = (data ?? []).reduce(
      (acc, row) => acc + Number(row.valor_total) + Number((row as { desconto?: number }).desconto ?? 0) - Number((row as { acrescimo?: number }).acrescimo ?? 0),
      0,
    );
    const desconto = (data ?? []).reduce(
      (acc, row) => acc + Number((row as { desconto?: number }).desconto ?? 0),
      0,
    );
    const acrescimo = (data ?? []).reduce(
      (acc, row) => acc + Number((row as { acrescimo?: number }).acrescimo ?? 0),
      0,
    );
    const valorTotal = (data ?? []).reduce(
      (acc, row) => acc + Number(row.valor_total),
      0,
    );

    await this.supabase
      .from("ordens_servico")
      .update({
        subtotal: Number(subtotal.toFixed(2)),
        desconto_total: Number(desconto.toFixed(2)),
        acrescimo_total: Number(acrescimo.toFixed(2)),
        valor_total: Number(valorTotal.toFixed(2)),
      } as never)
      .eq("id", osId)
      .eq("tenant_id", this.tenantId);
  }

  private async seedChecklist(osId: string, userId: string | null) {
    const rows = OS_CHECKLIST_TEMPLATE.map((item) => ({
      tenant_id: this.tenantId,
      ordem_servico_id: osId,
      item_codigo: item.codigo,
      item_label: item.label,
      categoria: item.categoria,
      ordem: item.ordem,
      status: "nao_verificado",
      classificacao: "nao_verificado",
      responsavel_id: userId,
    }));
    await this.supabase.from("ordem_servico_checklist" as never).insert(rows as never);
  }

  private async recordEvent(
    osId: string,
    userId: string | null,
    event: {
      tipo: string;
      descricao: string;
      estado_anterior?: string | null;
      estado_posterior?: string | null;
      motivo?: string | null;
      entidade_tipo?: string;
      entidade_id?: string;
    },
  ) {
    await this.supabase.from("ordem_servico_eventos" as never).insert({
      tenant_id: this.tenantId,
      ordem_servico_id: osId,
      tipo: event.tipo,
      descricao: event.descricao,
      estado_anterior: event.estado_anterior ?? null,
      estado_posterior: event.estado_posterior ?? null,
      motivo: event.motivo ?? null,
      entidade_tipo: event.entidade_tipo ?? null,
      entidade_id: event.entidade_id ?? null,
      user_id: userId,
    } as never);
  }

  private async assertCliente(clienteId: string) {
    const { data, error } = await this.supabase
      .from("clientes")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .eq("id", clienteId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Cliente inválido para este tenant.");
  }

  private async assertVeiculo(veiculoId: string, clienteId: string) {
    const { data, error } = await this.supabase
      .from("veiculos")
      .select("id, cliente_id")
      .eq("tenant_id", this.tenantId)
      .eq("id", veiculoId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Veículo inválido para este tenant.");
    if (data.cliente_id !== clienteId) {
      throw new Error(
        "Veículo não pertence ao cliente informado. Confirme o vínculo antes de continuar.",
      );
    }
  }
}

export async function createOrdemServicoService(tenantId: string) {
  const supabase = await createClient();
  return new OrdemServicoService(supabase, tenantId);
}
