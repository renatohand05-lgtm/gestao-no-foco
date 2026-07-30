import { CrmEnterpriseNavigation } from "@/components/crm/crm-enterprise-navigation";
import { PipelineConfigClient } from "@/components/crm/pipeline-config-client";
import { createCrmPipelineStageService } from "@/lib/crm/enterprise/pipeline-stage-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Pipeline CRM" };

export default async function CrmPipelinePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const svc = await createCrmPipelineStageService(tenant.id);
  const initial = await svc.listFromDatabase(null);

  return (
    <div className="space-y-6">
      <CrmEnterpriseNavigation tenantSlug={tenantSlug} active="crm/pipeline" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline comercial</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Etapas em <code>crm_pipeline_stages</code> (migration 20260812 aplicada).
          Sem fallback silencioso — seed explícito quando vazio.
        </p>
      </div>
      <PipelineConfigClient tenantSlug={tenantSlug} initial={initial} />
    </div>
  );
}
