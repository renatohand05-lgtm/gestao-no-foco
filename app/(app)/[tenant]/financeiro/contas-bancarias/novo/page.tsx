import { ContaBancariaForm } from "@/components/financeiro/conta-bancaria-form";
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
      "financeiro.contas.visualizar",
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <ExecutivePage width="wide" spacing="loose">
        <Breadcrumbs items={[
            { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
            { label: "Contas Bancárias", href: `/${tenantSlug}/financeiro/contas-bancarias` },
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

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Contas Bancárias", href: `/${tenantSlug}/financeiro/contas-bancarias` },
          { label: "Nova conta" },
        ]} />
      <ExecutiveHeader title="Nova conta" description={`Cadastro em ${tenant.name}`} />

      <ExecutiveSection
        title="Cadastro"
        description="Preencha os dados do novo registro."
        panel
      >
        <ContaBancariaForm tenantSlug={tenantSlug} mode="create" />
      </ExecutiveSection>
    </ExecutivePage>
  );
}
