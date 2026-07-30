import { CentroCustoForm } from "@/components/financeiro/centro-custo-form";
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

export const metadata = { title: "Novo centro" };

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
            { label: "Centros de Custo", href: `/${tenantSlug}/financeiro/centros-custo` },
            { label: "Novo centro" },
          ]} />
        <ExecutiveHeader title="Novo centro" description="Cadastro" />
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
