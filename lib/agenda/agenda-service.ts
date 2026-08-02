/**
 * Sprint 28.9 — CRUD Agenda Enterprise (`agenda_eventos`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildRecurrenceDates,
  detectAgendaConflicts,
  type AgendaInterval,
} from "@/lib/agenda/conflict";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

export const AGENDA_EVENT_STATUSES = [
  "agendado",
  "confirmado",
  "realizado",
  "cancelado",
  "reagendado",
] as const;

export type AgendaEventStatus = (typeof AGENDA_EVENT_STATUSES)[number];

export type AgendaEventRow =
  Database["public"]["Tables"]["agenda_eventos"]["Row"];

export type AgendaEventInput = {
  titulo: string;
  tipo?: string;
  inicio: string;
  fim: string;
  dia_inteiro?: boolean;
  responsavel_id?: string | null;
  recurso_id?: string | null;
  cliente_id?: string | null;
  ordem_servico_id?: string | null;
  venda_id?: string | null;
  observacao?: string | null;
  endereco?: string | null;
  filial_id?: string | null;
  empresa_id?: string | null;
  override_conflito?: boolean;
  override_justificativa?: string | null;
  recorrencia?: {
    frequency: "diaria" | "semanal" | "mensal";
    count: number;
  } | null;
};

const MAX_RECURRENCE = 52;

export class AgendaEventService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async listRange(fromIso: string, toIso: string): Promise<AgendaEventRow[]> {
    const { data, error } = await this.supabase
      .from("agenda_eventos")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("inicio", fromIso)
      .lte("inicio", toIso)
      .order("inicio", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getById(id: string): Promise<AgendaEventRow | null> {
    const { data, error } = await this.supabase
      .from("agenda_eventos")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async create(
    input: AgendaEventInput,
    userId: string | null,
  ): Promise<AgendaEventRow[]> {
    this.assertInterval(input.inicio, input.fim);
    await this.assertConflicts(input);

    const count = Math.min(
      Math.max(input.recorrencia?.count ?? 1, 1),
      MAX_RECURRENCE,
    );
    const dates =
      input.recorrencia && count > 1
        ? buildRecurrenceDates({
            start: input.inicio.slice(0, 10),
            frequency: input.recorrencia.frequency,
            count,
          })
        : [input.inicio.slice(0, 10)];

    const durationMs =
      Date.parse(input.fim) - Date.parse(input.inicio);
    const created: AgendaEventRow[] = [];

    for (const day of dates) {
      const startIso = this.combineDayTime(day, input.inicio);
      const endIso = new Date(Date.parse(startIso) + durationMs).toISOString();
      const row = await this.insertOne(
        {
          ...input,
          inicio: startIso,
          fim: endIso,
          recorrencia_json: input.recorrencia
            ? ({
                frequency: input.recorrencia.frequency,
                count,
                series_start: dates[0],
              } as Json)
            : null,
        },
        userId,
      );
      created.push(row);
    }
    return created;
  }

  async update(
    id: string,
    input: AgendaEventInput,
  ): Promise<AgendaEventRow> {
    this.assertInterval(input.inicio, input.fim);
    await this.assertConflicts({ ...input, id });

    const { data, error } = await this.supabase
      .from("agenda_eventos")
      .update({
        titulo: input.titulo.trim(),
        tipo: input.tipo?.trim() || "compromisso",
        inicio: input.inicio,
        fim: input.fim,
        dia_inteiro: Boolean(input.dia_inteiro),
        responsavel_id: input.responsavel_id || null,
        recurso_id: input.recurso_id || null,
        cliente_id: input.cliente_id || null,
        ordem_servico_id: input.ordem_servico_id || null,
        venda_id: input.venda_id || null,
        observacao: input.observacao?.trim() || null,
        endereco: input.endereco?.trim() || null,
        filial_id: input.filial_id || null,
        empresa_id: input.empresa_id || null,
        override_conflito: Boolean(input.override_conflito),
        override_justificativa: input.override_justificativa?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async reschedule(
    id: string,
    inicio: string,
    fim: string,
    override = false,
    justificativa?: string | null,
  ): Promise<AgendaEventRow> {
    const current = await this.getById(id);
    if (!current) throw new Error("Evento não encontrado neste tenant.");
    return this.update(id, {
      titulo: current.titulo,
      tipo: current.tipo,
      inicio,
      fim,
      dia_inteiro: current.dia_inteiro,
      responsavel_id: current.responsavel_id,
      recurso_id: current.recurso_id,
      cliente_id: current.cliente_id,
      ordem_servico_id: current.ordem_servico_id,
      venda_id: current.venda_id,
      observacao: current.observacao,
      endereco: current.endereco,
      filial_id: current.filial_id,
      empresa_id: current.empresa_id,
      override_conflito: override,
      override_justificativa: justificativa,
    }).then(async (row) => {
      await this.supabase
        .from("agenda_eventos")
        .update({ status: "reagendado" })
        .eq("id", row.id)
        .eq("tenant_id", this.tenantId);
      return { ...row, status: "reagendado" };
    });
  }

  async setStatus(id: string, status: AgendaEventStatus): Promise<AgendaEventRow> {
    const { data, error } = await this.supabase
      .from("agenda_eventos")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async cancel(id: string): Promise<AgendaEventRow> {
    return this.setStatus(id, "cancelado");
  }

  async duplicate(id: string, userId: string | null): Promise<AgendaEventRow> {
    const current = await this.getById(id);
    if (!current) throw new Error("Evento não encontrado neste tenant.");
    const start = Date.parse(current.inicio) + 24 * 60 * 60 * 1000;
    const end = Date.parse(current.fim) + 24 * 60 * 60 * 1000;
    const rows = await this.create(
      {
        titulo: `${current.titulo} (cópia)`,
        tipo: current.tipo,
        inicio: new Date(start).toISOString(),
        fim: new Date(end).toISOString(),
        dia_inteiro: current.dia_inteiro,
        responsavel_id: current.responsavel_id,
        recurso_id: current.recurso_id,
        cliente_id: current.cliente_id,
        observacao: current.observacao,
        endereco: current.endereco,
        filial_id: current.filial_id,
        empresa_id: current.empresa_id,
        override_conflito: true,
        override_justificativa: "Duplicação",
      },
      userId,
    );
    return rows[0]!;
  }

  async softDelete(id: string): Promise<void> {
    const current = await this.getById(id);
    if (!current) throw new Error("Evento não encontrado neste tenant.");
    if (current.status !== "cancelado" && current.status !== "agendado") {
      throw new Error("Cancele o evento antes de excluir, ou exclua apenas agendados.");
    }
    const { error } = await this.supabase
      .from("agenda_eventos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
  }

  private async insertOne(
    input: AgendaEventInput & { recorrencia_json?: Json | null },
    userId: string | null,
  ): Promise<AgendaEventRow> {
    const { data, error } = await this.supabase
      .from("agenda_eventos")
      .insert({
        tenant_id: this.tenantId,
        titulo: input.titulo.trim(),
        tipo: input.tipo?.trim() || "compromisso",
        status: "agendado",
        inicio: input.inicio,
        fim: input.fim,
        dia_inteiro: Boolean(input.dia_inteiro),
        responsavel_id: input.responsavel_id || null,
        recurso_id: input.recurso_id || null,
        cliente_id: input.cliente_id || null,
        ordem_servico_id: input.ordem_servico_id || null,
        venda_id: input.venda_id || null,
        observacao: input.observacao?.trim() || null,
        endereco: input.endereco?.trim() || null,
        filial_id: input.filial_id || null,
        empresa_id: input.empresa_id || null,
        override_conflito: Boolean(input.override_conflito),
        override_justificativa: input.override_justificativa?.trim() || null,
        recorrencia_json: input.recorrencia_json ?? null,
        created_by: userId,
        origem: "agenda_enterprise",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  private assertInterval(inicio: string, fim: string) {
    const s = Date.parse(inicio);
    const e = Date.parse(fim);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
      throw new Error("Intervalo inválido: fim deve ser posterior ao início.");
    }
  }

  private combineDayTime(day: string, refIso: string): string {
    const time = refIso.includes("T") ? refIso.slice(11) : "09:00:00.000Z";
    const normalized = time.endsWith("Z") || time.includes("+")
      ? time
      : `${time}${time.includes(".") ? "" : ".000"}Z`;
    return `${day}T${normalized.replace(/^(\d{2}:\d{2})(:\d{2})?/, (_, hm, sec) => `${hm}${sec ?? ":00"}`)}`;
  }

  private async assertConflicts(
    input: AgendaEventInput & { id?: string },
  ): Promise<void> {
    if (input.override_conflito) {
      if (!input.override_justificativa?.trim()) {
        throw new Error("Informe justificativa para sobrescrever conflito.");
      }
      return;
    }
    const windowStart = new Date(Date.parse(input.inicio) - 86400000).toISOString();
    const windowEnd = new Date(Date.parse(input.fim) + 86400000).toISOString();
    const existing = await this.listRange(windowStart, windowEnd);
    const candidate: AgendaInterval = {
      id: input.id,
      inicio: input.inicio,
      fim: input.fim,
      responsavelId: input.responsavel_id,
      recursoId: input.recurso_id,
    };
    const conflicts = detectAgendaConflicts(
      candidate,
      existing.map((e) => ({
        id: e.id,
        inicio: e.inicio,
        fim: e.fim,
        responsavelId: e.responsavel_id,
        recursoId: e.recurso_id,
      })),
    );
    const hard = conflicts.filter((c) => c.type !== "intervalo_invalido");
    if (hard.length > 0) {
      throw new Error(
        `Conflito de agenda detectado (${hard.map((c) => c.type).join(", ")}). Ajuste horário ou use override com justificativa.`,
      );
    }
  }
}

export async function createAgendaEventService(tenantId: string) {
  const supabase = await createClient();
  return new AgendaEventService(supabase, tenantId);
}
