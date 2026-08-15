import { PageHeader } from "@/components/ui/page-header";
import { SegmentModulesForm } from "@/components/configuracoes/segment-modules-form";
import { listProductOnboardingSegments } from "@/config/onboarding/segments";
import { listSegmentModuleRows } from "@/lib/segments/matrix.ts";
import { requireTenant } from "@/lib/tenants";
import type { ProductSegmentId } from "@/lib/segments/types.ts";

export const metadata = { title: "Módulos" };

export default async function ModulosPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const canEdit = tenant.role === "owner" || tenant.role === "admin";
  const rows = listSegmentModuleRows({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  const segmentOptions = listProductOnboardingSegments().map((s) => ({
    id: s.id as ProductSegmentId,
    label: s.label,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personalizar experiência"
        description="Ligue ou desligue módulos. Segmento é um preset, não uma prisão. Permissões RBAC continuam valendo."
      />
      <SegmentModulesForm
        tenantSlug={tenantSlug}
        canEdit={canEdit}
        legacy={tenant.segment_version == null}
        currentSegment={tenant.segment}
        segmentOptions={segmentOptions}
        rows={rows}
      />
    </div>
  );
}
