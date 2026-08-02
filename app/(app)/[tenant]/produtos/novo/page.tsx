import { ProdutoForm } from "@/components/produtos/produto-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { requireTenant } from "@/lib/tenants";
import type { ProdutoTipo } from "@/types/produtos";

export const metadata = { title: "Novo item" };

export default async function NovoProdutoPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const { tipo } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const defaultTipo: ProdutoTipo =
    tipo === "servico" ? "servico" : "produto";
  const isServico = defaultTipo === "servico";

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={isServico ? "Novo serviço" : "Novo produto"}
        description={
          isServico
            ? `Cadastre um serviço em ${tenant.name}`
            : `Cadastre um produto em ${tenant.name}`
        }
        breadcrumbs={[
          { label: "Produtos & Serviços", href: `/${tenantSlug}/produtos` },
          { label: isServico ? "Novo serviço" : "Novo produto" },
        ]}
      />

      <SectionCard
        title={isServico ? "Cadastro de serviço" : "Cadastro de produto"}
        description={
          isServico
            ? "Sem estoque físico. Informe custo de mão de obra, preço e tempo estimado."
            : "Inclui estoque, NCM e fornecedor quando aplicável."
        }
      >
        <ProdutoForm
          tenantSlug={tenantSlug}
          mode="create"
          defaultTipo={defaultTipo}
        />
      </SectionCard>
    </div>
  );
}
