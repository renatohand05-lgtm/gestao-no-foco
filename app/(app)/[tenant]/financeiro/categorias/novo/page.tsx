import { CategoriaFinanceiraForm } from "@/components/financeiro/categoria-financeira-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { buildPlanoContaSelectOptions } from "@/lib/financeiro/plano-conta-tree";
import { createPlanoContaService } from "@/lib/financeiro/plano-conta-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Nova categoria" };

export default async function NovoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const planoService = await createPlanoContaService(tenant.id);
  const planoItems = await planoService.listForTree({ ativo: true });
  const planoContaOptions = buildPlanoContaSelectOptions(planoItems);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Nova categoria"
        description={`Cadastro em ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Categorias Financeiras",
            href: `/${tenantSlug}/financeiro/categorias`,
          },
          { label: "Nova categoria" },
        ]}
      />

      <SectionCard
        title="Cadastro"
        description="Preencha os dados do novo registro."
      >
        <CategoriaFinanceiraForm
          tenantSlug={tenantSlug}
          mode="create"
          planoContaOptions={planoContaOptions}
        />
      </SectionCard>
    </div>
  );
}
