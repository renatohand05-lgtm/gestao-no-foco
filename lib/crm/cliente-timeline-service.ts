import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { ClienteEvento } from "@/types/crm";

export class ClienteTimelineService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  async listByCliente(clienteId: string, limit = 50): Promise<ClienteEvento[]> {
    const { data, error } = await this.supabase
      .from("cliente_eventos" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (/cliente_eventos|schema cache|does not exist/i.test(error.message)) {
        return [];
      }
      throw new Error(error.message);
    }
    return (data ?? []) as ClienteEvento[];
  }

  async record(input: {
    clienteId: string;
    tipo: string;
    titulo: string;
    descricao?: string | null;
    referencia_tipo?: string | null;
    referencia_id?: string | null;
    payload?: Record<string, unknown>;
    userId?: string | null;
  }): Promise<void> {
    const { error } = await this.supabase.from("cliente_eventos" as never).insert({
      tenant_id: this.tenantId,
      cliente_id: input.clienteId,
      tipo: input.tipo,
      titulo: input.titulo,
      descricao: input.descricao ?? null,
      referencia_tipo: input.referencia_tipo ?? null,
      referencia_id: input.referencia_id ?? null,
      payload: input.payload ?? {},
      user_id: input.userId ?? null,
    } as never);

    if (error) throw new Error(error.message);
  }
}

export async function createClienteTimelineService(tenantId: string) {
  const supabase = await createClient();
  return new ClienteTimelineService(supabase, tenantId);
}
