import { notFound } from "next/navigation";

import { CategoriaFinanceiraDetail } from "@/components/financeiro/categoria-financeira-detail";
import { FinanceiroFeedback } from "@/components/financeiro/financeiro-feedback";
import { createCategoriaFinanceiraService } from "@/lib/financeiro/categoria-financeira-service";
import { createPlanoContaService } from "@/lib/financeiro/plano-conta-service";
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
  const service = await createCategoriaFinanceiraService(tenant.id);
  const planoService = await createPlanoContaService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  const planoConta = item.plano_conta_id
    ? await planoService.getResumoById(item.plano_conta_id)
    : null;

  return (
    <div className="space-y-6">
      <FinanceiroFeedback
        success={success as FinanceiroSuccessMessage | undefined}
        error={error}
      />
      <CategoriaFinanceiraDetail
        tenantSlug={tenantSlug}
        item={item}
        planoConta={planoConta}
      />
    </div>
  );
}
