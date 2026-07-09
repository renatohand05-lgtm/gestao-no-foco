import { notFound } from "next/navigation";

import { CategoriaFinanceiraForm } from "@/components/financeiro/categoria-financeira-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { buildPlanoContaSelectOptions } from "@/lib/financeiro/plano-conta-tree";
import { createCategoriaFinanceiraService } from "@/lib/financeiro/categoria-financeira-service";
import { createPlanoContaService } from "@/lib/financeiro/plano-conta-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Editar" };

export default async function EditarPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createCategoriaFinanceiraService(tenant.id);
  const planoService = await createPlanoContaService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  const planoItems = await planoService.listForTree({ ativo: true });
  const planoContaOptions = buildPlanoContaSelectOptions(planoItems);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={`Editar ${item.nome}`}
        description={`Atualize o registro em ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Categorias Financeiras", href: `/${tenantSlug}/financeiro/categorias` },
          {
            label: item.nome,
            href: `/${tenantSlug}/financeiro/categorias/${item.id}`,
          },
          { label: "Editar" },
        ]}
      />

      <SectionCard title="Cadastro" description="Atualize os dados do registro.">
        <CategoriaFinanceiraForm
          tenantSlug={tenantSlug}
          mode="edit"
          item={item}
          planoContaOptions={planoContaOptions}
        />
      </SectionCard>
    </div>
  );
}
