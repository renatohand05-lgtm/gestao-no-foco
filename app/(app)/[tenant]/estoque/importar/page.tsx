import { CatalogImportPanel } from "@/components/catalog-import/catalog-import-panel";
import { StockInvoiceImportPanel } from "@/components/catalog-import/stock-invoice-import-panel";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Importar estoque e NF-e" };

export default async function EstoqueImportarPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Importar estoque e notas"
        description="Central: Excel, CSV, saldo, preços, custos, NF-e XML e PDF auxiliar — com preview e confirmação."
        breadcrumbs={[
          { label: "Estoque", href: `/${tenantSlug}/estoque` },
          { label: "Importar" },
        ]}
      >
        <ActionButton
          action="view"
          label="Notas fiscais"
          href={`/${tenantSlug}/estoque/notas-fiscais`}
        />
        <ActionButton
          action="view"
          label="Histórico"
          href={`/${tenantSlug}/integracoes/historico`}
        />
      </ModuleHeader>

      <CatalogImportPanel tenantSlug={tenantSlug} mode="estoque" />
      <StockInvoiceImportPanel tenantSlug={tenantSlug} />
    </div>
  );
}
