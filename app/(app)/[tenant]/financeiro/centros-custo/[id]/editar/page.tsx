import { notFound } from "next/navigation";

import { CentroCustoForm } from "@/components/financeiro/centro-custo-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createCentroCustoService } from "@/lib/financeiro/centro-custo-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Editar" };

export default async function EditarPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createCentroCustoService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={`Editar ${item.nome}`}
        description={`Atualize o registro em ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Centros de Custo", href: `/${tenantSlug}/financeiro/centros-custo` },
          {
            label: item.nome,
            href: `/${tenantSlug}/financeiro/centros-custo/${item.id}`,
          },
          { label: "Editar" },
        ]}
      />

      <SectionCard title="Cadastro" description="Atualize os dados do registro.">
        <CentroCustoForm tenantSlug={tenantSlug} mode="edit" item={item} />
      </SectionCard>
    </div>
  );
}
