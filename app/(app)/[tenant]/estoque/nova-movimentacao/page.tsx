import { EstoqueForm } from "@/components/estoque/estoque-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createEstoqueService } from "@/lib/estoque/estoque-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Nova movimentação" };

export default async function NovaMovimentacaoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createEstoqueService(tenant.id);
  const produtos = await service.listProdutosParaMovimentacao();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Nova movimentação"
        description={`Registre entrada, saída ou ajuste em ${tenant.name}`}
        breadcrumbs={[
          { label: "Estoque", href: `/${tenantSlug}/estoque` },
          { label: "Nova movimentação" },
        ]}
      />

      <SectionCard
        title="Dados da movimentação"
        description="O estoque do produto será atualizado automaticamente após o registro."
      >
        <EstoqueForm tenantSlug={tenantSlug} produtos={produtos} />
      </SectionCard>
    </div>
  );
}
