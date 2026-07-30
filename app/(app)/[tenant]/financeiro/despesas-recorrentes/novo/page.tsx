import { DespesaRecorrenteForm } from "@/components/financeiro/despesa-recorrente-form";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import {
  ExecutiveHeader,
  ExecutivePage,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "Nova despesa recorrente" };

type PageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function Page({ params }: PageProps) {
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
              label: "Despesas Recorrentes",
              href: `/${tenantSlug}/financeiro/despesas-recorrentes`,
            },
            { label: "Novo" },
          ]} />
        <ExecutiveHeader title="Nova despesa recorrente" description="Cadastro" />
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
  const cp = await createContaPagarService(tenant.id);
  const [fornecedores, formasPagamento, categorias, centrosCusto, planoContas] =
    await Promise.all([
      cp.listFornecedores(),
      cp.listFormasPagamento(),
      cp.listCategorias(),
      cp.listCentrosCusto(),
      cp.listPlanoContas(),
    ]);

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Despesas Recorrentes",
            href: `/${tenantSlug}/financeiro/despesas-recorrentes`,
          },
          { label: "Novo" },
        ]} />
      <ExecutiveHeader title="Nova despesa recorrente" description="Série mensal — gera Conta a Pagar, não movimentação." />
      <DespesaRecorrenteForm
        tenantSlug={tenantSlug}
        mode="create"
        fornecedores={fornecedores}
        formasPagamento={formasPagamento}
        categorias={categorias}
        centrosCusto={centrosCusto}
        planoContas={planoContas}
      />
    </ExecutivePage>
  );
}
