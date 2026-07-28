import Link from "next/link";

import { CashflowChart } from "@/components/finance/cashflow-chart";
import { CashflowTable } from "@/components/finance/cashflow-table";
import { FinancialSummaryCards } from "@/components/finance/financial-summary";
import { ModuleHeader } from "@/components/layout/module-header";
import {
  getFinancialSummary,
  listCashFlow,
} from "@/lib/finance/actions";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Financeiro" };

export default async function FinanceiroDashboardPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  const [summaryResult, cashFlowResult] = await Promise.all([
    getFinancialSummary(tenantSlug),
    listCashFlow(tenantSlug),
  ]);

  const links = [
    { href: "contas", label: "Contas bancárias" },
    { href: "movimentacoes", label: "Movimentações" },
    { href: "categorias", label: "Categorias" },
    { href: "centros-custo", label: "Centros de custo" },
    { href: "fluxo-caixa", label: "Fluxo (legado)" },
    { href: "contas-pagar", label: "Contas a pagar" },
    { href: "contas-receber", label: "Contas a receber" },
  ];

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Financeiro Enterprise"
        description={`Core operacional · ${tenant.name}`}
        breadcrumbs={[{ label: "Financeiro", href: `/${tenantSlug}/financeiro` }]}
      />

      {!summaryResult.success ? (
        <p className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-700">
          {summaryResult.error}
        </p>
      ) : (
        <FinancialSummaryCards summary={summaryResult.summary} />
      )}

      <nav className="flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={`/${tenantSlug}/financeiro/${l.href}`}
            className="inline-flex h-8 items-center rounded-md border border-input px-3 text-sm hover:bg-muted"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {cashFlowResult.success ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <CashflowChart points={cashFlowResult.cashFlow.points} />
          <CashflowTable cashFlow={cashFlowResult.cashFlow} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{cashFlowResult.error}</p>
      )}
    </div>
  );
}
