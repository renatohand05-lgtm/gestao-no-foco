import { ContaPagarForm } from "@/components/financeiro/conta-pagar-form";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
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

export const metadata = { title: "Nova conta a pagar" };

export default async function NovaPage({
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
              label: "Contas a Pagar",
              href: `/${tenantSlug}/financeiro/contas-pagar`,
            },
            { label: "Nova conta" },
          ]} />
        <ExecutiveHeader title="Nova conta a pagar" description="Cadastro" />
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
  const service = await createContaPagarService(tenant.id);

  const [
    fornecedores,
    formasPagamento,
    categorias,
    centrosCusto,
    planoContas,
  ] = await Promise.all([
    service.listFornecedores(),
    service.listFormasPagamento(),
    service.listCategorias(),
    service.listCentrosCusto(),
    service.listPlanoContas(),
  ]);

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Contas a Pagar",
            href: `/${tenantSlug}/financeiro/contas-pagar`,
          },
          { label: "Nova conta" },
        ]} />
      <ExecutiveHeader title="Nova conta a pagar" description={`Cadastro em ${tenant.name}`} />

      <ExecutiveSection
        title="Cadastro"
        description="Preencha os dados do título a pagar."
        panel
      >
        <ContaPagarForm
          tenantSlug={tenantSlug}
          mode="create"
          fornecedores={fornecedores}
          formasPagamento={formasPagamento}
          categorias={categorias}
          centrosCusto={centrosCusto}
          planoContas={planoContas}
        />
      </ExecutiveSection>
    </ExecutivePage>
  );
}
