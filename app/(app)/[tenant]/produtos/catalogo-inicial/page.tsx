import Link from "next/link";

import { ModuleHeader } from "@/components/layout/module-header";
import { SegmentCatalogPicker } from "@/components/produtos/segment-catalog-picker";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { buildCatalogPickerView } from "@/lib/segments/catalogs/view-model.ts";
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
  const view = buildCatalogPickerView(ctx);
  const service = await createProdutoService(tenant.id);
  const existing = await service.listNamesForDedup();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={view.title}
        description={view.description}
        breadcrumbs={[
          { label: "Produtos & Serviços", href: `/${tenantSlug}/produtos` },
          { label: "Sugestões do segmento" },
        ]}
      />

      <SectionCard
        title="Biblioteca do segmento"
        description="Nada é cadastrado automaticamente. Só entram os itens que você selecionar. Preço fica por sua conta."
      >
        {view.hasLibrary ? (
          <SegmentCatalogPicker
            tenantSlug={tenantSlug}
            items={view.items}
            categories={view.categories}
            existingCount={existing.length}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Não há sugestões para este tipo de negócio. Crie seus serviços do
              zero.
            </p>
            <Button
              render={
                <Link href={`/${tenantSlug}/produtos/novo?tipo=servico`} />
              }
            >
              Criar serviço do zero
            </Button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
