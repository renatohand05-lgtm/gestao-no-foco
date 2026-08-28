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
 * Checagem "leve": só confirma se o usuário é dono/associado da plataforma,
 * sem calcular faturamento/lucro de nenhuma empresa. Usada em lugares que
 * rodam em TODA navegação (como o layout do tenant), onde a versão completa
 * (getPlatformAccess) seria cara demais — recalcularia o DRE de todas as
 * empresas só pra mostrar um link no menu.
 */
export async function isPlatformPartner(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: partnerRow } = await supabase
    .from("platform_partners" as never)
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return Boolean(partnerRow);
}

/**
 * Retorna o acesso do usuário logado ao painel de plataforma (dono/associado),
 * ou `null` se ele não estiver cadastrado em platform_partners — nesse caso a
 * página deve mostrar acesso negado, nunca dados de nenhuma empresa.
 *
 * A autorização acontece dentro da função do banco (SECURITY DEFINER), usando
 * a sessão do usuário — o filtro "quais empresas ele pode ver" nunca depende
 * de nada vindo da tela.
 *
 * Custo: calcula o DRE de cada empresa visível — use só quando for realmente
 * mostrar esses números (ex: dashboard, painel do dono). Para só saber "é
 * dono/associado?" (ex: mostrar um link no menu), use isPlatformPartner().
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
 * Quanto cada empresa (que o chamador pode ver) paga de assinatura/plano.
 * Já vem naturalmente restrito: `access.tenants` é preenchido por
 * getPlatformAccess() com todas as empresas (dono) ou só as indicadas
 * (associado) — nunca inclui empresas de fora do escopo do chamador.
 */
export async function getPlatformBillingSummary(
  access: PlatformAccess,
): Promise<PlatformBillingSummary | null> {
  if (access.tenants.length === 0) {
    return { rows: [], mrrCents: 0, assinaturasAtivas: 0 };
  }

  const admin = createAdminClient();
  const tenantIds = access.tenants.map((t) => t.tenantId);

  const { data: subs } = await admin
    .from("billing_subscriptions" as never)
    .select("tenant_id, plan_id, status");

  const subscriptions = (subs ?? []) as {
    tenant_id: string;
    plan_id: string | null;
    status: string | null;
  }[];
  const filteredSubscriptions = subscriptions.filter((s) =>
    tenantIds.includes(s.tenant_id),
  );
  const planIds = [
    ...new Set(filteredSubscriptions.map((s) => s.plan_id).filter(Boolean)),
  ] as string[];

  const { data: plansData } =
    planIds.length > 0
      ? await admin
          .from("billing_plans" as never)
          .select("id, name, amount_cents, is_pilot")
          .in("id", planIds)
      : { data: [] };

  const plans = (plansData ?? []) as {
    id: string;
    name: string;
    amount_cents: number | null;
    is_pilot: boolean;
  }[];

  const plansById = new Map(plans.map((p) => [p.id, p]));
  const tenantNameById = new Map(
    access.tenants.map((t) => [t.tenantId, t.tenantName]),
  );

  const rows: PlatformBillingRow[] = filteredSubscriptions.map((sub) => {
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

/**
 * Confirma que o usuário logado tem autorização de plataforma sobre a
 * empresa `tenantId` (é o dono, ou é o associado que a indicou), e devolve
 * o resumo dela. Retorna `null` se não tiver — nunca lança exceção com
 * detalhes que ajudem a "adivinhar" outra empresa.
 */
export async function getAuthorizedPlatformTenant(
  tenantId: string,
): Promise<{ access: PlatformAccess; tenant: PlatformTenantSummary } | null> {
  const access = await getPlatformAccess();
  if (!access) return null;

  const tenant = access.tenants.find((t) => t.tenantId === tenantId);
  if (!tenant) return null;

  return { access, tenant };
}
