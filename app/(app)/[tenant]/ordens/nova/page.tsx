import { OsOpenForm } from "@/components/ordens/os-open-form";
import { OsSubnav } from "@/components/ordens/os-subnav";
import { getSegmentUiCopy, osSubnavFromCopy } from "@/lib/segments/copy.ts";
import {
  attendanceOptionsForContext,
  defaultAttendanceType,
} from "@/lib/segments/attendance-types.ts";
import { resolveSegmentContext } from "@/lib/segments/resolve.ts";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { tryResolvePermissions } from "@/lib/permissoes/authorization";
import { createMecanicoService } from "@/lib/mecanicos/mecanico-service";
import { createProdutoService } from "@/lib/produtos/produto-service";
import { tenantHasMutationPermission } from "@/lib/rbac/mutation-auth";
import { serviceSuggestionsForContext } from "@/lib/segments/catalogs/suggest.ts";
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
  const ctx = resolveSegmentContext({
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
  const [servicosRes, canCreateProduto, mecanicos] = canCreate
    ? await Promise.all([
        createProdutoService(tenant.id).then((s) =>
          s.list({ tipo: "servico", perPage: 100, ativo: true }),
        ),
        tenantHasMutationPermission(tenantSlug, "produtos.criar"),
        ui.automotiveWorkflow
          ? createMecanicoService(tenant.id).then((s) => s.listDisponiveis())
          : Promise.resolve([]),
      ])
    : [null, false, []];

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
          description={ui.openFormSectionDescription}
          panel
        >
          <OsOpenForm
            tenantSlug={tenantSlug}
            canForceDuplicate={canForceDuplicate}
            operationTypeLabel={ui.operationTypeLabel}
            openCta={ui.openWorkOrderCta}
            openingLabel={`Abrindo ${ui.workOrder.toLowerCase()}…`}
            attendanceOptions={attendanceOptionsForContext(ctx)}
            defaultAttendanceType={defaultAttendanceType(ctx)}
            compactVehicleVitals={ui.compactVehicleVitals}
            showVehicles={ui.showVehicles}
            servicos={(servicosRes?.data ?? []).map((s) => ({
              id: s.id,
              label: s.nome,
              minutes: s.tempo_estimado_minutos ?? null,
            }))}
            library={serviceSuggestionsForContext(ctx, { includeCombos: false })}
            canCreateProduto={canCreateProduto}
            showMechanic={ui.automotiveWorkflow}
            profissionais={mecanicos.map((m) => ({
              id: m.id,
              label: m.nome_completo,
            }))}
          />
        </ExecutiveSection>
      )}
    </ExecutivePage>
  );
}
