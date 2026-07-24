import { CrmExecutivoKpis } from "@/components/crm/crm-executivo-kpis";
import { CrmExecutivoOportunidades } from "@/components/crm/crm-executivo-oportunidades";
import { CrmExecutivoRanking } from "@/components/crm/crm-executivo-ranking";
import { CrmExecutivoRisco } from "@/components/crm/crm-executivo-risco";
import { CrmSubnav } from "@/components/crm/crm-subnav";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import {
  resolveCrmExecRankingKey,
  type CrmExecRankingKey,
} from "@/lib/crm/crm-executivo-compose";
import { createCrmExecutivoService } from "@/lib/crm/crm-executivo-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "CRM Executivo" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ ranking?: string }>;
};

export default async function CrmExecutivoCentralPage({
  params,
  searchParams,
}: PageProps) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const ranking = resolveCrmExecRankingKey(sp.ranking);

  const service = await createCrmExecutivoService(tenant.id);
  const portfolio = await service.loadPortfolio();
  const rankingRows = portfolio.rankings[ranking as CrmExecRankingKey];

  return (
    <div className="space-y-6">
      <CrmSubnav tenantSlug={tenantSlug} active="clientes/central" />
      <ModuleHeader
        title="Central Inteligente de Clientes"
        description="Inteligência executiva derivada dos dados atuais — sem IA."
        breadcrumbs={[
          { label: "Clientes", href: `/${tenantSlug}/clientes` },
          { label: "CRM Executivo" },
        ]}
      />

      <SectionCard title="KPIs executivos">
        <CrmExecutivoKpis kpis={portfolio.kpis} />
      </SectionCard>

      <SectionCard title="Ranking executivo">
        <CrmExecutivoRanking
          tenantSlug={tenantSlug}
          ranking={ranking}
          rows={rankingRows}
        />
      </SectionCard>

      <CrmExecutivoRisco tenantSlug={tenantSlug} items={portfolio.riscos} />

      <CrmExecutivoOportunidades
        tenantSlug={tenantSlug}
        items={portfolio.oportunidades}
        acoes={portfolio.acoes}
      />
    </div>
  );
}
