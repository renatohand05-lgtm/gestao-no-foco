import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DreService, defaultDrePeriodo } from "@/lib/financeiro/dre-service";
import type { TenantSegment } from "@/types";

export type PlatformRole = "owner" | "partner";

export type PlatformTenantSummary = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  segment: TenantSegment | null;
  faturamento: number;
  lucroLiquido: number;
  isActive: boolean;
};

export type PlatformAccess = {
  role: PlatformRole;
  partnerName: string;
  tenants: PlatformTenantSummary[];
  totals: {
    faturamento: number;
    lucroLiquido: number;
    ticketMedio: number;
    empresasAtivas: number;
    empresasInativas: number;
  };
};

type PlatformTenantRow = {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  segment: string | null;
  referred_by_partner_id: string | null;
  created_at: string;
};

/**
 * Retorna o acesso do usuário logado ao painel de plataforma (dono/associado),
 * ou `null` se ele não estiver cadastrado em platform_partners — nesse caso a
 * página deve mostrar acesso negado, nunca dados de nenhuma empresa.
 *
 * A autorização acontece dentro da função do banco (SECURITY DEFINER), usando
 * a sessão do usuário — o filtro "quais empresas ele pode ver" nunca depende
 * de nada vindo da tela.
 */
export async function getPlatformAccess(): Promise<PlatformAccess | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: partnerRow } = await supabase
    .from("platform_partners" as never)
    .select("role, name")
    .eq("user_id", user.id)
    .maybeSingle<{ role: PlatformRole; name: string }>();

  if (!partnerRow) return null;

  const { data: rows, error } = await supabase.rpc(
    "platform_get_tenants_summary" as never,
  );

  if (error) return null;

  const tenantRows = (rows ?? []) as PlatformTenantRow[];

  if (tenantRows.length === 0) {
    return {
      role: partnerRow.role,
      partnerName: partnerRow.name,
      tenants: [],
      totals: {
        faturamento: 0,
        lucroLiquido: 0,
        ticketMedio: 0,
        empresasAtivas: 0,
        empresasInativas: 0,
      },
    };
  }

  // Financeiro por empresa: usamos o cliente admin (service role) só aqui,
  // e só depois de já termos confirmado a autorização acima via RPC do banco.
  const admin = createAdminClient();
  const periodo = defaultDrePeriodo();

  const tenants = await Promise.all(
    tenantRows.map(async (row): Promise<PlatformTenantSummary> => {
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

  const faturamentoTotal = tenants.reduce((acc, t) => acc + t.faturamento, 0);
  const lucroTotal = tenants.reduce((acc, t) => acc + t.lucroLiquido, 0);
  const ativos = tenants.filter((t) => t.isActive).length;

  return {
    role: partnerRow.role,
    partnerName: partnerRow.name,
    tenants: tenants.sort((a, b) => b.faturamento - a.faturamento),
    totals: {
      faturamento: faturamentoTotal,
      lucroLiquido: lucroTotal,
      ticketMedio: tenants.length > 0 ? faturamentoTotal / tenants.length : 0,
      empresasAtivas: ativos,
      empresasInativas: tenants.length - ativos,
    },
  };
}

export type PlatformBillingRow = {
  tenantId: string;
  tenantName: string;
  planName: string | null;
  amountCents: number | null;
  status: string | null;
  isPilot: boolean;
};

export type PlatformBillingSummary = {
  rows: PlatformBillingRow[];
  /** Soma mensal (MRR) considerando só assinaturas ativas e pagas (não-piloto). */
  mrrCents: number;
  assinaturasAtivas: number;
};

/**
 * Quanto cada empresa paga pela sua consultoria/assinatura.
 * Restrito ao dono da plataforma — nunca chamar para um associado (partner),
 * mesmo que ele tenha acesso às empresas: esse valor é informação sua, não dele.
 */
export async function getPlatformBillingSummary(
  access: PlatformAccess,
): Promise<PlatformBillingSummary | null> {
  if (access.role !== "owner") return null;
  if (access.tenants.length === 0) {
    return { rows: [], mrrCents: 0, assinaturasAtivas: 0 };
  }

  const admin = createAdminClient();
  const tenantIds = access.tenants.map((t) => t.tenantId);

  const { data: subs } = await admin
    .from("billing_subscriptions" as never)
    .select("tenant_id, plan_id, status")
    .in("tenant_id", tenantIds)
    .returns
      { tenant_id: string; plan_id: string | null; status: string | null }[]
    >();

  const subscriptions = subs ?? [];
  const planIds = [
    ...new Set(subscriptions.map((s) => s.plan_id).filter(Boolean)),
  ] as string[];

  const { data: plansData } =
    planIds.length > 0
      ? await admin
          .from("billing_plans" as never)
          .select("id, name, amount_cents, is_pilot")
          .in("id", planIds)
          .returns
            {
              id: string;
              name: string;
              amount_cents: number | null;
              is_pilot: boolean;
            }[]
          >()
      : { data: [] };

  const plansById = new Map((plansData ?? []).map((p) => [p.id, p]));
  const tenantNameById = new Map(
    access.tenants.map((t) => [t.tenantId, t.tenantName]),
  );

  const rows: PlatformBillingRow[] = subscriptions.map((sub) => {
    const plan = sub.plan_id ? plansById.get(sub.plan_id) : undefined;
    return {
      tenantId: sub.tenant_id,
      tenantName: tenantNameById.get(sub.tenant_id) ?? "—",
      planName: plan?.name ?? null,
      amountCents: plan?.amount_cents ?? null,
      status: sub.status,
      isPilot: plan?.is_pilot ?? false,
    };
  });

  const mrrCents = rows
    .filter((r) => r.status === "active" && !r.isPilot && r.amountCents)
    .reduce((acc, r) => acc + (r.amountCents ?? 0), 0);

  const assinaturasAtivas = rows.filter((r) => r.status === "active").length;

  return { rows, mrrCents, assinaturasAtivas };
}
