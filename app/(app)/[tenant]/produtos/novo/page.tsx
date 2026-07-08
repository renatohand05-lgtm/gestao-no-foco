import { ProdutoForm } from "@/components/produtos/produto-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Novo item" };

export default async function NovoProdutoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Novo item"
        description={`Cadastre um produto ou serviço em ${tenant.name}`}
        breadcrumbs={[
          { label: "Produtos & Serviços", href: `/${tenantSlug}/produtos` },
          { label: "Novo item" },
        ]}
      />

      <SectionCard
        title="Cadastro completo"
        description="Preencha os dados do novo item do catálogo."
      >
        <ProdutoForm tenantSlug={tenantSlug} mode="create" />
      </SectionCard>
    </div>
  );
}
