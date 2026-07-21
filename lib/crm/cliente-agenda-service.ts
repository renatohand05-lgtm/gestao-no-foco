import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { ClienteAgendamento } from "@/types/crm";

export class ClienteAgendaService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  async listByCliente(clienteId: string): Promise<ClienteAgendamento[]> {
    const { data, error } = await this.supabase
      .from("cliente_agendamentos" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .is("deleted_at", null)
      .order("inicio", { ascending: true });

    if (error) {
      if (/cliente_agendamentos|schema cache|does not exist/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }
    return (data ?? []) as ClienteAgendamento[];
  }

  async listPeriodo(from: string, to: string): Promise<ClienteAgendamento[]> {
    const { data, error } = await this.supabase
      .from("cliente_agendamentos" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .gte("inicio", from)
      .lte("inicio", to)
      .order("inicio", { ascending: true });

    if (error) {
      if (/cliente_agendamentos|schema cache|does not exist/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }
    return (data ?? []) as ClienteAgendamento[];
  }

  async create(
    input: {
      cliente_id: string;
      titulo: string;
      descricao?: string | null;
      tipo?: string;
      inicio: string;
      fim?: string | null;
      local?: string | null;
      responsavel_id?: string | null;
    },
    userId: string | null,
  ): Promise<ClienteAgendamento> {
    const { data, error } = await this.supabase
      .from("cliente_agendamentos" as never)
      .insert({
        tenant_id: this.tenantId,
        cliente_id: input.cliente_id,
        titulo: input.titulo,
        descricao: input.descricao ?? null,
        tipo: input.tipo ?? "visita",
        inicio: input.inicio,
        fim: input.fim ?? null,
        local: input.local ?? null,
        responsavel_id: input.responsavel_id ?? null,
        created_by: userId,
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as ClienteAgendamento;
  }
}

export async function createClienteAgendaService(tenantId: string) {
  const supabase = await createClient();
  return new ClienteAgendaService(supabase, tenantId);
}
