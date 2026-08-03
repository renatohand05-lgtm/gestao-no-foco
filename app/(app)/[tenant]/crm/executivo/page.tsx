import Link from "next/link";

import { ExecutiveCrmDashboardLazy } from "@/components/crm/executive-crm-dashboard-lazy";
import { CrmPremiumDashboardView } from "@/components/crm/premium/crm-premium-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { getExecutiveCrmDashboard } from "@/lib/crm/crm-enterprise-actions";
import { isCrmEnterpriseEnabled } from "@/lib/crm/crm-feature-flags";
import { getCachedCrmPremiumDashboard } from "@/lib/crm/premium";
import {
  civilDateInTimezone,
  DEFAULT_TENANT_TIMEZONE,
} from "@/lib/dashboard/tenant-timezone";
import { requireTenant } from "@/lib/tenants";
import { Suspense } from "react";

export const metadata = { title: "CRM Executivo Enterprise" };

async function PremiumBlock({
  tenantId,
  tenantSlug,
}: {
  tenantId: string;
  tenantSlug: string;
}) {
  const hoje = civilDateInTimezone(new Date(), DEFAULT_TENANT_TIMEZONE);
  const premium = await getCachedCrmPremiumDashboard(tenantId, hoje);
  return <CrmPremiumDashboardView tenantSlug={tenantSlug} data={premium} />;
}

export default async function CrmExecutivoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  if (!isCrmEnterpriseEnabled()) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        CRM Enterprise desabilitado por feature flag.
      </p>
    );
  }

  let bundle: Awaited<ReturnType<typeof getExecutiveCrmDashboard>> | null = null;
  let denyMessage: string | null = null;

  try {
    bundle = await getExecutiveCrmDashboard(tenantSlug);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no CRM.";
    if (/sem permissão|sessão ausente|desabilitado/i.test(message)) {
      if (process.env.NODE_ENV === "development") {
        console.error(
          JSON.stringify({
            level: "error",
            message: "crm_executivo_denied",
            at: new Date().toISOString(),
            context: { tenantSlug, reason: message },
          }),
        );
      }
      denyMessage = message;
    } else {
      throw error;
    }
  }

  if (denyMessage) {
    return (
      <div className="space-y-4 p-6" role="alert">
        <h1 className="text-lg font-semibold">CRM Enterprise</h1>
        <p className="text-sm text-muted-foreground">{denyMessage}</p>
        <Link
          href={`/${tenantSlug}/dashboard`}
          className="inline-flex h-9 items-center rounded-md border px-4 text-sm"
        >
          Voltar ao dashboard
        </Link>
      </div>
    );
  }

  if (!bundle) {
    throw new Error("Falha ao carregar CRM Enterprise.");
  }

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <Suspense
        fallback={
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        }
      >
        <PremiumBlock tenantId={tenant.id} tenantSlug={tenantSlug} />
      </Suspense>

      <section aria-label="CRM Enterprise legado" className="border-t pt-6">
        <ExecutiveCrmDashboardLazy
          tenantSlug={tenantSlug}
          initialBundle={bundle}
        />
      </section>
    </div>
  );
}
