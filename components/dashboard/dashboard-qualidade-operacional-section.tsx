import { DashboardLineChart } from "@/components/dashboard/dashboard-charts";
import { DashboardQualidadeOperacionalCard } from "@/components/dashboard/dashboard-qualidade-operacional-card";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/dashboard/format";
import {
  dsElevation,
  dsGrid,
  dsPadding,
  dsRadius,
  dsSpace,
  dsType,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { QualidadeOperacionalData } from "@/types/qualidade-operacional";

type DashboardQualidadeOperacionalSectionProps = {
  tenantSlug: string;
  data: QualidadeOperacionalData;
  periodLabel: string;
};

function RankingMiniList({
  title,
  items,
  formatValue,
}: {
  title: string;
  items: QualidadeOperacionalData["rankings"]["mecanicos"];
  formatValue: "percent" | "number";
}) {
  if (items.length === 0) {
    return (
      <div className={cn(dsElevation.cardMuted, dsRadius.md, dsPadding.cardSm)}>
        <p className="text-sm font-medium">{title}</p>
        <p className={cn("mt-2", dsType.legend)}>Sem dados no período.</p>
      </div>
    );
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className={cn(dsElevation.cardMuted, dsRadius.md, dsPadding.cardSm)}>
      <p className="text-sm font-medium">{title}</p>
      <ol className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={item.id} className={dsSpace.stackXs}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">
                <span className="mr-1 text-muted-foreground">{index + 1}.</span>
                {item.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatValue === "percent"
                  ? formatPercent(item.value)
                  : formatNumber(item.value)}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-cyan-500/80"
                style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FinanceiroCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(dsElevation.card, dsRadius.md, dsPadding.cardSm, className)}
    >
      <p className={dsType.legend}>{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function DashboardQualidadeOperacionalSection({
  tenantSlug,
  data,
  periodLabel,
}: DashboardQualidadeOperacionalSectionProps) {
  const href = `/${tenantSlug}/ordens/qualidade-operacional`;

  const evolucaoTaxa = data.evolucaoMensal.map((point) => ({
    label: point.label,
    data: point.data,
    value: point.taxaPct,
  }));

  const evolucaoQuantidade = data.evolucaoMensal.map((point) => ({
    label: point.label,
    data: point.data,
    value: point.quantidade,
  }));

  const evolucaoValor = data.evolucaoMensal.map((point) => ({
    label: point.label,
    data: point.data,
    value: point.valorPerdido,
  }));

  return (
    <section className={dsSpace.section} aria-label="Qualidade Operacional">
      <div>
        <h3 className={dsType.sectionTitle}>Qualidade Operacional</h3>
        <p className={dsType.description}>
          Retornos de serviços e impacto operacional — {periodLabel}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardQualidadeOperacionalCard
          tenantSlug={tenantSlug}
          kpi={data.kpi}
          href={href}
        />

        <FinanceiroCard
          label="Receita perdida"
          value={formatCurrency(data.financeiro.receita_perdida)}
        />
        <FinanceiroCard
          label="Peças em garantia"
          value={formatCurrency(data.financeiro.pecas_garantia)}
        />
        <FinanceiroCard
          label="Horas de mão de obra"
          value={`${formatNumber(data.financeiro.horas_mao_obra)} h`}
        />
        <FinanceiroCard
          label="Custo total dos retornos"
          value={formatCurrency(data.financeiro.custo_total)}
          className="sm:col-span-2 xl:col-span-2"
        />
      </div>

      <div className={dsGrid.threeCol}>
        <RankingMiniList
          title="Top mecânicos — índice de retorno"
          items={data.rankings.mecanicos}
          formatValue="percent"
        />
        <RankingMiniList
          title="Top motivos de retorno"
          items={data.rankings.motivos}
          formatValue="number"
        />
        <RankingMiniList
          title="Top serviços — reincidência"
          items={data.rankings.servicos}
          formatValue="number"
        />
      </div>

      <div className={dsGrid.threeCol}>
        <DashboardLineChart
          title="Taxa de retorno mensal"
          description="Percentual de retornos sobre serviços concluídos"
          data={evolucaoTaxa}
          strokeClassName="stroke-amber-500"
        />
        <DashboardLineChart
          title="Quantidade de retornos"
          description="Retornos registrados por mês"
          data={evolucaoQuantidade}
          strokeClassName="stroke-cyan-500"
        />
        <DashboardLineChart
          title="Valor perdido mensal"
          description="Receita perdida em garantia por mês"
          data={evolucaoValor}
          strokeClassName="stroke-rose-500"
        />
      </div>
    </section>
  );
}

export function DashboardQualidadeOperacionalSectionSkeleton() {
  return (
    <div className={dsSpace.section} aria-busy="true">
      <div className="h-8 w-64 animate-pulse rounded bg-muted/40" />
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={cn(dsElevation.skeleton, "h-28")} />
        ))}
      </div>
    </div>
  );
}
