import { notFound } from "next/navigation";

import { DespesaRecorrenteForm } from "@/components/financeiro/despesa-recorrente-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { createDespesaRecorrenteService } from "@/lib/financeiro/despesa-recorrente-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Editar despesa recorrente" };

type PageProps = {
  params: Promise<{ tenant: string; id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createDespesaRecorrenteService(tenant.id);
  const item = await service.getById(id);
  if (!item) notFound();

  const cp = await createContaPagarService(tenant.id);
  const [fornecedores, formasPagamento, categorias, centrosCusto, planoContas] =
    await Promise.all([
      cp.listFornecedores(),
      cp.listFormasPagamento(),
      cp.listCategorias(),
      cp.listCentrosCusto(),
      cp.listPlanoContas(),
    ]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Editar série"
        description="Não altera Contas a Pagar já geradas."
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Despesas Recorrentes",
            href: `/${tenantSlug}/financeiro/despesas-recorrentes`,
          },
          {
            label: item.descricao,
            href: `/${tenantSlug}/financeiro/despesas-recorrentes/${item.id}`,
          },
          { label: "Editar" },
        ]}
      />
      <DespesaRecorrenteForm
        tenantSlug={tenantSlug}
        mode="edit"
        item={item}
        fornecedores={fornecedores}
        formasPagamento={formasPagamento}
        categorias={categorias}
        centrosCusto={centrosCusto}
        planoContas={planoContas}
      />
    </div>
  );
}
