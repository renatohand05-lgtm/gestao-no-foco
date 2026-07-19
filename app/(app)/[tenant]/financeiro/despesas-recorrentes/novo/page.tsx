import { DespesaRecorrenteForm } from "@/components/financeiro/despesa-recorrente-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Nova despesa recorrente" };

type PageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function Page({ params }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
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
        title="Nova despesa recorrente"
        description="Série mensal — gera Conta a Pagar, não movimentação."
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Despesas Recorrentes",
            href: `/${tenantSlug}/financeiro/despesas-recorrentes`,
          },
          { label: "Novo" },
        ]}
      />
      <DespesaRecorrenteForm
        tenantSlug={tenantSlug}
        mode="create"
        fornecedores={fornecedores}
        formasPagamento={formasPagamento}
        categorias={categorias}
        centrosCusto={centrosCusto}
        planoContas={planoContas}
      />
    </div>
  );
}
