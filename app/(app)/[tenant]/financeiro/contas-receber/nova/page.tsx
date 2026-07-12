import { ContaReceberForm } from "@/components/financeiro/conta-receber-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Nova conta a receber" };

export default async function NovaPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createContaReceberService(tenant.id);

  const [clientes, vendas, formasPagamento, categorias, centrosCusto, planoContas] =
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
        title="Nova conta a receber"
        description={`Cadastro em ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Contas a Receber",
            href: `/${tenantSlug}/financeiro/contas-receber`,
          },
          { label: "Nova conta" },
        ]}
      />

      <SectionCard
        title="Cadastro"
        description="Preencha os dados do título a receber."
      >
        <ContaReceberForm
          tenantSlug={tenantSlug}
          mode="create"
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
