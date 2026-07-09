import { ContaBancariaForm } from "@/components/financeiro/conta-bancaria-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Nova conta" };

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
        title="Nova conta"
        description={`Cadastro em ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Contas Bancárias", href: `/${tenantSlug}/financeiro/contas-bancarias` },
          { label: "Nova conta" },
        ]}
      />

      <SectionCard
        title="Cadastro"
        description="Preencha os dados do novo registro."
      >
        <ContaBancariaForm tenantSlug={tenantSlug} mode="create" />
      </SectionCard>
    </div>
  );
}
