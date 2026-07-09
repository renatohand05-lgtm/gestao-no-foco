import { notFound } from "next/navigation";

import { ContaPagarDetail } from "@/components/financeiro/conta-pagar-detail";
import { ContaPagarFeedback } from "@/components/financeiro/conta-pagar-feedback";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { requireTenant } from "@/lib/tenants";
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
  const tenant = await requireTenant(tenantSlug);
  const service = await createContaPagarService(tenant.id);

  const [item, formasPagamento, contasBancarias] = await Promise.all([
    service.getById(id),
    service.listFormasPagamento(),
    service.listContasBancarias(),
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
      />
    </div>
  );
}
