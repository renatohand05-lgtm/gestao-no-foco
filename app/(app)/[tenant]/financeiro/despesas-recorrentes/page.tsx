import { RefreshCw } from "lucide-react";

import { DespesaRecorrenteTable } from "@/components/financeiro/despesa-recorrente-table";
import { FinanceiroEmptyState } from "@/components/financeiro/financeiro-empty-state";
import { ActionButton } from "@/components/ui/action-button";
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

export const metadata = { title: "Despesas Recorrentes" };

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
            { label: "Despesas Recorrentes" },
          ]} />
        <ExecutiveHeader title="Despesas Recorrentes" description="Séries mensais" />
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
  const items = await service.list();

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Despesas Recorrentes" },
        ]} />
      <ExecutiveHeader title="Despesas Recorrentes" description="Séries mensais que geram Contas a Pagar por competência (água, aluguel, salários…)." actions={<>
<ActionButton
          action="create"
          href={`/${tenantSlug}/financeiro/despesas-recorrentes/novo`}
        />
</>} />

      {items.length === 0 ? (
        <FinanceiroEmptyState
          tenantSlug={tenantSlug}
          basePath="despesas-recorrentes"
          icon={RefreshCw}
          title="Nenhuma recorrência"
          description="Crie séries mensais para utilidades e pessoal sem digitar o título todo mês."
          createLabel="Nova recorrência"
          hasSearch={false}
          hasFilters={false}
        />
      ) : (
        <DespesaRecorrenteTable tenantSlug={tenantSlug} items={items} />
      )}
    </ExecutivePage>
  );
}
