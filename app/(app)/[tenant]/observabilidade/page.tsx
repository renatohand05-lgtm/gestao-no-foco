import { ObservabilityClient } from "@/components/observability/observability-client";
import { ModuleHeader } from "@/components/layout/module-header";
import { getObservabilitySnapshot } from "@/lib/observability/actions";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Observabilidade" };

type SearchParams = {
  service?: string;
  module?: string;
  status?: string;
  severity?: string;
};

export default async function ObservabilidadePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const tenant = await requireTenant(tenantSlug);

  const filters = {
    service: sp.service ?? null,
    module: sp.module ?? null,
    status: sp.status ?? null,
    severity: (sp.severity as
      | "info"
      | "low"
      | "medium"
      | "high"
      | "critical"
      | undefined) ?? null,
  };

  const result = await getObservabilitySnapshot(tenantSlug, filters);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Enterprise Observability"
        description={`Saúde e métricas · ${tenant.name}`}
        breadcrumbs={[
          { label: "Observabilidade", href: `/${tenantSlug}/observabilidade` },
        ]}
      />

      {!result.success ? (
        <p className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-700">
          {result.error}
        </p>
      ) : (
        <ObservabilityClient
          tenantSlug={tenantSlug}
          initial={result.snapshot}
          initialFilters={filters}
        />
      )}
    </div>
  );
}
