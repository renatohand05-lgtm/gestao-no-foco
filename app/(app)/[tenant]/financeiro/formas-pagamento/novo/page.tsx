import { FormaPagamentoForm } from "@/components/financeiro/forma-pagamento-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Nova forma" };

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
        title="Nova forma"
        description={`Cadastro em ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Formas de Pagamento", href: `/${tenantSlug}/financeiro/formas-pagamento` },
          { label: "Nova forma" },
        ]}
      />

      <SectionCard
        title="Cadastro"
        description="Preencha os dados do novo registro."
      >
        <FormaPagamentoForm tenantSlug={tenantSlug} mode="create" />
      </SectionCard>
    </div>
  );
}
