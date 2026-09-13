import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { DreService } from "@/lib/financeiro/dre-service";
import { loadExecutiveDashboardContext } from "@/lib/dashboard/executive-dashboard-context-service";
import { composeExecutiveFinancialCockpit } from "@/lib/dashboard/executive-financial-cockpit-service";

export type SnapshotOutcome = {
  processed: number;
  saved: number;
  failed: number;
};

function monthToDatePeriodo(now: Date) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const dataDe = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const dataAte = now.toISOString().slice(0, 10);
  return { dataDe, dataAte };
}

/**
 * Grava, pra cada tenant ativo, o valor de hoje de faturamento/lucro/caixa
 * — alimenta os mini-gráficos (sparklines) reais dos cards do dashboard.
 * Sempre valor real calculado agora, nunca inventado.
 */
export async function snapshotDailyKpisForAllTenants(
  admin: SupabaseClient,
  now = new Date(),
): Promise<SnapshotOutcome> {
  const { data: tenants, error } = await admin
    .from("tenants")
    .select("id")
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const snapshotDate = now.toISOString().slice(0, 10);
  const periodo = monthToDatePeriodo(now);
  let saved = 0;
  let failed = 0;

  for (const tenant of tenants ?? []) {
    try {
      const values: Array<{ kpiId: string; value: number }> = [];

      const dreService = new DreService(admin, tenant.id);
      const { resumo } = await dreService.getDre(periodo);
      if (resumo.receita_bruta != null) {
        values.push({ kpiId: "faturamento", value: resumo.receita_bruta });
      }
      if (resumo.resultado_final != null) {
        values.push({ kpiId: "lucro", value: resumo.resultado_final });
      }

      try {
        const execCtx = await loadExecutiveDashboardContext(tenant.id, "");
        const cockpit = composeExecutiveFinancialCockpit(execCtx);
        if (cockpit?.saldoAtual != null) {
          values.push({ kpiId: "caixa", value: cockpit.saldoAtual });
        }
      } catch {
        // Caixa é opcional — segue sem travar o snapshot do tenant.
      }

      if (values.length === 0) continue;

      const { error: upsertError } = await admin
        .from("dashboard_kpi_daily_snapshots" as never)
        .upsert(
          values.map((v) => ({
            tenant_id: tenant.id,
            kpi_id: v.kpiId,
            snapshot_date: snapshotDate,
            value: v.value,
          })) as never,
          { onConflict: "tenant_id,kpi_id,snapshot_date" },
        );

      if (upsertError) throw new Error(upsertError.message);
      saved += 1;
    } catch {
      failed += 1;
    }
  }

  return { processed: (tenants ?? []).length, saved, failed };
}
