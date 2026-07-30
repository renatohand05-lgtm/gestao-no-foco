import { notFound } from "next/navigation";

import { ContaBancariaDetail } from "@/components/financeiro/conta-bancaria-detail";
import { FinanceiroFeedback } from "@/components/financeiro/financeiro-feedback";
import { createContaBancariaService } from "@/lib/financeiro/conta-bancaria-service";
import { createMovimentacaoBancariaService } from "@/lib/financeiro/movimentacao-bancaria-service";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import type { FinanceiroSuccessMessage } from "@/types/financeiro";

export const metadata = { title: "Detalhes" };

export default async function DetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const { success, error } = await searchParams;

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.contas.visualizar",
      "financeiro.visualizar",
    ]);
  } catch (authError) {
    const err = financePageAuthError(authError);
    return (
      <div className="space-y-6">
        <p
          className="rounded-lg border border-amber-600/40 px-3 py-3 text-sm"
          role="alert"
          data-finance-rbac="denied"
        >
          {err.message}
        </p>
      </div>
    );
  }

  const { tenant } = auth;
  const contaService = await createContaBancariaService(tenant.id);
  const movimentacaoService = await createMovimentacaoBancariaService(
    tenant.id,
  );

  const [item, movimentacoesResult] = await Promise.all([
    contaService.getById(id),
    movimentacaoService.list({
      contaBancariaId: id,
      page: 1,
      perPage: 20,
      sort: "created_at",
      order: "desc",
    }),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <FinanceiroFeedback
        success={success as FinanceiroSuccessMessage | undefined}
        error={error}
      />
      <ContaBancariaDetail
        tenantSlug={tenantSlug}
        item={item}
        movimentacoes={movimentacoesResult.data}
      />
    </div>
  );
}
