import { RefreshCw } from "lucide-react";

import { DespesaRecorrenteTable } from "@/components/financeiro/despesa-recorrente-table";
import { FinanceiroEmptyState } from "@/components/financeiro/financeiro-empty-state";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { createDespesaRecorrenteService } from "@/lib/financeiro/despesa-recorrente-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Despesas Recorrentes" };

type PageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function Page({ params }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createDespesaRecorrenteService(tenant.id);
  const items = await service.list();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Despesas Recorrentes"
        description="Séries mensais que geram Contas a Pagar por competência (água, aluguel, salários…)."
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Despesas Recorrentes" },
        ]}
      >
        <ActionButton
          action="create"
          href={`/${tenantSlug}/financeiro/despesas-recorrentes/novo`}
        />
      </ModuleHeader>

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
    </div>
  );
}
