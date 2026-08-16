import { ModuleHeader } from "@/components/layout/module-header";
import { SegmentCatalogPicker } from "@/components/produtos/segment-catalog-picker";
import { SectionCard } from "@/components/ui/section-card";
import { getLibraryForContext } from "@/lib/segments/catalogs/index.ts";
import { resolveSegmentContext } from "@/lib/segments/resolve.ts";
import { createProdutoService } from "@/lib/produtos/produto-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Catálogo inicial" };

export default async function CatalogoInicialPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const ctx = resolveSegmentContext({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  const items = getLibraryForContext(ctx);
  const service = await createProdutoService(tenant.id);
  const existing = await service.listNamesForDedup();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Monte seu catálogo inicial"
        description="Selecionamos serviços comuns para o seu tipo de negócio. Escolha os que sua empresa oferece. Você poderá editar e adicionar outros depois."
        breadcrumbs={[
          { label: "Produtos & Serviços", href: `/${tenantSlug}/produtos` },
          { label: "Sugestões do segmento" },
        ]}
      />

      <SectionCard
        title="Biblioteca do segmento"
        description="Nada é cadastrado automaticamente. Só entram os itens que você selecionar. Preço fica por sua conta."
      >
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Não há sugestões para este tipo de negócio. Crie seus serviços do
            zero.
          </p>
        ) : (
          <SegmentCatalogPicker
            tenantSlug={tenantSlug}
            items={items}
            existingCount={existing.length}
          />
        )}
      </SectionCard>
    </div>
  );
}
