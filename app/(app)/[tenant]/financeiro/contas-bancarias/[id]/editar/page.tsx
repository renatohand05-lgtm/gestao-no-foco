import { notFound } from "next/navigation";

import { ContaBancariaForm } from "@/components/financeiro/conta-bancaria-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createContaBancariaService } from "@/lib/financeiro/conta-bancaria-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Editar" };

export default async function EditarPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createContaBancariaService(tenant.id);
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
          { label: "Contas Bancárias", href: `/${tenantSlug}/financeiro/contas-bancarias` },
          {
            label: item.nome,
            href: `/${tenantSlug}/financeiro/contas-bancarias/${item.id}`,
          },
          { label: "Editar" },
        ]}
      />

      <SectionCard title="Cadastro" description="Atualize os dados do registro.">
        <ContaBancariaForm tenantSlug={tenantSlug} mode="edit" item={item} />
      </SectionCard>
    </div>
  );
}
