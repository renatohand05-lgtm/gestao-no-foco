"use server";

import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export type KpiHistoryPoint = { date: string; value: number };

/**
 * Últimos N dias de um KPI específico, pra desenhar o mini-gráfico real
 * no card — vazio se ainda não tiver histórico suficiente (o cron
 * começou a rodar recentemente), nunca inventa ponto.
 */
export async function fetchKpiHistoryAction(
  tenantSlug: string,
  kpiId: string,
  days = 14,
): Promise<
  { success: true; data: KpiHistoryPoint[] } | { success: false; error: string }
> {
  try {
    const tenant = await requireTenant(tenantSlug);
    const client = await createClient();

    const { data, error } = await client
      .from("dashboard_kpi_daily_snapshots" as never)
      .select("snapshot_date, value")
      .eq("tenant_id", tenant.id)
      .eq("kpi_id", kpiId)
      .order("snapshot_date", { ascending: true })
      .limit(days);

    if (error) throw new Error(error.message);

    const points: KpiHistoryPoint[] = (
      (data ?? []) as unknown as Array<{ snapshot_date: string; value: number }>
    ).map((r) => ({ date: r.snapshot_date, value: r.value }));

    return { success: true, data: points };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Falha ao buscar histórico.",
    };
  }
}
