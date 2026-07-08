import { notFound } from "next/navigation";

import { EstoqueDetail } from "@/components/estoque/estoque-detail";
import { EstoqueFeedback } from "@/components/estoque/estoque-feedback";
import { createEstoqueService } from "@/lib/estoque/estoque-service";
import { requireTenant } from "@/lib/tenants";
import type { EstoqueSuccessMessage } from "@/types/estoque";

export const metadata = { title: "Detalhes da movimentação" };

export default async function EstoqueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const { success, error } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createEstoqueService(tenant.id);
  const movimentacao = await service.getMovimentacaoById(id);

  if (!movimentacao) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <EstoqueFeedback
        success={success as EstoqueSuccessMessage | undefined}
        error={error}
      />
      <EstoqueDetail tenantSlug={tenantSlug} movimentacao={movimentacao} />
    </div>
  );
}
