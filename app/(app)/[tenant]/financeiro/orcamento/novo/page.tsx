import Link from "next/link";

import { FinanceBudgetForm } from "@/components/finance/finance-budget-form";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";

export const metadata = { title: "Novo orçamento empresarial" };
export const dynamic = "force-dynamic";

export default async function NovoOrcamentoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  try {
    await requireFinancePagePermission(tenantSlug, [
      "financeiro.orcamento.criar",
      "financeiro.criar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="p-6">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Novo orçamento"
          description={err.message}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6" data-phase28="finance-orcamento-novo">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        title="Novo orçamento empresarial"
        description="Versão orçamentária · DRE canônico intacto."
      />
      <Link
        href={`/${tenantSlug}/financeiro/orcamento`}
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        Voltar à lista
      </Link>
      <FinanceBudgetForm tenantSlug={tenantSlug} mode="create" />
    </div>
  );
}
