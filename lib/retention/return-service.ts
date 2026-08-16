/**
 * Sprint 35.2 — CRUD de retornos previstos. Tenant-bound. Sem auto-agendar.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { ClienteTimelineService } from "@/lib/crm/cliente-timeline-service";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import {
  classifyReturnDue,
  computeDueDate,
  computeNextKm,
  type ReturnStatus,
} from "./returns";
import { isMissingRelation } from "./schema-guard";
import type { CustomerReturnRow } from "./types";

export type CreateReturnInput = {
  clienteId: string;
  dueAt?: string | null;
  fromCivilDate?: string;
  intervalDays?: number | null;
  intervalMonths?: number | null;
  specificDate?: string | null;
  motivo?: string | null;
  observacao?: string | null;
  produtoId?: string | null;
  origemTipo?: string | null;
  origemId?: string | null;
  profissionalId?: string | null;
  veiculoId?: string | null;
  lastKm?: number | null;
  mileageKm?: number | null;
  placa?: string | null;
  veiculoLabel?: string | null;
  lastServiceLabel?: string | null;
  lastVisitAt?: string | null;
  estimatedValue?: number | null;
  hideProcedure?: boolean;
  regraOrigem?: string | null;
  canalPreferido?: string | null;
};

function asReturn(row: Record<string, unknown>): CustomerReturnRow {
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    cliente_id: String(row.cliente_id),
    produto_id: (row.produto_id as string | null) ?? null,
    origem_tipo: (row.origem_tipo as string | null) ?? null,
    origem_id: (row.origem_id as string | null) ?? null,
    profissional_id: (row.profissional_id as string | null) ?? null,
    veiculo_id: (row.veiculo_id as string | null) ?? null,
    due_at: String(row.due_at).slice(0, 10),
    motivo: (row.motivo as string | null) ?? null,
    observacao: (row.observacao as string | null) ?? null,
    status: String(row.status ?? "previsto"),
    canal_preferido: (row.canal_preferido as string | null) ?? null,
    regra_origem: (row.regra_origem as string | null) ?? null,
    last_km: row.last_km == null ? null : Number(row.last_km),
    next_km: row.next_km == null ? null : Number(row.next_km),
    placa: (row.placa as string | null) ?? null,
    veiculo_label: (row.veiculo_label as string | null) ?? null,
    last_service_label: (row.last_service_label as string | null) ?? null,
    last_visit_at: row.last_visit_at
      ? String(row.last_visit_at).slice(0, 10)
      : null,
    estimated_value:
      row.estimated_value == null ? null : Number(row.estimated_value),
    hide_procedure: Boolean(row.hide_procedure),
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    contacted_at: (row.contacted_at as string | null) ?? null,
    responded_at: (row.responded_at as string | null) ?? null,
    appointment_id: (row.appointment_id as string | null) ?? null,
  };
}

export class CustomerReturnService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(filters?: {
    from?: string;
    to?: string;
    status?: string;
    profissionalId?: string;
    produtoId?: string;
    clienteId?: string;
  }): Promise<CustomerReturnRow[]> {
    let q = this.supabase
      .from("customer_returns" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .order("due_at", { ascending: true })
      .limit(400);
    if (filters?.from) q = q.gte("due_at", filters.from);
    if (filters?.to) q = q.lte("due_at", filters.to);
    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.profissionalId) q = q.eq("profissional_id", filters.profissionalId);
    if (filters?.produtoId) q = q.eq("produto_id", filters.produtoId);
    if (filters?.clienteId) q = q.eq("cliente_id", filters.clienteId);
    const { data, error } = await q;
    if (error) {
      if (isMissingRelation(error, "customer_returns")) return [];
      throw new Error(error.message);
    }
    return (data ?? []).map((row) => asReturn(row as Record<string, unknown>));
  }

  async listByCliente(clienteId: string): Promise<CustomerReturnRow[]> {
    return this.list({ clienteId });
  }

  async getById(id: string): Promise<CustomerReturnRow | null> {
    const { data, error } = await this.supabase
      .from("customer_returns" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error, "customer_returns")) return null;
      throw new Error(error.message);
    }
    return data ? asReturn(data as Record<string, unknown>) : null;
  }

  async create(
    input: CreateReturnInput,
    userId: string | null,
    todayCivil: string,
  ): Promise<CustomerReturnRow> {
    if (!input.clienteId) throw new Error("Cliente é obrigatório.");
    const dueAt = computeDueDate({
      fromCivilDate: input.fromCivilDate ?? todayCivil,
      rule: {
        intervalDays: input.intervalDays ?? null,
        intervalMonths: input.intervalMonths ?? null,
      },
      specificDate: input.specificDate ?? input.dueAt,
    });
    const nextKm = computeNextKm(input.lastKm ?? null, input.mileageKm ?? null);
    const payload = {
      tenant_id: this.tenantId,
      cliente_id: input.clienteId,
      produto_id: input.produtoId ?? null,
      origem_tipo: input.origemTipo ?? "manual",
      origem_id: input.origemId ?? null,
      profissional_id: input.profissionalId ?? null,
      veiculo_id: input.veiculoId ?? null,
      due_at: dueAt,
      motivo: input.motivo?.trim() || "Retorno recomendado",
      observacao: input.observacao?.trim() || null,
      status: classifyReturnDue({
        dueAt,
        todayCivil,
        status: "previsto",
      }),
      canal_preferido: input.canalPreferido ?? "whatsapp",
      regra_origem: input.regraOrigem ?? "manual",
      last_km: input.lastKm ?? null,
      next_km: nextKm,
      placa: input.placa ?? null,
      veiculo_label: input.veiculoLabel ?? null,
      last_service_label: input.lastServiceLabel ?? null,
      last_visit_at: input.lastVisitAt ?? todayCivil,
      estimated_value: input.estimatedValue ?? null,
      hide_procedure: Boolean(input.hideProcedure),
      created_by: userId,
    };
    const { data, error } = await this.supabase
      .from("customer_returns" as never)
      .insert(payload as never)
      .select("*")
      .single();
    if (error) {
      if (isMissingRelation(error, "customer_returns")) {
        throw new Error(
          "Tabela de retornos ainda não aplicada (migration 35.2 pendente).",
        );
      }
      throw new Error(error.message);
    }
    const row = asReturn(data as Record<string, unknown>);
    const timeline = new ClienteTimelineService(this.supabase, this.tenantId);
    await timeline.record({
      clienteId: input.clienteId,
      tipo: "retorno_criado",
      titulo: "Retorno previsto criado",
      descricao: `${row.motivo ?? "Retorno"} em ${row.due_at}`,
      referencia_tipo: "customer_return",
      referencia_id: row.id,
      payload: { due_at: row.due_at, status: row.status },
      userId,
    });
    return row;
  }

  async setStatus(
    id: string,
    status: ReturnStatus,
    userId: string | null,
    extra?: { appointmentId?: string | null },
  ): Promise<CustomerReturnRow> {
    const current = await this.getById(id);
    if (!current) throw new Error("Retorno não encontrado neste tenant.");
    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "contatado") patch.contacted_at = new Date().toISOString();
    if (status === "cliente_respondeu" || status === "cliente_respondeu_sim") {
      patch.responded_at = new Date().toISOString();
    }
    if (extra?.appointmentId) patch.appointment_id = extra.appointmentId;
    const { data, error } = await this.supabase
      .from("customer_returns" as never)
      .update(patch as never)
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const row = asReturn(data as Record<string, unknown>);
    const timeline = new ClienteTimelineService(this.supabase, this.tenantId);
    await timeline.record({
      clienteId: current.cliente_id,
      tipo: "retorno_status",
      titulo: `Retorno: ${status}`,
      descricao: current.motivo,
      referencia_tipo: "customer_return",
      referencia_id: id,
      payload: { from: current.status, to: status },
      userId,
    });
    return row;
  }
}

export async function createCustomerReturnService(tenantId: string) {
  const supabase = await createClient();
  return new CustomerReturnService(supabase, tenantId);
}
