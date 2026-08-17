import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { VendaRapidaForm } from "@/components/vendas/venda-rapida-form";
import { createClient } from "@/lib/supabase/server";
import { tenantHasMutationPermission } from "@/lib/rbac/mutation-auth";
import { requireTenant } from "@/lib/tenants";
import { createVendaRapidaService } from "@/lib/vendas/venda-rapida-service";
import { createVendaService } from "@/lib/vendas/venda-service";

export const metadata = { title: "Venda rápida" };

export default async function VendaRapidaPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const supabase = await createClient();
  const vendaSvc = await createVendaService(tenant.id);
  const balcao = await createVendaRapidaService(tenant.id);

  const [produtos, clientes, formas, contas, canConfigureFormas] =
    await Promise.all([
    balcao.listProdutosBalcao(),
    vendaSvc.listClientesParaVenda(),
    vendaSvc.listFormasPagamentoParaVenda(),
    supabase
      .from("contas_bancarias")
      .select("id, nome")
      .eq("tenant_id", tenant.id)
      .eq("ativo", true)
      .is("deleted_at", null)
      .order("nome"),
    tenantHasMutationPermission(tenantSlug, "financeiro.editar"),
  ]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Venda rápida / balcão"
        description="Venda produtos do estoque em poucos passos — cliente opcional"
        breadcrumbs={[
          { label: "Vendas", href: `/${tenantSlug}/vendas` },
          { label: "Venda rápida" },
        ]}
      />
      <SectionCard
        title="Balcão"
        description="Código de barras, estoque e caixa na mesma tela."
      >
        <VendaRapidaForm
          tenantSlug={tenantSlug}
          produtos={produtos}
          clientes={clientes.map((c) => ({ id: c.id, nome: c.nome }))}
          formasPagamento={formas.map((f) => ({
            id: f.id,
            nome: f.nome,
            tipo: f.tipo,
          }))}
          contasBancarias={(contas.data ?? []).map((c) => ({
            id: c.id,
            nome: c.nome,
          }))}
          canConfigureFormas={canConfigureFormas}
        />
      </SectionCard>
    </div>
  );
}
