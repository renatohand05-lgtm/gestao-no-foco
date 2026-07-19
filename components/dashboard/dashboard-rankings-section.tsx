import { DashboardRankingList } from "@/components/dashboard/dashboard-rankings";
import { dsGrid, dsSpace, dsType } from "@/lib/design-system";
import type {
  DashboardFilters,
  DashboardRankings,
  DashboardPeriodo,
} from "@/types/dashboard-executive";

type DashboardRankingsSectionProps = {
  tenantSlug: string;
  filters: DashboardFilters;
  rankings: DashboardRankings;
  periodo: DashboardPeriodo;
};

export function DashboardRankingsSection({
  tenantSlug,
  filters,
  rankings,
  periodo,
}: DashboardRankingsSectionProps) {
  return (
    <section className={dsSpace.section} aria-label="Rankings do período">
      <div>
        <h3 className={dsType.sectionTitle}>Rankings do período</h3>
        <p className={dsType.description}>
          Top 5 por faturamento e receita em {periodo.label}
        </p>
      </div>
      <div className={dsGrid.twoCol}>
        <DashboardRankingList
          tenantSlug={tenantSlug}
          filters={filters}
          rankingType="clientes"
          title="Top clientes"
          description="Faturamento de vendas faturadas"
          items={rankings.clientes}
        />
        <DashboardRankingList
          tenantSlug={tenantSlug}
          filters={filters}
          rankingType="produtos"
          title="Top produtos"
          description="Receita de itens tipo produto"
          items={rankings.produtos}
        />
        <DashboardRankingList
          tenantSlug={tenantSlug}
          filters={filters}
          rankingType="servicos"
          title="Top serviços"
          description="Receita de itens tipo serviço"
          items={rankings.servicos}
        />
        <DashboardRankingList
          tenantSlug={tenantSlug}
          filters={filters}
          rankingType="categorias"
          title="Top categorias financeiras"
          description="Vendas faturadas + CR avulsas por categoria"
          items={rankings.categorias}
        />
      </div>
    </section>
  );
}

export function DashboardRankingsSectionSkeleton() {
  return (
    <div className={dsGrid.twoCol} aria-busy="true" aria-label="Carregando rankings">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-56 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
      ))}
    </div>
  );
}
