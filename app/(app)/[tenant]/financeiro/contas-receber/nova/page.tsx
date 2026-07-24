import { ContaReceberForm } from "@/components/financeiro/conta-receber-form";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import { requireTenant } from "@/lib/tenants";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

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
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Contas a Receber",
            href: `/${tenantSlug}/financeiro/contas-receber`,
          },
          { label: "Nova conta" },
        ]} />
      <ExecutiveHeader title="Nova conta a receber" description={`Cadastro em ${tenant.name}`} />

      <ExecutiveSection
        title="Cadastro"
        description="Preencha os dados do título a receber."
        panel
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
      </ExecutiveSection>
    </ExecutivePage>
  );
}
