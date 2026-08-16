import { ModuleHeader } from "@/components/layout/module-header";
import { ProdutoForm } from "@/components/produtos/produto-form";
import { SectionCard } from "@/components/ui/section-card";
import { getSegmentFormConfig } from "@/lib/segments/form-config.ts";
import { resolveSegmentContext } from "@/lib/segments/resolve.ts";
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
  const ctx = resolveSegmentContext({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  const formConfig = getSegmentFormConfig(ctx);
  const allowed = formConfig.allowedItemTypes.map((option) => option.value);
  const requested: ProdutoTipo = tipo === "servico" ? "servico" : "produto";
  const defaultTipo: ProdutoTipo = allowed.includes(requested)
    ? requested
    : (allowed[0] ?? "servico");
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
          formConfig={formConfig}
        />
      </SectionCard>
    </div>
  );
}
