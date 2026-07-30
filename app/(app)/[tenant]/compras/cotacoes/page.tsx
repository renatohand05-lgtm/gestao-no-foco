import { QuotationComparisonClient } from "@/components/supply/quotation-comparison-client";
import { SupplyEnterpriseNavigation } from "@/components/supply/supply-enterprise-navigation";
import { ModuleHeader } from "@/components/layout/module-header";
import { listSupplyQuotationCompareAction } from "@/lib/supply/supply-enterprise-actions";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Comparação de cotações" };

export default async function ComprasCotacoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  let lines: Awaited<
    ReturnType<typeof listSupplyQuotationCompareAction>
  >["lines"] = [];
  let error: string | null = null;

  try {
    const res = await listSupplyQuotationCompareAction(tenantSlug);
    lines = res.lines;
    error = res.error;
  } catch (e) {
    error = e instanceof Error ? e.message : "Falha ao carregar cotações";
  }

  return (
    <div className="space-y-6">
      <SupplyEnterpriseNavigation
        tenantSlug={tenantSlug}
        active="compras/cotacoes"
      />
      <ModuleHeader
        title="Comparação de cotações"
        description="Lado a lado por item — sugestão explicada, escolha humana obrigatória. Sem inventar frete ou imposto."
        breadcrumbs={[
          { label: "Compras", href: `/${tenantSlug}/compras` },
          { label: "Cotações" },
        ]}
      />
      {error ? (
        <p className="text-sm text-muted-foreground" role="status">
          {error}
        </p>
      ) : null}
      <QuotationComparisonClient tenantSlug={tenantSlug} lines={lines} />
    </div>
  );
}
