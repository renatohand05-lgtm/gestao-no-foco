import { OsOpenForm } from "@/components/ordens/os-open-form";
import { OsSubnav } from "@/components/ordens/os-subnav";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { requireTenant } from "@/lib/tenants";

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
    <div className="space-y-6">
      <ModuleHeader
        title="Nova ordem de serviço"
        description="Identifique o cliente e o veículo — ou cadastre na hora"
        breadcrumbs={[
          { label: "Ordens", href: `/${tenantSlug}/ordens` },
          { label: "Nova" },
        ]}
      >
        <OsSubnav tenantSlug={tenantSlug} active="nova" />
      </ModuleHeader>
      {!canCreate ? (
        <p className="text-sm text-muted-foreground">
          Sem permissão para criar OS.
        </p>
      ) : (
        <SectionCard
          title="Abertura"
          description="Cliente existente, novo cliente ou busca por placa. Orçamento e peças vêm depois."
        >
          <OsOpenForm
            tenantSlug={tenantSlug}
            canForceDuplicate={canForceDuplicate}
          />
        </SectionCard>
      )}
    </div>
  );
}
