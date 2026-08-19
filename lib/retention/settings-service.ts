import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import { isMissingColumn, isMissingRelation } from "./schema-guard";
import {
  DEFAULT_COMMUNICATION_SETTINGS,
  parseCommunicationSettings,
  settingsToRow,
  type CommunicationTenantSettings,
} from "./settings";

export class CommunicationSettingsService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async get(): Promise<CommunicationTenantSettings> {
    const { data, error } = await this.supabase
      .from("communication_tenant_settings" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .maybeSingle();
    if (error && !isMissingRelation(error, "communication_tenant_settings")) {
      throw new Error(error.message);
    }
    if (!data) return DEFAULT_COMMUNICATION_SETTINGS;
    return parseCommunicationSettings(data);
  }

  async upsert(
    patch: Partial<CommunicationTenantSettings>,
  ): Promise<CommunicationTenantSettings> {
    const current = await this.get();
    const next = { ...current, ...patch };
    const row = settingsToRow(this.tenantId, next);
    const { error } = await this.supabase
      .from("communication_tenant_settings" as never)
      .upsert(row as never, { onConflict: "tenant_id" });
    if (error) {
      if (isMissingRelation(error, "communication_tenant_settings")) {
        throw new Error("Configuração de comunicação pendente (migration 35.2.2).");
      }
      if (isMissingColumn(error)) {
        const lean = { ...row } as Record<string, unknown>;
        delete lean.send_appointment_confirmed;
        delete lean.send_budget_published;
        const retry = await this.supabase
          .from("communication_tenant_settings" as never)
          .upsert(lean as never, { onConflict: "tenant_id" });
        if (retry.error) throw new Error(retry.error.message);
        return next;
      }
      throw new Error(error.message);
    }
    return next;
  }
}

export async function createCommunicationSettingsService(tenantId: string) {
  const supabase = await createClient();
  return new CommunicationSettingsService(supabase, tenantId);
}
