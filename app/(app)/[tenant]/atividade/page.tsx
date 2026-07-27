import { ActivityTimelineClient } from "@/components/timeline/activity-timeline-client";
import { TimelineError } from "@/components/timeline/timeline-error";
import { ModuleHeader } from "@/components/layout/module-header";
import { listActivity } from "@/lib/timeline/actions";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Atividade" };

type SearchParams = {
  page?: string;
  limit?: string;
  module?: string;
  source?: string;
  status?: string;
  search?: string;
  entityType?: string;
  entityId?: string;
};

export default async function AtividadePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const tenant = await requireTenant(tenantSlug);

  const pageNum = Math.max(1, Number(sp.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.limit) || 25));
  const offset = (pageNum - 1) * limit;

  const filters = {
    module: sp.module ?? null,
    source: sp.source ?? null,
    status: sp.status ?? null,
    search: sp.search ?? null,
    entityType: sp.entityType ?? null,
    entityId: sp.entityId ?? null,
  };

  const result = await listActivity(tenantSlug, filters, {
    limit,
    offset,
    order: "desc",
  });

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Activity Timeline"
        description={`Eventos Enterprise · ${tenant.name}`}
        breadcrumbs={[
          { label: "Atividade", href: `/${tenantSlug}/atividade` },
        ]}
      />

      {!result.success ? (
        <TimelineError message={result.error} />
      ) : (
        <ActivityTimelineClient
          tenantSlug={tenantSlug}
          initialPage={result.page}
          initialKpis={result.kpis}
          initialFilters={filters}
        />
      )}
    </div>
  );
}
