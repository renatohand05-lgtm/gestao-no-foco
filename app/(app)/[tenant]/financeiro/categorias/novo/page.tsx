import { CategoriaFinanceiraForm } from "@/components/financeiro/categoria-financeira-form";
import { buildPlanoContaSelectOptions } from "@/lib/financeiro/plano-conta-tree";
import { createPlanoContaService } from "@/lib/financeiro/plano-conta-service";
import { requireTenant } from "@/lib/tenants";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

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
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Categorias Financeiras",
            href: `/${tenantSlug}/financeiro/categorias`,
          },
          { label: "Nova categoria" },
        ]} />
      <ExecutiveHeader title="Nova categoria" description={`Cadastro em ${tenant.name}`} />

      <ExecutiveSection
        title="Cadastro"
        description="Preencha os dados do novo registro."
        panel
      >
        <CategoriaFinanceiraForm
          tenantSlug={tenantSlug}
          mode="create"
          planoContaOptions={planoContaOptions}
        />
      </ExecutiveSection>
    </ExecutivePage>
  );
}
