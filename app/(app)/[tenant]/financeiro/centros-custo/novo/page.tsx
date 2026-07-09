import { CentroCustoForm } from "@/components/financeiro/centro-custo-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Novo centro" };

export default async function NovoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Novo centro"
        description={`Cadastro em ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Centros de Custo", href: `/${tenantSlug}/financeiro/centros-custo` },
          { label: "Novo centro" },
        ]}
      />

      <SectionCard
        title="Cadastro"
        description="Preencha os dados do novo registro."
      >
        <CentroCustoForm tenantSlug={tenantSlug} mode="create" />
      </SectionCard>
    </div>
  );
}
