import { notFound } from "next/navigation";

import { ContaReceberForm } from "@/components/financeiro/conta-receber-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import { canEditContaReceber } from "@/lib/financeiro/conta-receber-utils";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Editar conta a receber" };

export default async function EditarPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createContaReceberService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  if (!canEditContaReceber(item)) {
    notFound();
  }

  const [
    clientes,
    vendas,
    formasPagamento,
    categorias,
    centrosCusto,
    planoContas,
  ] =
    await Promise.all([
      service.listClientes(),
      service.listVendas(),
      service.listFormasPagamento(),
      service.listCategorias(),
      service.listCentrosCusto(),
      service.listPlanoContas(),
    ]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Editar conta a receber"
        description={item.descricao}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Contas a Receber",
            href: `/${tenantSlug}/financeiro/contas-receber`,
          },
          {
            label: item.descricao,
            href: `/${tenantSlug}/financeiro/contas-receber/${item.id}`,
          },
          { label: "Editar" },
        ]}
      />

      <SectionCard
        title="Edição"
        description="Atualize os dados do título em aberto."
      >
        <ContaReceberForm
          tenantSlug={tenantSlug}
          mode="edit"
          item={item}
          clientes={clientes}
          vendas={vendas}
          formasPagamento={formasPagamento}
          categorias={categorias}
          centrosCusto={centrosCusto}
          planoContas={planoContas}
        />
      </SectionCard>
    </div>
  );
}
