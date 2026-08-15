import { OsOpenForm } from "@/components/ordens/os-open-form";
import { OsSubnav } from "@/components/ordens/os-subnav";
import { getSegmentUiCopy, osSubnavFromCopy } from "@/lib/segments/copy.ts";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { tryResolvePermissions } from "@/lib/permissoes/authorization";
import { requireTenant } from "@/lib/tenants";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const ui = getSegmentUiCopy({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  return { title: ui.newWorkOrder };
}

export default async function NovaOsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const ui = getSegmentUiCopy({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  const subnav = osSubnavFromCopy(ui);

  let canForceDuplicate =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.criar_cliente_forcado"];
  let canCreate = DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.criar"];
  const novaPerms = await tryResolvePermissions(tenant.id, tenant.role, [
    "os.criar_cliente_forcado",
    "os.criar",
  ]);
  canForceDuplicate = novaPerms["os.criar_cliente_forcado"];
  canCreate = novaPerms["os.criar"];

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: ui.workOrders, href: `/${tenantSlug}/ordens` },
          { label: ui.newWorkOrder },
        ]} />
      <ExecutiveHeader title={ui.newWorkOrder} description={ui.newWorkOrderDescription} actions={<OsSubnav tenantSlug={tenantSlug} active="nova" copy={subnav} />} />
      {!canCreate ? (
        <p className="text-sm text-muted-foreground">
          Sem permissão para criar {ui.workOrder.toLowerCase()}.
        </p>
      ) : (
        <ExecutiveSection
          title="Abertura"
          description="Cliente existente, novo cliente ou busca por placa. Orçamento e peças vêm depois."
          panel
        >
          <OsOpenForm
            tenantSlug={tenantSlug}
            canForceDuplicate={canForceDuplicate}
          />
        </ExecutiveSection>
      )}
    </ExecutivePage>
  );
}
