import Link from "next/link";

import { ExecutiveCrmDashboard } from "@/components/crm/executive-crm-dashboard";
import { getExecutiveCrmDashboard } from "@/lib/crm/crm-enterprise-actions";
import { isCrmEnterpriseEnabled } from "@/lib/crm/crm-feature-flags";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "CRM Executivo Enterprise" };

export default async function CrmExecutivoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

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
    // Permissão conhecida → UI controlada (não mascara falhas de schema/query).
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
    <ExecutiveCrmDashboard tenantSlug={tenantSlug} initialBundle={bundle} />
  );
}
