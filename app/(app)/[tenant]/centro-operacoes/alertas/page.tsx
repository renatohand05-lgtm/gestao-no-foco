import Link from "next/link";

import { ModuleHeader } from "@/components/layout/module-header";
import { AlertasManager } from "@/components/operacoes/alertas-manager";
import { SectionCard } from "@/components/ui/section-card";
import { createAlertasOperacionaisService } from "@/lib/operacoes/alertas-service";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Alertas operacionais" };

export default async function AlertasOperacionaisPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ tratados?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const tenant = await requireTenant(tenantSlug);

  let canView =
    DEFAULT_ROLE_PERMISSIONS[tenant.role]["centro_operacoes.ver_alertas"] ??
    true;
  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    canView = await perms.has("centro_operacoes.ver_alertas");
  } catch {
    /* ok */
  }

  if (!canView) {
    return (
      <p className="text-sm text-muted-foreground">Sem permissão.</p>
    );
  }

  const service = await createAlertasOperacionaisService(tenant.id, tenantSlug);
  const alertas = await service.syncAndList({
    incluirTratados: sp.tratados === "1",
  });

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Alertas operacionais"
        description="Alertas persistidos com tratamento e histórico"
        breadcrumbs={[
          {
            label: "Centro de Operações",
            href: `/${tenantSlug}/centro-operacoes`,
          },
          { label: "Alertas" },
        ]}
      >
        <div className="flex gap-3 text-sm">
          <Link href={`/${tenantSlug}/centro-operacoes`} className="underline">
            Voltar
          </Link>
          <Link
            href={
              sp.tratados === "1"
                ? `/${tenantSlug}/centro-operacoes/alertas`
                : `/${tenantSlug}/centro-operacoes/alertas?tratados=1`
            }
            className="underline"
          >
            {sp.tratados === "1" ? "Só abertos" : "Incluir tratados"}
          </Link>
        </div>
      </ModuleHeader>

      <SectionCard title="Central de alertas">
        <AlertasManager tenantSlug={tenantSlug} alertas={alertas} />
      </SectionCard>
    </div>
  );
}
