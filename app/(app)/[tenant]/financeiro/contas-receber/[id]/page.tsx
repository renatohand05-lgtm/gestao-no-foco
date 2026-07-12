import { notFound } from "next/navigation";

import { ContaReceberDetail } from "@/components/financeiro/conta-receber-detail";
import { ContaReceberFeedback } from "@/components/financeiro/conta-receber-feedback";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import { requireTenant } from "@/lib/tenants";
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
  const tenant = await requireTenant(tenantSlug);
  const service = await createContaReceberService(tenant.id);
  const [item, contasBancarias] = await Promise.all([
    service.getById(id),
    service.listContasBancarias(),
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
      />
    </div>
  );
}
