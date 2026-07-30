import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { DataQualityPanel } from "@/components/import-engine/data-quality-panel";
import { IntelligenceHealthCard } from "@/components/import-engine/intelligence-health-card";
import { IntelligenceHubNav } from "@/components/import-engine/intelligence-hub-nav";
import {
  buildDataQualitySummary,
  buildHealthScore,
} from "@/components/import-engine/intelligence-presentation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { listImportRuns } from "@/lib/import-engine/intelligence/intelligence-actions";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Qualidade dos Dados" };

export default async function QualidadeDadosPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  const runsR = await listImportRuns(tenantSlug, { limit: 100, offset: 0 });
  const runs = runsR.success ? runsR.items : [];
  const total = runsR.success ? runsR.total : 0;
  const quality = buildDataQualitySummary(runs, total);
  const health = buildHealthScore(runs);

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs
        items={[
          { label: "Integrações", href: `/${tenantSlug}/integracoes` },
          { label: "Qualidade dos Dados" },
        ]}
      />
      <ExecutiveHeader
        title="Qualidade dos Dados"
        description="Métricas agregadas exclusivamente a partir de runs reais — sem números fictícios."
      />
      <IntelligenceHubNav tenantSlug={tenantSlug} />
      <ExecutiveSection
        title="Painel de qualidade"
        description="Status, registros importados/rejeitados e erros reportados."
        panel
      >
        <DataQualityPanel summary={quality} tenantSlug={tenantSlug} />
      </ExecutiveSection>
      <ExecutiveSection
        title="Health Score"
        description="Estimativa visual derivada dos runs carregados."
        panel
      >
        <IntelligenceHealthCard health={health} />
      </ExecutiveSection>
    </ExecutivePage>
  );
}
