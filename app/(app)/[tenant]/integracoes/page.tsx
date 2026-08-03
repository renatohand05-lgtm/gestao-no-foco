import { Suspense } from "react";

import { IntegrationHubView } from "@/components/integracoes/integration-hub-view";
import { Skeleton } from "@/components/ui/skeleton";
import { getIntegrationHubAction } from "@/lib/integracoes/actions";
import { requireIntegracoesAccess } from "@/lib/integracoes/page-auth";

export const metadata = {
  title: "Integration Hub",
  description: "Integration Hub Enterprise — arquitetura sem I/O externo",
};

/**
 * Sprint 30.8 — Integration Hub na rota canônica /integracoes.
 * Importação de arquivos permanece em /integracoes/importar.
 */
export default async function IntegracoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  // RBAC + tenant isolation (requireTenant via page-auth)
  await requireIntegracoesAccess(tenantSlug);
  const res = await getIntegrationHubAction(tenantSlug);

  if (!res.success) {
    return (
      <div className="space-y-4 p-4 sm:p-6" data-integration-hub="error">
        <h1 className="text-xl font-semibold">Integration Hub Enterprise</h1>
        <p className="text-sm text-destructive" role="alert">
          {res.error}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <Suspense
        fallback={
          <Skeleton
            className="h-96 w-full"
            aria-busy="true"
            data-integration-hub-loading=""
          />
        }
      >
        <IntegrationHubView tenantSlug={tenantSlug} snapshot={res.snapshot} />
      </Suspense>
    </div>
  );
}
