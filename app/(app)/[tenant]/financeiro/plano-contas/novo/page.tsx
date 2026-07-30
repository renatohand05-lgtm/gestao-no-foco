import { PlanoContaForm } from "@/components/financeiro/plano-conta-form";
import { buildPlanoContaSelectOptions } from "@/lib/financeiro/plano-conta-tree";
import { createPlanoContaService } from "@/lib/financeiro/plano-conta-service";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
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

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
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
        <ExecutiveHeader title="Nova conta" description="Cadastro" />
        <p
          className="rounded-lg border border-amber-600/40 px-3 py-3 text-sm"
          role="alert"
          data-finance-rbac="denied"
        >
          {err.message}
        </p>
      </ExecutivePage>
    );
  }

  const { tenant } = auth;
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
