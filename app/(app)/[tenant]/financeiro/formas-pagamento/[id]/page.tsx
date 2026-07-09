import { notFound } from "next/navigation";

import { FormaPagamentoDetail } from "@/components/financeiro/forma-pagamento-detail";
import { FinanceiroFeedback } from "@/components/financeiro/financeiro-feedback";
import { createFormaPagamentoService } from "@/lib/financeiro/forma-pagamento-service";
import { requireTenant } from "@/lib/tenants";
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
  const tenant = await requireTenant(tenantSlug);
  const service = await createFormaPagamentoService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <FinanceiroFeedback
        success={success as FinanceiroSuccessMessage | undefined}
        error={error}
      />
      <FormaPagamentoDetail tenantSlug={tenantSlug} item={item} />
    </div>
  );
}
