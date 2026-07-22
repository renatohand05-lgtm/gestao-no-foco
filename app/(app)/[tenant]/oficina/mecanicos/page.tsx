import Link from "next/link";

import { MecanicosManager } from "@/components/mecanicos/mecanicos-manager";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createMecanicoService } from "@/lib/mecanicos/mecanico-service";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Mecânicos" };

export default async function OficinaMecanicosPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  let canView =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["mecanicos.visualizar"] ?? true;
  let canCreate =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["mecanicos.criar"] ?? false;
  let canEdit =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["mecanicos.editar"] ?? false;
  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    canView = await perms.has("mecanicos.visualizar");
    canCreate = await perms.has("mecanicos.criar");
    canEdit = await perms.has("mecanicos.editar");
  } catch {
    /* ok */
  }

  if (!canView) {
    return <p className="text-sm text-muted-foreground">Sem permissão.</p>;
  }

  const service = await createMecanicoService(tenant.id);
  let mecanicos: Awaited<ReturnType<typeof service.list>> = [];
  let migrationPending = false;
  try {
    mecanicos = await service.list({ incluirArquivados: true });
  } catch (e) {
    migrationPending =
      e instanceof Error &&
      /relation.*does not exist|Could not find/i.test(e.message);
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Mecânicos"
        description="Cadastro, custos, disponibilidade e vínculo com OS"
        breadcrumbs={[
          { label: "Oficina", href: `/${tenantSlug}/ordens` },
          { label: "Mecânicos" },
        ]}
      >
        <Link
          href={`/${tenantSlug}/ordens/mecanicos`}
          className="text-sm underline"
        >
          Dashboard de produtividade
        </Link>
      </ModuleHeader>

      {migrationPending ? (
        <SectionCard title="Migration pendente">
          <p className="text-sm text-muted-foreground">
            Aplique{" "}
            <code className="text-xs">
              20260803_mecanicos_custo_os_dre.sql
            </code>{" "}
            no Supabase SQL Editor.
          </p>
        </SectionCard>
      ) : (
        <MecanicosManager
          tenantSlug={tenantSlug}
          mecanicos={mecanicos}
          canCreate={canCreate}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
