import { notFound } from "next/navigation";

import { CentroCustoDetail } from "@/components/financeiro/centro-custo-detail";
import { FinanceiroFeedback } from "@/components/financeiro/financeiro-feedback";
import { createCentroCustoService } from "@/lib/financeiro/centro-custo-service";
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
  const service = await createCentroCustoService(tenant.id);
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
      <CentroCustoDetail tenantSlug={tenantSlug} item={item} />
    </div>
  );
}
