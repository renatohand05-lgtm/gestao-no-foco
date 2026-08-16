import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import { EMPTY_RETURN_RULE, type ReturnRule } from "./returns";
import { isMissingRelation } from "./schema-guard";

export class ServiceReturnRuleService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async get(produtoId: string): Promise<ReturnRule> {
    const { data, error } = await this.supabase
      .from("service_return_rules" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("produto_id", produtoId)
      .maybeSingle();
    if (error) {
      if (isMissingRelation(error, "service_return_rules")) return { ...EMPTY_RETURN_RULE };
      throw new Error(error.message);
    }
    if (!data) return { ...EMPTY_RETURN_RULE };
    const row = data as Record<string, unknown>;
    return {
      returnEnabled: Boolean(row.return_enabled),
      returnType: (row.return_type as ReturnRule["returnType"]) ?? "data",
      intervalDays: row.interval_days == null ? null : Number(row.interval_days),
      intervalMonths:
        row.interval_months == null ? null : Number(row.interval_months),
      mileageKm: row.mileage_km == null ? null : Number(row.mileage_km),
      hideProcedure: Boolean(row.hide_procedure),
      messageTemplate: (row.message_template as string | null) ?? null,
    };
  }

  async upsert(produtoId: string, rule: ReturnRule): Promise<void> {
    const { error } = await this.supabase.from("service_return_rules" as never).upsert(
      {
        tenant_id: this.tenantId,
        produto_id: produtoId,
        return_enabled: rule.returnEnabled,
        return_type: rule.returnType,
        interval_days: rule.intervalDays,
        interval_months: rule.intervalMonths,
        mileage_km: rule.mileageKm,
        hide_procedure: rule.hideProcedure,
        message_template: rule.messageTemplate,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "tenant_id,produto_id" },
    );
    if (error) {
      if (isMissingRelation(error, "service_return_rules")) {
        throw new Error("Regras de retorno pendentes (migration 35.2).");
      }
      throw new Error(error.message);
    }
  }
}

export async function createServiceReturnRuleService(tenantId: string) {
  const supabase = await createClient();
  return new ServiceReturnRuleService(supabase, tenantId);
}
