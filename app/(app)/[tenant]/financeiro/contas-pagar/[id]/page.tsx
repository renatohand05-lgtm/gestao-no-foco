import { notFound } from "next/navigation";

import { ContaPagarDetail } from "@/components/financeiro/conta-pagar-detail";
import { ContaPagarFeedback } from "@/components/financeiro/conta-pagar-feedback";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import type { ContaPagarSuccessMessage } from "@/types/contas-pagar";

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
  const service = await createContaPagarService(tenant.id);

  const [item, formasPagamento, contasBancarias, events] = await Promise.all([
    service.getById(id),
    service.listFormasPagamento(),
    service.listContasBancarias(),
    service.listEventos(id),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ContaPagarFeedback
        success={success as ContaPagarSuccessMessage | undefined}
        error={error}
      />
      <ContaPagarDetail
        tenantSlug={tenantSlug}
        item={item}
        formasPagamento={formasPagamento}
        contasBancarias={contasBancarias}
        events={events}
      />
    </div>
  );
}
