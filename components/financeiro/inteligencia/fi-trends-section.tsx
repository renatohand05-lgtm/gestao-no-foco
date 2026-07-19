import {
  DashboardBarChart,
  DashboardDualBarChart,
} from "@/components/dashboard/dashboard-charts";
import type { FiTrendSeries } from "@/lib/financial-intelligence/types";

type Props = {
  trends: FiTrendSeries[];
};

export function FiTrendsSection({ trends }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Tendências</h2>
        <p className="text-sm text-muted-foreground">
          Séries construídas a partir dos totais do DRE (competência) e do Fluxo
          de Caixa (movimentação). Sem recalcular fórmulas.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {trends.map((series) => {
          const hasSecondary = series.points.some(
            (p) => p.secondary != null && p.secondary !== 0,
          );
          if (
            hasSecondary ||
            series.id === "fluxo-periodo" ||
            series.id === "ebitda-vs-despesas"
          ) {
            return (
              <DashboardDualBarChart
                key={series.id}
                title={series.label}
                description={series.description}
                data={series.points}
                primaryLabel={
                  series.id === "fluxo-periodo" ? "Entradas" : "EBITDA"
                }
                secondaryLabel={
                  series.id === "fluxo-periodo" ? "Saídas" : "Despesas"
                }
              />
            );
          }
          return (
            <DashboardBarChart
              key={series.id}
              title={series.label}
              description={series.description}
              data={series.points}
            />
          );
        })}
      </div>
    </div>
  );
}
