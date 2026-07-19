import {
  DashboardBarChart,
  DashboardDualBarChart,
  DashboardLineChart,
} from "@/components/dashboard/dashboard-charts";
import {
  dsElevation,
  dsGrid,
  dsSpace,
  dsType,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { DashboardCharts, DashboardPeriodo } from "@/types/dashboard-executive";

type DashboardChartsSectionProps = {
  charts: DashboardCharts;
  periodo: DashboardPeriodo;
};

export function DashboardChartsSection({
  charts,
  periodo,
}: DashboardChartsSectionProps) {
  return (
    <section className={dsSpace.section} aria-label="Análise visual">
      <div>
        <h3 className={dsType.sectionTitle}>Análise visual</h3>
        <p className={dsType.description}>
          Comparações e séries do período {periodo.label}
        </p>
      </div>
      <div className={dsGrid.twoCol}>
        <DashboardBarChart
          title="Faturamento diário"
          description="Receita bruta diária (vendas faturadas + CR avulsas)"
          data={charts.faturamentoDiario}
        />
        <DashboardDualBarChart
          title="Receitas versus despesas"
          description="Entradas e saídas realizadas do Fluxo de Caixa"
          data={charts.receitasVsDespesas}
          primaryLabel="Receitas"
          secondaryLabel="Despesas"
        />
        <DashboardLineChart
          title="Fluxo de caixa acumulado"
          description="Saldo acumulado diário (realizado + previsto)"
          data={charts.fluxoAcumulado}
        />
        <DashboardLineChart
          title="Evolução do EBITDA"
          description="EBITDA por fatias do período (mesmo cálculo do DRE)"
          data={charts.ebitdaEvolucao}
          strokeClassName="stroke-cyan-500"
        />
      </div>
    </section>
  );
}

export function DashboardChartsSectionSkeleton() {
  return (
    <div className={dsGrid.twoCol} aria-busy="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={cn(dsElevation.skeleton, "h-64")} />
      ))}
    </div>
  );
}
