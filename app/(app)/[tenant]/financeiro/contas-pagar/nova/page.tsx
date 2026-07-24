import { ContaPagarForm } from "@/components/financeiro/conta-pagar-form";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { requireTenant } from "@/lib/tenants";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

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
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Contas a Pagar",
            href: `/${tenantSlug}/financeiro/contas-pagar`,
          },
          { label: "Nova conta" },
        ]} />
      <ExecutiveHeader title="Nova conta a pagar" description={`Cadastro em ${tenant.name}`} />

      <ExecutiveSection
        title="Cadastro"
        description="Preencha os dados do título a pagar."
        panel
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
      </ExecutiveSection>
    </ExecutivePage>
  );
}
