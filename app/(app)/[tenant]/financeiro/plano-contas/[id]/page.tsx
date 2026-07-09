import { notFound } from "next/navigation";

import { PlanoContaDetail } from "@/components/financeiro/plano-conta-detail";
import { FinanceiroFeedback } from "@/components/financeiro/financeiro-feedback";
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
