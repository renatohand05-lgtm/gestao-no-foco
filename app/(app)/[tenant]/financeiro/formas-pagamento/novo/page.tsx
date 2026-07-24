import { FormaPagamentoForm } from "@/components/financeiro/forma-pagamento-form";
import { requireTenant } from "@/lib/tenants";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "Nova forma" };

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
          { label: "Formas de Pagamento", href: `/${tenantSlug}/financeiro/formas-pagamento` },
          { label: "Nova forma" },
        ]} />
      <ExecutiveHeader title="Nova forma" description={`Cadastro em ${tenant.name}`} />

      <ExecutiveSection
        title="Cadastro"
        description="Preencha os dados do novo registro."
        panel
      >
        <FormaPagamentoForm tenantSlug={tenantSlug} mode="create" />
      </ExecutiveSection>
    </ExecutivePage>
  );
}
