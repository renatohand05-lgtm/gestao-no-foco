import { CatalogImportPanel } from "@/components/catalog-import/catalog-import-panel";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { loadPlatformServiceCatalog } from "@/lib/catalog-import/catalog-source";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Importar produtos e serviços" };

export default async function ProdutosImportarPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  let categorias: string[] = [];
  let complexidades: string[] = [];
  try {
    const catalog = loadPlatformServiceCatalog();
    categorias = [...new Set(catalog.services.map((s) => s.categoria))].sort();
    complexidades = [
      ...new Set(
        catalog.services
          .map((s) => s.complexidade)
          .filter((c): c is string => Boolean(c)),
      ),
    ].sort();
  } catch {
    /* catálogo ausente — UI ainda permite modelo/produtos */
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Importar produtos e serviços"
        description="Selecione XLSX/XLS/CSV do computador, faça preview e confirme. Catálogo oficial da plataforma é opcional."
        breadcrumbs={[
          { label: "Produtos & Serviços", href: `/${tenantSlug}/produtos` },
          { label: "Importar" },
        ]}
      >
        <ActionButton
          action="view"
          label="Histórico geral"
          href={`/${tenantSlug}/integracoes/historico`}
        />
      </ModuleHeader>

      <CatalogImportPanel
        tenantSlug={tenantSlug}
        mode="produtos"
        categorias={categorias}
        complexidades={complexidades}
      />
    </div>
  );
}
