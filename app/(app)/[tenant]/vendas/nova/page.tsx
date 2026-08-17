import { VendaForm } from "@/components/vendas/venda-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { tenantHasMutationPermission } from "@/lib/rbac/mutation-auth";
import { createVendaService } from "@/lib/vendas/venda-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Nova venda" };

export default async function NovaVendaPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createVendaService(tenant.id);

  const [clientes, produtos, formasPagamento, categoriasFinanceiras, centrosCusto, canConfigureFormas] =
    await Promise.all([
      service.listClientesParaVenda(),
      service.listProdutosParaVenda(),
      service.listFormasPagamentoParaVenda(),
      service.listCategoriasFinanceirasParaVenda(),
      service.listCentrosCustoParaVenda(),
      tenantHasMutationPermission(tenantSlug, "financeiro.editar"),
    ]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Nova venda"
        description={`Registre um orçamento ou venda em ${tenant.name}`}
        breadcrumbs={[
          { label: "Vendas", href: `/${tenantSlug}/vendas` },
          { label: "Nova venda" },
        ]}
      />

      <SectionCard
        title="Dados da venda"
        description="Selecione o cliente, adicione itens e defina as condições comerciais."
      >
        <VendaForm
          tenantSlug={tenantSlug}
          mode="create"
          clientes={clientes}
          produtos={produtos}
          formasPagamento={formasPagamento}
          categoriasFinanceiras={categoriasFinanceiras}
          centrosCusto={centrosCusto}
          canConfigureFormas={canConfigureFormas}
        />
      </SectionCard>
    </div>
  );
}
