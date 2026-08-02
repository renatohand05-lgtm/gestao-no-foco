/**
 * Sprint 28.9 — Conversões server-side canônicas (idempotentes).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAgendaEventService } from "@/lib/agenda/agenda-service";
import { createClienteTarefaService } from "@/lib/crm/cliente-tarefa-service";
import { createOrdemServicoService } from "@/lib/ordens/ordem-servico-service";
import { createClient } from "@/lib/supabase/server";
import { createVendaService } from "@/lib/vendas/venda-service";
import type { Database } from "@/types/database";

export const OPP_MARKER = (oppId: string) => `[crm_opp:${oppId}]`;
export const VENDA_OS_MARKER = (vendaId: string) => `[from_venda:${vendaId}]`;
export const AGENDA_OS_MARKER = (eventId: string) => `[from_agenda:${eventId}]`;
export const AGENDA_TASK_MARKER = (eventId: string) =>
  `[from_agenda_task:${eventId}]`;

export type ConversionExecResult = {
  ok: boolean;
  status: "ok" | "idempotent" | "indisponivel" | "erro";
  message: string;
  id?: string;
  redirectPath?: string;
};

export class ConversionService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
    private readonly tenantSlug: string,
  ) {}

  /** Oportunidade → orçamento de venda (status orcamento). Sem baixar estoque. */
  async oportunidadeToOrcamento(
    oportunidadeId: string,
    userId: string | null,
  ): Promise<ConversionExecResult> {
    const { data: row, error } = await this.supabase
      .from("crm_oportunidades")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", oportunidadeId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) {
      return {
        ok: false,
        status: "indisponivel",
        message: "Oportunidade não encontrada neste tenant.",
      };
    }

    const marker = OPP_MARKER(row.id);
    const { data: existing } = await this.supabase
      .from("vendas")
      .select("id, status")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", row.cliente_id)
      .is("deleted_at", null)
      .ilike("observacoes", `%${marker}%`)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return {
        ok: true,
        status: "idempotent",
        message: "Orçamento já existia para esta oportunidade.",
        id: existing.id,
        redirectPath: `/${this.tenantSlug}/vendas/${existing.id}`,
      };
    }

    const valor =
      row.valor_estimado != null && Number.isFinite(Number(row.valor_estimado))
        ? Number(row.valor_estimado)
        : 0;
    const descricao =
      row.produto_servico?.trim() || row.titulo || "Item da oportunidade";

    const { data: venda, error: vendaErr } = await this.supabase
      .from("vendas")
      .insert({
        tenant_id: this.tenantId,
        cliente_id: row.cliente_id,
        data_venda: new Date().toISOString().slice(0, 10),
        status: "orcamento",
        subtotal: valor,
        desconto_total: 0,
        total: valor,
        margem_total: null,
        canal_venda: "crm",
        centro_custo_id: row.centro_custo_id,
        observacoes: `${marker} ${row.titulo}`.trim(),
        created_by: userId,
      })
      .select("id")
      .single();
    if (vendaErr) throw new Error(vendaErr.message);

    const { error: itemErr } = await this.supabase.from("venda_itens").insert({
      tenant_id: this.tenantId,
      venda_id: venda.id,
      produto_id: null,
      descricao,
      tipo_item: "servico",
      quantidade: 1,
      preco_unitario: valor,
      desconto: 0,
      total: valor,
      custo_unitario: null,
      margem: null,
      ordem: 0,
    });
    if (itemErr) throw new Error(itemErr.message);

    return {
      ok: true,
      status: "ok",
      message: "Orçamento de venda criado a partir da oportunidade.",
      id: venda.id,
      redirectPath: `/${this.tenantSlug}/vendas/${venda.id}`,
    };
  }

  /** Orçamento → venda em andamento (não fatura; sem movimento estoque/financeiro). */
  async orcamentoToVenda(vendaId: string): Promise<ConversionExecResult> {
    const vendaSvc = await createVendaService(this.tenantId);
    const detail = await vendaSvc.getById(vendaId);
    if (!detail) {
      return {
        ok: false,
        status: "indisponivel",
        message: "Orçamento/venda não encontrado neste tenant.",
      };
    }
    if (detail.status === "em_andamento" || detail.status === "faturado") {
      return {
        ok: true,
        status: "idempotent",
        message: `Já convertido (status atual preservado).`,
        id: detail.id,
        redirectPath: `/${this.tenantSlug}/vendas/${detail.id}`,
      };
    }
    if (detail.status !== "orcamento") {
      return {
        ok: false,
        status: "indisponivel",
        message: "Somente orçamento pode ser convertido para venda em andamento.",
      };
    }

    const { error } = await this.supabase
      .from("vendas")
      .update({
        status: "em_andamento",
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", this.tenantId)
      .eq("id", vendaId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);

    return {
      ok: true,
      status: "ok",
      message: "Orçamento convertido para venda em andamento.",
      id: vendaId,
      redirectPath: `/${this.tenantSlug}/vendas/${vendaId}`,
    };
  }

  /** Orçamento de venda → OS. Idempotente. Não movimenta estoque. */
  async orcamentoToOs(
    vendaId: string,
    userId: string | null,
  ): Promise<ConversionExecResult> {
    const vendaSvc = await createVendaService(this.tenantId);
    const detail = await vendaSvc.getById(vendaId);
    if (!detail) {
      return {
        ok: false,
        status: "indisponivel",
        message: "Orçamento não encontrado neste tenant.",
      };
    }
    if (detail.status !== "orcamento" && detail.status !== "em_andamento") {
      return {
        ok: false,
        status: "indisponivel",
        message: "Somente orçamento/em andamento pode gerar OS.",
      };
    }

    const marker = VENDA_OS_MARKER(vendaId);
    const { data: existingOs } = await this.supabase
      .from("ordens_servico")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", detail.cliente_id)
      .is("deleted_at", null)
      .ilike("observacoes", `%${marker}%`)
      .limit(1)
      .maybeSingle();
    if (existingOs?.id) {
      return {
        ok: true,
        status: "idempotent",
        message: "OS já existia para este orçamento.",
        id: existingOs.id,
        redirectPath: `/${this.tenantSlug}/ordens/${existingOs.id}`,
      };
    }

    const { data: veiculo } = await this.supabase
      .from("veiculos")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", detail.cliente_id)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (!veiculo?.id) {
      return {
        ok: false,
        status: "indisponivel",
        message:
          "Cliente sem veículo. Cadastre um veículo antes de converter em OS.",
      };
    }

    const osSvc = await createOrdemServicoService(this.tenantId);
    const os = await osSvc.create(
      {
        cliente_id: detail.cliente_id,
        veiculo_id: veiculo.id,
        observacoes: `${marker} Orçamento #${detail.numero}`,
        reclamacao_cliente: detail.observacoes ?? null,
        centro_custo_id: detail.centro_custo_id ?? "",
        prioridade: "normal",
        origem_atendimento: "orcamento",
      },
      userId,
    );

    await this.supabase
      .from("ordens_servico")
      .update({ venda_id: vendaId } as never)
      .eq("id", os.id)
      .eq("tenant_id", this.tenantId);

    return {
      ok: true,
      status: "ok",
      message: "OS criada a partir do orçamento (sem baixar estoque).",
      id: os.id,
      redirectPath: `/${this.tenantSlug}/ordens/${os.id}`,
    };
  }

  async agendaToTarefa(
    eventId: string,
    userId: string | null,
  ): Promise<ConversionExecResult> {
    const agenda = await createAgendaEventService(this.tenantId);
    const ev = await agenda.getById(eventId);
    if (!ev) {
      return {
        ok: false,
        status: "indisponivel",
        message: "Evento não encontrado.",
      };
    }
    if (!ev.cliente_id) {
      return {
        ok: false,
        status: "indisponivel",
        message: "Vincule um cliente ao evento antes de criar tarefa.",
      };
    }

    const marker = AGENDA_TASK_MARKER(eventId);
    const tarefas = await createClienteTarefaService(this.tenantId);
    const list = await tarefas.listByCliente(ev.cliente_id);
    const found = list.find((t) => (t.descricao ?? "").includes(marker));
    if (found) {
      return {
        ok: true,
        status: "idempotent",
        message: "Tarefa já existia para este evento.",
        id: found.id,
      };
    }

    const created = await tarefas.create(
      {
        cliente_id: ev.cliente_id,
        titulo: ev.titulo,
        descricao: `${marker} ${ev.observacao ?? ""}`.trim(),
        tipo: "proposta",
      },
      userId,
    );

    return {
      ok: true,
      status: "ok",
      message: "Tarefa CRM criada a partir do evento.",
      id: created.id,
      redirectPath: `/${this.tenantSlug}/clientes/${ev.cliente_id}`,
    };
  }

  async agendaToOs(
    eventId: string,
    userId: string | null,
  ): Promise<ConversionExecResult> {
    const agenda = await createAgendaEventService(this.tenantId);
    const ev = await agenda.getById(eventId);
    if (!ev) {
      return {
        ok: false,
        status: "indisponivel",
        message: "Evento não encontrado.",
      };
    }
    if (!ev.cliente_id) {
      return {
        ok: false,
        status: "indisponivel",
        message: "Vincule um cliente ao evento antes de criar OS.",
      };
    }
    if (ev.ordem_servico_id) {
      return {
        ok: true,
        status: "idempotent",
        message: "Evento já vinculado a uma OS.",
        id: ev.ordem_servico_id,
        redirectPath: `/${this.tenantSlug}/ordens/${ev.ordem_servico_id}`,
      };
    }

    const marker = AGENDA_OS_MARKER(eventId);
    const { data: existing } = await this.supabase
      .from("ordens_servico")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .ilike("observacoes", `%${marker}%`)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      await this.supabase
        .from("agenda_eventos")
        .update({
          ordem_servico_id: existing.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId)
        .eq("tenant_id", this.tenantId);
      return {
        ok: true,
        status: "idempotent",
        message: "OS já existia para este evento.",
        id: existing.id,
        redirectPath: `/${this.tenantSlug}/ordens/${existing.id}`,
      };
    }

    const { data: veiculo } = await this.supabase
      .from("veiculos")
      .select("id")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", ev.cliente_id)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (!veiculo?.id) {
      return {
        ok: false,
        status: "indisponivel",
        message: "Cliente sem veículo — cadastre antes de abrir OS.",
      };
    }

    const osSvc = await createOrdemServicoService(this.tenantId);
    const os = await osSvc.create(
      {
        cliente_id: ev.cliente_id,
        veiculo_id: veiculo.id,
        observacoes: `${marker} ${ev.titulo}`,
        reclamacao_cliente: ev.observacao,
        prioridade: "normal",
        origem_atendimento: "agenda",
        centro_custo_id: "",
      },
      userId,
    );

    await this.supabase
      .from("agenda_eventos")
      .update({
        ordem_servico_id: os.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .eq("tenant_id", this.tenantId);

    return {
      ok: true,
      status: "ok",
      message: "OS criada a partir do evento da agenda.",
      id: os.id,
      redirectPath: `/${this.tenantSlug}/ordens/${os.id}`,
    };
  }
}

export async function createConversionService(
  tenantId: string,
  tenantSlug: string,
) {
  const supabase = await createClient();
  return new ConversionService(supabase, tenantId, tenantSlug);
}
