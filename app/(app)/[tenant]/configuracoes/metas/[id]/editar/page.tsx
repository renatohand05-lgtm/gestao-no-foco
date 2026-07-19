import { notFound } from "next/navigation";

import { MetaVendasForm } from "@/components/metas/meta-vendas-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { createMetaVendasService } from "@/lib/metas/meta-vendas-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Editar meta de vendas" };

type PageProps = {
  params: Promise<{ tenant: string; id: string }>;
};

export default async function EditarMetaPage({ params }: PageProps) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createMetaVendasService(tenant.id);
  const [item, centrosCusto] = await Promise.all([
    service.getById(id),
    service.listCentrosCustoOptions(),
  ]);

  if (!item) notFound();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Editar meta"
        description={`Competência ${item.competencia.slice(0, 7)}`}
        breadcrumbs={[
          { label: "Configurações", href: `/${tenantSlug}/configuracoes` },
          { label: "Metas", href: `/${tenantSlug}/configuracoes/metas` },
          { label: "Editar" },
        ]}
      />

      <MetaVendasForm
        mode="edit"
        tenantSlug={tenantSlug}
        item={item}
        centrosCusto={centrosCusto}
      />
    </div>
  );
}
