import { PlanoContaForm } from "@/components/financeiro/plano-conta-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { buildPlanoContaSelectOptions } from "@/lib/financeiro/plano-conta-tree";
import { createPlanoContaService } from "@/lib/financeiro/plano-conta-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Nova conta" };

export default async function NovoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createPlanoContaService(tenant.id);
  const parentItems = await service.listParentOptions();
  const parentOptions = buildPlanoContaSelectOptions(parentItems, {
    onlySintetica: true,
  });

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Nova conta"
        description={`Cadastro em ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Plano de Contas",
            href: `/${tenantSlug}/financeiro/plano-contas`,
          },
          { label: "Nova conta" },
        ]}
      />

      <SectionCard
        title="Cadastro"
        description="Preencha os dados do novo registro."
      >
        <PlanoContaForm
          tenantSlug={tenantSlug}
          mode="create"
          parentOptions={parentOptions}
        />
      </SectionCard>
    </div>
  );
}
