import { notFound } from "next/navigation";

import { ProdutoDetail } from "@/components/produtos/produto-detail";
import { ProdutoFeedback } from "@/components/produtos/produto-feedback";
import { createProdutoService } from "@/lib/produtos/produto-service";
import { requireTenant } from "@/lib/tenants";
import type { ProdutoSuccessMessage } from "@/types/produtos";

export const metadata = { title: "Detalhes do item" };

export default async function ProdutoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const { success, error } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createProdutoService(tenant.id);
  const produto = await service.getById(id);

  if (!produto) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ProdutoFeedback
        success={success as ProdutoSuccessMessage | undefined}
        error={error}
      />
      <ProdutoDetail tenantSlug={tenantSlug} produto={produto} />
    </div>
  );
}
