import { notFound } from "next/navigation";

import { DespesaRecorrenteForm } from "@/components/financeiro/despesa-recorrente-form";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { createDespesaRecorrenteService } from "@/lib/financeiro/despesa-recorrente-service";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import {
  ExecutiveHeader,
  ExecutivePage,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "Editar despesa recorrente" };

type PageProps = {
  params: Promise<{ tenant: string; id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { tenant: tenantSlug, id } = await params;

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
            { label: "Editar" },
          ]} />
        <ExecutiveHeader title="Editar série" description="Edição" />
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
  const service = await createDespesaRecorrenteService(tenant.id);
  const item = await service.getById(id);
  if (!item) notFound();

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
          {
            label: item.descricao,
            href: `/${tenantSlug}/financeiro/despesas-recorrentes/${item.id}`,
          },
          { label: "Editar" },
        ]} />
      <ExecutiveHeader title="Editar série" description="Não altera Contas a Pagar já geradas." />
      <DespesaRecorrenteForm
        tenantSlug={tenantSlug}
        mode="edit"
        item={item}
        fornecedores={fornecedores}
        formasPagamento={formasPagamento}
        categorias={categorias}
        centrosCusto={centrosCusto}
        planoContas={planoContas}
      />
    </ExecutivePage>
  );
}
