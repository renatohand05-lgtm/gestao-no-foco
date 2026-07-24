import { PlanoContaForm } from "@/components/financeiro/plano-conta-form";
import { buildPlanoContaSelectOptions } from "@/lib/financeiro/plano-conta-tree";
import { createPlanoContaService } from "@/lib/financeiro/plano-conta-service";
import { requireTenant } from "@/lib/tenants";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

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
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Plano de Contas",
            href: `/${tenantSlug}/financeiro/plano-contas`,
          },
          { label: "Nova conta" },
        ]} />
      <ExecutiveHeader title="Nova conta" description={`Cadastro em ${tenant.name}`} />

      <ExecutiveSection
        title="Cadastro"
        description="Preencha os dados do novo registro."
        panel
      >
        <PlanoContaForm
          tenantSlug={tenantSlug}
          mode="create"
          parentOptions={parentOptions}
        />
      </ExecutiveSection>
    </ExecutivePage>
  );
}
