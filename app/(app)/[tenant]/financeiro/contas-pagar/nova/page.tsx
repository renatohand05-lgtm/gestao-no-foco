import { ContaPagarForm } from "@/components/financeiro/conta-pagar-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Nova conta a pagar" };

export default async function NovaPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createContaPagarService(tenant.id);

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
        title="Nova conta a pagar"
        description={`Cadastro em ${tenant.name}`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Contas a Pagar",
            href: `/${tenantSlug}/financeiro/contas-pagar`,
          },
          { label: "Nova conta" },
        ]}
      />

      <SectionCard
        title="Cadastro"
        description="Preencha os dados do título a pagar."
      >
        <ContaPagarForm
          tenantSlug={tenantSlug}
          mode="create"
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
