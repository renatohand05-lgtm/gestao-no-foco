import { CentroCustoForm } from "@/components/financeiro/centro-custo-form";
import { requireTenant } from "@/lib/tenants";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "Novo centro" };

export default async function NovoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Centros de Custo", href: `/${tenantSlug}/financeiro/centros-custo` },
          { label: "Novo centro" },
        ]} />
      <ExecutiveHeader title="Novo centro" description={`Cadastro em ${tenant.name}`} />

      <ExecutiveSection
        title="Cadastro"
        description="Preencha os dados do novo registro."
        panel
      >
        <CentroCustoForm tenantSlug={tenantSlug} mode="create" />
      </ExecutiveSection>
    </ExecutivePage>
  );
}
