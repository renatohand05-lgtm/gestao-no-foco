import { notFound } from "next/navigation";

import { ContaPagarForm } from "@/components/financeiro/conta-pagar-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { canEditContaPagar } from "@/lib/financeiro/conta-pagar-utils";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Editar conta a pagar" };

export default async function EditarPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createContaPagarService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  if (!canEditContaPagar(item)) {
    notFound();
  }

  const [
    fornecedores,
    formasPagamento,
    categorias,
    centrosCusto,
    planoContas,
  ] = await Promise.all([
    service.listFornecedores(),
    service.listFormasPagamento(),
    service.listCategorias(),
    service.listCentrosCusto(),
    service.listPlanoContas(),
  ]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Editar conta a pagar"
        description={item.descricao}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Contas a Pagar",
            href: `/${tenantSlug}/financeiro/contas-pagar`,
          },
          {
            label: item.descricao,
            href: `/${tenantSlug}/financeiro/contas-pagar/${item.id}`,
          },
          { label: "Editar" },
        ]}
      />

      <SectionCard
        title="Edição"
        description="Atualize os dados do título em aberto."
      >
        <ContaPagarForm
          tenantSlug={tenantSlug}
          mode="edit"
          item={item}
          fornecedores={fornecedores}
          formasPagamento={formasPagamento}
          categorias={categorias}
          centrosCusto={centrosCusto}
          planoContas={planoContas}
        />
      </SectionCard>
    </div>
  );
}
