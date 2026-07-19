import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { formatCurrency } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";
import type { DashboardChartPoint } from "@/types/dashboard-executive";

type DualBarChartProps = {
  title: string;
  description: string;
  data: DashboardChartPoint[];
  primaryLabel?: string;
  secondaryLabel?: string;
  emptyDescription?: string;
};

export function DashboardDualBarChart({
  title,
  description,
  data,
  primaryLabel = "Entradas",
  secondaryLabel = "Saídas",
  emptyDescription = "Nenhum dado para o período selecionado.",
}: DualBarChartProps) {
  const hasValues = data.some(
    (point) => point.value !== 0 || (point.secondary ?? 0) !== 0,
  );

  if (data.length === 0 || !hasValues) {
    return (
      <DashboardSection title={title} description={description}>
        <DashboardEmptyState
          className="border-0 bg-transparent py-10"
          title="Sem dados no período"
          description={emptyDescription}
        />
      </DashboardSection>
    );
  }

  const maxValue = Math.max(
    ...data.flatMap((point) => [point.value, point.secondary ?? 0]),
    1,
  );

  return (
    <DashboardSection title={title} description={description}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-emerald-500" />
            {primaryLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-rose-500" />
            {secondaryLabel}
          </span>
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <div
            className="flex min-w-[28rem] items-end gap-1.5 sm:min-w-0 sm:gap-2"
            role="img"
            aria-label={title}
          >
            {data.map((point) => {
              const primaryHeight = (point.value / maxValue) * 100;
              const secondaryHeight =
                ((point.secondary ?? 0) / maxValue) * 100;

              return (
                <div
                  key={point.data}
                  className="flex min-w-0 flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-36 w-full items-end justify-center gap-0.5 sm:h-44 sm:gap-1">
                    <div
                      className="w-full max-w-4 rounded-t bg-emerald-500/85"
                      style={{
                        height: `${primaryHeight}%`,
                        minHeight: point.value > 0 ? "3px" : "0",
                      }}
                      title={`${primaryLabel}: ${formatCurrency(point.value)}`}
                    />
                    <div
                      className="w-full max-w-4 rounded-t bg-rose-500/85"
                      style={{
                        height: `${secondaryHeight}%`,
                        minHeight: (point.secondary ?? 0) > 0 ? "3px" : "0",
                      }}
                      title={`${secondaryLabel}: ${formatCurrency(point.secondary ?? 0)}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground sm:text-xs">
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardSection>
  );
}

type SingleBarChartProps = {
  title: string;
  description: string;
  data: DashboardChartPoint[];
  barClassName?: string;
  emptyDescription?: string;
};

export function DashboardBarChart({
  title,
  description,
  data,
  barClassName = "bg-emerald-500/85",
  emptyDescription = "Nenhum dado para o período selecionado.",
}: SingleBarChartProps) {
  const hasValues = data.some((point) => point.value !== 0);

  if (data.length === 0 || !hasValues) {
    return (
      <DashboardSection title={title} description={description}>
        <DashboardEmptyState
          className="border-0 bg-transparent py-10"
          title="Sem dados no período"
          description={emptyDescription}
        />
      </DashboardSection>
    );
  }

  const maxValue = Math.max(...data.map((point) => point.value), 1);

  return (
    <DashboardSection title={title} description={description}>
      <div className="overflow-x-auto -mx-1 px-1">
        <div
          className="flex min-w-[28rem] items-end gap-1.5 sm:min-w-0 sm:gap-2"
          role="img"
          aria-label={title}
        >
          {data.map((point) => {
            const height = (point.value / maxValue) * 100;
            return (
              <div
                key={point.data}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <div className="flex h-36 w-full items-end justify-center sm:h-44">
                  <div
                    className={cn("w-full max-w-5 rounded-t", barClassName)}
                    style={{
                      height: `${height}%`,
                      minHeight: point.value > 0 ? "3px" : "0",
                    }}
                    title={formatCurrency(point.value)}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground sm:text-xs">
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardSection>
  );
}

type LineChartProps = {
  title: string;
  description: string;
  data: DashboardChartPoint[];
  strokeClassName?: string;
  emptyDescription?: string;
  formatValue?: (value: number) => string;
};

export function DashboardLineChart({
  title,
  description,
  data,
  strokeClassName = "stroke-emerald-500",
  emptyDescription = "Nenhum dado para o período selecionado.",
  formatValue = formatCurrency,
}: LineChartProps) {
  const hasValues = data.some((point) => point.value !== 0);

  if (data.length === 0 || !hasValues) {
    return (
      <DashboardSection title={title} description={description}>
        <DashboardEmptyState
          className="border-0 bg-transparent py-10"
          title="Sem dados no período"
          description={emptyDescription}
        />
      </DashboardSection>
    );
  }

  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 100;
  const height = 40;
  const paddingY = 4;

  const points = data
    .map((point, index) => {
      const x =
        data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
      const y =
        height -
        paddingY -
        ((point.value - min) / range) * (height - paddingY * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const last = data[data.length - 1]!;

  return (
    <DashboardSection title={title} description={description}>
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-muted-foreground">Último ponto</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatValue(last.value)}
          </p>
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-40 w-full overflow-visible"
          role="img"
          aria-label={title}
        >
          <polyline
            fill="none"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            points={points}
            className={strokeClassName}
          />
          {data.map((point, index) => {
            const x =
              data.length === 1
                ? width / 2
                : (index / (data.length - 1)) * width;
            const y =
              height -
              paddingY -
              ((point.value - min) / range) * (height - paddingY * 2);
            return (
              <circle
                key={point.data}
                cx={x}
                cy={y}
                r="1.2"
                className="fill-emerald-600 dark:fill-emerald-400"
              >
                <title>{`${point.label}: ${formatValue(point.value)}`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="flex justify-between text-[10px] text-muted-foreground sm:text-xs">
          <span>{data[0]?.label}</span>
          <span>{last.label}</span>
        </div>
      </div>
    </DashboardSection>
  );
}
