/**
 * Sprint 24.1 — Oportunidades vinculadas a clientes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type {
  CrmOportunidadeRow,
  CrmOportunidadeStatus,
  CrmStageMovementRow,
} from "@/types/crm-enterprise";

import {
  assertCrmTenantMatch,
  validateOportunidadeTransition,
} from "./filter-engine.ts";

export type OportunidadeInput = {
  cliente_id: string;
  titulo: string;
  stage_key?: string;
  valor_estimado?: number | null;
  probabilidade?: number | null;
  data_prevista?: string | null;
  data_fechamento?: string | null;
  origem?: string | null;
  responsavel_id?: string | null;
  produto_servico?: string | null;
  empresa_id?: string | null;
  filial_id?: string | null;
  status?: CrmOportunidadeStatus;
  motivo_perda?: string | null;
};

export class CrmOportunidadeService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  async listByCliente(clienteId: string): Promise<CrmOportunidadeRow[]> {
    await this.assertCliente(clienteId);
    const { data, error } = await this.supabase
      .from("crm_oportunidades" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Falha ao ler crm_oportunidades: ${error.message}`);
    }
    return (data ?? []) as CrmOportunidadeRow[];
  }

  async create(
    input: OportunidadeInput,
    userId: string | null,
  ): Promise<CrmOportunidadeRow> {
    await this.assertCliente(input.cliente_id);
    const status = input.status ?? "aberta";
    const check = validateOportunidadeTransition({
      status,
      valorEstimado: input.valor_estimado,
      probabilidade: input.probabilidade,
      dataFechamento: input.data_fechamento,
      motivoPerda: input.motivo_perda,
    });
    if (!check.ok) throw new Error(check.error);

    const stage = input.stage_key?.trim() || "lead";
    const { data, error } = await this.supabase
      .from("crm_oportunidades" as never)
      .insert({
        tenant_id: this.tenantId,
        cliente_id: input.cliente_id,
        titulo: input.titulo.trim(),
        stage_key: stage,
        valor_estimado: input.valor_estimado ?? null,
        probabilidade: input.probabilidade ?? null,
        data_prevista: input.data_prevista ?? null,
        data_fechamento: input.data_fechamento ?? null,
        origem: input.origem?.trim() || null,
        responsavel_id: input.responsavel_id || null,
        produto_servico: input.produto_servico?.trim() || null,
        empresa_id: input.empresa_id || null,
        filial_id: input.filial_id || null,
        status,
        motivo_perda: input.motivo_perda?.trim() || null,
        created_by: userId,
        updated_by: userId,
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const row = data as CrmOportunidadeRow;
    assertCrmTenantMatch(this.tenantId, row.tenant_id, "oportunidade.create");
    await this.recordMovement({
      oportunidadeId: row.id,
      clienteId: row.cliente_id,
      fromStage: null,
      toStage: stage,
      userId,
      motivo: "criação",
    });
    return row;
  }

  async moveStage(args: {
    oportunidadeId: string;
    toStage: string;
    status?: CrmOportunidadeStatus;
    motivoPerda?: string | null;
    dataFechamento?: string | null;
    userId: string | null;
  }): Promise<CrmOportunidadeRow> {
    const current = await this.getById(args.oportunidadeId);
    const status =
      args.status ??
      (args.toStage === "fechado"
        ? "ganha"
        : args.toStage === "perdido"
          ? "perdida"
          : current.status);

    const check = validateOportunidadeTransition({
      status,
      valorEstimado: current.valor_estimado,
      probabilidade: current.probabilidade,
      dataFechamento:
        args.dataFechamento ??
        current.data_fechamento ??
        (status === "ganha" ? new Date().toISOString().slice(0, 10) : null),
      motivoPerda: args.motivoPerda ?? current.motivo_perda,
    });
    if (!check.ok) throw new Error(check.error);

    const { data, error } = await this.supabase
      .from("crm_oportunidades" as never)
      .update({
        stage_key: args.toStage,
        status,
        motivo_perda:
          status === "perdida"
            ? (args.motivoPerda ?? current.motivo_perda)
            : current.motivo_perda,
        data_fechamento:
          status === "ganha" || status === "perdida"
            ? (args.dataFechamento ??
              current.data_fechamento ??
              new Date().toISOString().slice(0, 10))
            : current.data_fechamento,
        updated_by: args.userId,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", args.oportunidadeId)
      .eq("tenant_id", this.tenantId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const row = data as CrmOportunidadeRow;
    await this.recordMovement({
      oportunidadeId: row.id,
      clienteId: row.cliente_id,
      fromStage: current.stage_key,
      toStage: args.toStage,
      userId: args.userId,
      motivo: status === "perdida" ? args.motivoPerda ?? null : null,
    });
    return row;
  }

  async listMovements(oportunidadeId: string): Promise<CrmStageMovementRow[]> {
    await this.getById(oportunidadeId);
    const { data, error } = await this.supabase
      .from("crm_stage_movements" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("oportunidade_id", oportunidadeId)
      .order("created_at", { ascending: false });
    if (error) {
      throw new Error(`Falha ao ler crm_stage_movements: ${error.message}`);
    }
    return (data ?? []) as CrmStageMovementRow[];
  }

  private async getById(id: string): Promise<CrmOportunidadeRow> {
    const { data, error } = await this.supabase
      .from("crm_oportunidades" as never)
      .select("*")
      .eq("id", id)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Oportunidade não encontrada.");
    const row = data as CrmOportunidadeRow;
    assertCrmTenantMatch(this.tenantId, row.tenant_id, "oportunidade.get");
    return row;
  }

  private async recordMovement(args: {
    oportunidadeId: string;
    clienteId: string;
    fromStage: string | null;
    toStage: string;
    userId: string | null;
    motivo: string | null;
  }) {
    await this.supabase.from("crm_stage_movements" as never).insert({
      tenant_id: this.tenantId,
      oportunidade_id: args.oportunidadeId,
      cliente_id: args.clienteId,
      from_stage: args.fromStage,
      to_stage: args.toStage,
      user_id: args.userId,
      motivo: args.motivo,
    } as never);
  }

  private async assertCliente(clienteId: string) {
    const { data, error } = await this.supabase
      .from("clientes")
      .select("id, tenant_id")
      .eq("id", clienteId)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Cliente não encontrado neste tenant.");
  }
}

export async function createCrmOportunidadeService(tenantId: string) {
  const supabase = await createClient();
  return new CrmOportunidadeService(supabase, tenantId);
}
