import { IntelligenceHistoryClient } from "@/components/import-engine/intelligence-history-client";
import {
  ExecutiveHeader,
  ExecutivePage,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { listImportRuns } from "@/lib/import-engine/intelligence/intelligence-actions";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Histórico de Importações" };

export default async function ImportHistoryPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  const runsR = await listImportRuns(tenantSlug, { limit: 100, offset: 0 });
  const runs = runsR.success ? runsR.items : [];
  const total = runsR.success ? runsR.total : 0;
  const tenantLabel = tenant.name || tenant.slug || tenantSlug;

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs
        items={[
          { label: "Integrações", href: `/${tenantSlug}/integracoes` },
          { label: "Histórico" },
        ]}
      />
      <ExecutiveHeader
        title="Histórico Enterprise"
        description="Listagem completa com filtros, auditoria, timeline e rollback — isolados por tenant."
      />
      <IntelligenceHistoryClient
        tenantSlug={tenantSlug}
        tenantLabel={tenantLabel}
        initialRuns={runs}
        total={total}
      />
    </ExecutivePage>
  );
}
