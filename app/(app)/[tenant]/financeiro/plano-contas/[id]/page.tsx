import { notFound } from "next/navigation";

import { PlanoContaDetail } from "@/components/financeiro/plano-conta-detail";
import { FinanceiroFeedback } from "@/components/financeiro/financeiro-feedback";
import { createPlanoContaService } from "@/lib/financeiro/plano-conta-service";
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
  const service = await createPlanoContaService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  const contaPai = item.conta_pai_id
    ? await service.getResumoById(item.conta_pai_id)
    : null;

  return (
    <div className="space-y-6">
      <FinanceiroFeedback
        success={success as FinanceiroSuccessMessage | undefined}
        error={error}
      />
      <PlanoContaDetail
        tenantSlug={tenantSlug}
        item={item}
        contaPai={contaPai}
      />
    </div>
  );
}
