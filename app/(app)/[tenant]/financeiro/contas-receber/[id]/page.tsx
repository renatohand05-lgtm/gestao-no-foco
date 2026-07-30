import { notFound } from "next/navigation";

import { ContaReceberDetail } from "@/components/financeiro/conta-receber-detail";
import { ContaReceberFeedback } from "@/components/financeiro/conta-receber-feedback";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import type { ContaReceberSuccessMessage } from "@/types/contas-receber";

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
  const service = await createContaReceberService(tenant.id);
  const [item, contasBancarias, events] = await Promise.all([
    service.getById(id),
    service.listContasBancarias(),
    service.listEventos(id),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ContaReceberFeedback
        success={success as ContaReceberSuccessMessage | undefined}
        error={error}
      />
      <ContaReceberDetail
        tenantSlug={tenantSlug}
        item={item}
        contasBancarias={contasBancarias}
        events={events}
      />
    </div>
  );
}
