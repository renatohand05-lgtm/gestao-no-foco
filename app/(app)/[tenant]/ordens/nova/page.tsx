import { OsOpenForm } from "@/components/ordens/os-open-form";
import { OsSubnav } from "@/components/ordens/os-subnav";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { requireTenant } from "@/lib/tenants";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "Nova OS" };

export default async function NovaOsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  let canForceDuplicate =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.criar_cliente_forcado"];
  let canCreate = DEFAULT_ROLE_PERMISSIONS[tenant.role]["os.criar"];
  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    canForceDuplicate = await perms.has("os.criar_cliente_forcado");
    canCreate = await perms.has("os.criar");
  } catch {
    /* tabela pode não existir ainda */
  }

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Ordens", href: `/${tenantSlug}/ordens` },
          { label: "Nova" },
        ]} />
      <ExecutiveHeader title="Nova ordem de serviço" description="Identifique o cliente e o veículo — ou cadastre na hora" actions={<OsSubnav tenantSlug={tenantSlug} active="nova" />} />
      {!canCreate ? (
        <p className="text-sm text-muted-foreground">
          Sem permissão para criar OS.
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
