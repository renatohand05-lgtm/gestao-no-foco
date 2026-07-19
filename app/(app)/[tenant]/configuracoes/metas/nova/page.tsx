import { MetaVendasForm } from "@/components/metas/meta-vendas-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { createMetaVendasService } from "@/lib/metas/meta-vendas-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Nova meta de vendas" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ competencia?: string; centroCusto?: string }>;
};

export default async function NovaMetaPage({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const { competencia, centroCusto } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createMetaVendasService(tenant.id);
  const centrosCusto = await service.listCentrosCustoOptions();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Nova meta mensal"
        description="Defina o faturamento-alvo do mês"
        breadcrumbs={[
          { label: "Configurações", href: `/${tenantSlug}/configuracoes` },
          { label: "Metas", href: `/${tenantSlug}/configuracoes/metas` },
          { label: "Nova" },
        ]}
      />

      <MetaVendasForm
        mode="create"
        tenantSlug={tenantSlug}
        centrosCusto={centrosCusto}
        defaultCompetencia={competencia}
        defaultCentroCustoId={centroCusto}
      />
    </div>
  );
}
