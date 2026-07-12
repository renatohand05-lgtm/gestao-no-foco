import { notFound } from "next/navigation";

import { VendaDetailView } from "@/components/vendas/venda-detail";
import { VendaFeedback } from "@/components/vendas/venda-feedback";
import { createContaBancariaService } from "@/lib/financeiro/conta-bancaria-service";
import { createVendaService } from "@/lib/vendas/venda-service";
import { requireTenant } from "@/lib/tenants";
import type { VendaSuccessMessage } from "@/types/vendas";

export const metadata = { title: "Detalhes da venda" };

export default async function VendaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const { success, error } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createVendaService(tenant.id);
  const contaBancariaService = await createContaBancariaService(tenant.id);
  const [venda, contasResult] = await Promise.all([
    service.getById(id),
    contaBancariaService.list({ ativo: true, perPage: 100 }),
  ]);

  if (!venda) {
    notFound();
  }

  const contasBancarias = contasResult.data.map((conta) => ({
    id: conta.id,
    nome: conta.nome,
  }));

  return (
    <div className="space-y-6">
      <VendaFeedback
        success={success as VendaSuccessMessage | undefined}
        error={error}
      />
      <VendaDetailView
        tenantSlug={tenantSlug}
        venda={venda}
        contasBancarias={contasBancarias}
      />
    </div>
  );
}
