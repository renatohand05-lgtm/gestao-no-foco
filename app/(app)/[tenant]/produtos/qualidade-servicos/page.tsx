import { ModuleHeader } from "@/components/layout/module-header";
import { ServiceQualityPanel } from "@/components/produtos/service-quality-panel";
import { ActionButton } from "@/components/ui/action-button";
import {
  exportServiceInconsistenciesCsv,
  getServiceQualityReport,
} from "@/lib/produtos/service-quality-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Qualidade da base de serviços" };

type Props = {
  params: Promise<{ tenant: string }>;
};

export default async function QualidadeServicosPage({ params }: Props) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const report = await getServiceQualityReport(tenant.id);
  const csv = await exportServiceInconsistenciesCsv(tenant.id);
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Qualidade da base de serviços"
        description="Inconsistências de custo, preço, categoria e utilização."
        breadcrumbs={[
          { label: "Produtos & Serviços", href: `/${tenantSlug}/produtos` },
          { label: "Qualidade" },
        ]}
      >
        <ActionButton
          action="view"
          label="Gerenciar base"
          href={`/${tenantSlug}/produtos/gerenciar-servicos`}
        />
        <a
          href={csvHref}
          download="inconsistencias-servicos.csv"
          className="inline-flex h-9 items-center rounded-xl border border-border px-3 text-sm"
        >
          Exportar inconsistências
        </a>
      </ModuleHeader>

      <ServiceQualityPanel report={report} />
    </div>
  );
}
