import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { DreService, defaultDrePeriodo } from "@/lib/financeiro/dre-service";
import { formatCurrencyCompact } from "@/lib/format";
import { countUnreadForOwner } from "@/lib/support/support-service";
import type { TenantSegment } from "@/types";

export type MobileMasterCompany = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  segment: TenantSegment | null;
  faturamentoLabel: string;
  isActive: boolean;
};

export type MobileMasterDashboard = {
  role: "owner" | "partner";
  partnerName: string;
  companies: MobileMasterCompany[];
  totals: {
    faturamentoLabel: string;
    lucroLiquidoLabel: string;
    empresasAtivas: number;
    empresasTotal: number;
  };
  unreadSupportMessages: number;
};

/**
 * Resumo mobile do painel master — mesma fonte de dados do site
 * (platform_get_tenants_summary + DRE por empresa), só reempacotado pro
 * app. Retorna null se o usuário não for parceiro/dono da plataforma.
 */
export async function composeMasterDashboard(
  supabase: SupabaseClient,
  userId: string,
): Promise<MobileMasterDashboard | null> {
  const { data: partnerRow } = await supabase
    .from("platform_partners" as never)
    .select("role, name")
    .eq("user_id", userId)
    .maybeSingle<{ role: "owner" | "partner"; name: string }>();

  if (!partnerRow) return null;

  const { data: rows, error } = await supabase.rpc(
    "platform_get_tenants_summary" as never,
  );
  if (error) return null;

  const tenantRows = (rows ?? []) as Array<{
    tenant_id: string;
    tenant_name: string;
    tenant_slug: string;
    segment: string | null;
  }>;

  if (tenantRows.length === 0) {
    const unread =
      partnerRow.role === "owner" ? await countUnreadForOwner(supabase) : 0;
    return {
      role: partnerRow.role,
      partnerName: partnerRow.name,
      companies: [],
      totals: {
        faturamentoLabel: formatCurrencyCompact(0),
        lucroLiquidoLabel: formatCurrencyCompact(0),
        empresasAtivas: 0,
        empresasTotal: 0,
      },
      unreadSupportMessages: unread,
    };
  }

  const admin = createAdminClient();
  const periodo = defaultDrePeriodo();

  const computed = await Promise.all(
    tenantRows.map(async (row) => {
      try {
        const dreService = new DreService(admin, row.tenant_id);
        const { resumo } = await dreService.getDre(periodo);
        return {
          tenantId: row.tenant_id,
          tenantName: row.tenant_name,
          tenantSlug: row.tenant_slug,
          segment: (row.segment as TenantSegment | null) ?? null,
          faturamento: resumo.receita_bruta,
          lucroLiquido: resumo.resultado_final,
          isActive: resumo.receita_bruta > 0,
        };
      } catch {
        return {
          tenantId: row.tenant_id,
          tenantName: row.tenant_name,
          tenantSlug: row.tenant_slug,
          segment: (row.segment as TenantSegment | null) ?? null,
          faturamento: 0,
          lucroLiquido: 0,
          isActive: false,
        };
      }
    }),
  );

  const faturamentoTotal = computed.reduce((acc, t) => acc + t.faturamento, 0);
  const lucroTotal = computed.reduce((acc, t) => acc + t.lucroLiquido, 0);
  const ativos = computed.filter((t) => t.isActive).length;

  const companies: MobileMasterCompany[] = computed
    .sort((a, b) => b.faturamento - a.faturamento)
    .map((t) => ({
      tenantId: t.tenantId,
      tenantSlug: t.tenantSlug,
      tenantName: t.tenantName,
      segment: t.segment,
      faturamentoLabel: formatCurrencyCompact(t.faturamento),
      isActive: t.isActive,
    }));

  const unread =
    partnerRow.role === "owner" ? await countUnreadForOwner(supabase) : 0;

  return {
    role: partnerRow.role,
    partnerName: partnerRow.name,
    companies,
    totals: {
      faturamentoLabel: formatCurrencyCompact(faturamentoTotal),
      lucroLiquidoLabel: formatCurrencyCompact(lucroTotal),
      empresasAtivas: ativos,
      empresasTotal: computed.length,
    },
    unreadSupportMessages: unread,
  };
}
