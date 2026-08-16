import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import { isMissingRelation } from "./schema-guard";
import type { CommunicationPreferenceRow } from "./types";

const DEFAULT_PREFS = {
  whatsapp_enabled: true,
  email_enabled: true,
  opted_out_at: null as string | null,
};

export class CommunicationPreferenceService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async get(clienteId: string): Promise<CommunicationPreferenceRow> {
    const { data, error } = await this.supabase
      .from("communication_preferences" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .maybeSingle();
    if (error && !isMissingRelation(error, "communication_preferences")) {
      throw new Error(error.message);
    }
    if (!data) {
      return {
        tenant_id: this.tenantId,
        cliente_id: clienteId,
        ...DEFAULT_PREFS,
      };
    }
    const row = data as Record<string, unknown>;
    return {
      tenant_id: this.tenantId,
      cliente_id: clienteId,
      whatsapp_enabled: row.whatsapp_enabled !== false,
      email_enabled: row.email_enabled !== false,
      opted_out_at: (row.opted_out_at as string | null) ?? null,
    };
  }

  async upsert(
    clienteId: string,
    patch: { whatsappEnabled?: boolean; emailEnabled?: boolean; optOut?: boolean },
  ): Promise<CommunicationPreferenceRow> {
    const current = await this.get(clienteId);
    const next = {
      tenant_id: this.tenantId,
      cliente_id: clienteId,
      whatsapp_enabled: patch.whatsappEnabled ?? current.whatsapp_enabled,
      email_enabled: patch.emailEnabled ?? current.email_enabled,
      opted_out_at: patch.optOut
        ? new Date().toISOString()
        : patch.optOut === false
          ? null
          : current.opted_out_at,
      updated_at: new Date().toISOString(),
    };
    if (next.opted_out_at) {
      next.whatsapp_enabled = false;
      next.email_enabled = false;
    }
    const { error } = await this.supabase
      .from("communication_preferences" as never)
      .upsert(next as never, { onConflict: "tenant_id,cliente_id" });
    if (error) {
      if (isMissingRelation(error, "communication_preferences")) {
        throw new Error("Preferências de comunicação pendentes (migration 35.2).");
      }
      throw new Error(error.message);
    }
    return {
      tenant_id: this.tenantId,
      cliente_id: clienteId,
      whatsapp_enabled: next.whatsapp_enabled,
      email_enabled: next.email_enabled,
      opted_out_at: next.opted_out_at,
    };
  }

  isChannelAllowed(
    prefs: CommunicationPreferenceRow,
    channel: "whatsapp" | "email",
  ): boolean {
    if (prefs.opted_out_at) return false;
    return channel === "whatsapp" ? prefs.whatsapp_enabled : prefs.email_enabled;
  }
}

export async function createCommunicationPreferenceService(tenantId: string) {
  const supabase = await createClient();
  return new CommunicationPreferenceService(supabase, tenantId);
}
