import { notFound, redirect } from "next/navigation";

import { VendaForm } from "@/components/vendas/venda-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { VENDA_STATUS_EDITAVEIS } from "@/lib/vendas/constants";
import { createVendaService } from "@/lib/vendas/venda-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Editar venda" };

export default async function EditarVendaPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createVendaService(tenant.id);
  const venda = await service.getById(id);

  if (!venda) {
    notFound();
  }

  if (
    !VENDA_STATUS_EDITAVEIS.includes(
      venda.status as (typeof VENDA_STATUS_EDITAVEIS)[number],
    )
  ) {
    redirect(`/${tenantSlug}/vendas/${id}`);
  }

  const [clientes, produtos] = await Promise.all([
    service.listClientesParaVenda(),
    service.listProdutosParaVenda(),
  ]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Editar venda"
        description={`Atualize os dados da venda #${String(venda.numero).padStart(6, "0")}`}
        breadcrumbs={[
          { label: "Vendas", href: `/${tenantSlug}/vendas` },
          {
            label: `#${String(venda.numero).padStart(6, "0")}`,
            href: `/${tenantSlug}/vendas/${venda.id}`,
          },
          { label: "Editar" },
        ]}
      />

      <SectionCard
        title="Dados da venda"
        description="Atualize cliente, itens e condições comerciais."
      >
        <VendaForm
          tenantSlug={tenantSlug}
          mode="edit"
          venda={venda}
          clientes={clientes}
          produtos={produtos}
        />
      </SectionCard>
    </div>
  );
}
