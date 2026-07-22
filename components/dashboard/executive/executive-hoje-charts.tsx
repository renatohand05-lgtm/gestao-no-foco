import type { ReactNode } from "react";

import {
  ExecutiveCard,
  ExecutiveSection,
} from "@/components/executive";
import { formatCurrency, formatNumber } from "@/lib/dashboard/format";
import type { DashboardHojeSnapshot } from "@/lib/dashboard/vendas-dia-service";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: DashboardHojeSnapshot;
};

/**
 * Gráficos: realizado × meta diária, acumulados, ticket e quantidade.
 */
export function ExecutiveHojeCharts({ data }: Props) {
  const serie = data.serie_diaria;
  if (serie.length === 0) return null;

  const maxDaily = Math.max(
    ...serie.map((d) => Math.max(d.realizado, d.meta_diaria)),
    1,
  );
  const maxAcum = Math.max(
    ...serie.map((d) => Math.max(d.acumulado_realizado, d.acumulado_meta)),
    1,
  );
  const maxTicket = Math.max(...serie.map((d) => d.ticket_medio), 1);
  const maxQty = Math.max(...serie.map((d) => d.quantidade_vendas), 1);

  return (
    <ExecutiveSection
      title="Séries do mês"
      description="Realizado, meta, acumulados, ticket médio e quantidade de vendas."
      panel
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Realizado × meta diária">
          <Bars
            points={serie.map((d) => ({
              key: d.data,
              label: d.data.slice(8),
              a: d.realizado,
              b: d.meta_diaria,
              tip: `${d.data}: real ${formatCurrency(d.realizado)} / meta ${formatCurrency(d.meta_diaria)}`,
            }))}
            max={maxDaily}
            aClass="bg-emerald-600"
            bClass="bg-blue-600/70"
          />
        </ChartCard>

        <ChartCard title="Acumulado realizado × meta">
          <Bars
            points={serie.map((d) => ({
              key: d.data,
              label: d.data.slice(8),
              a: d.acumulado_realizado,
              b: d.acumulado_meta,
              tip: `${d.data}: acum real ${formatCurrency(d.acumulado_realizado)} / meta ${formatCurrency(d.acumulado_meta)}`,
            }))}
            max={maxAcum}
            aClass="bg-emerald-600"
            bClass="bg-blue-600/70"
          />
        </ChartCard>

        <ChartCard title="Ticket médio por dia">
          <SingleBars
            points={serie.map((d) => ({
              key: d.data,
              label: d.data.slice(8),
              value: d.ticket_medio,
              tip: `${d.data}: ${formatCurrency(d.ticket_medio)}`,
            }))}
            max={maxTicket}
            barClass="bg-violet-600"
          />
        </ChartCard>

        <ChartCard title="Quantidade de vendas por dia">
          <SingleBars
            points={serie.map((d) => ({
              key: d.data,
              label: d.data.slice(8),
              value: d.quantidade_vendas,
              tip: `${d.data}: ${formatNumber(d.quantidade_vendas)} vendas`,
            }))}
            max={maxQty}
            barClass="bg-sky-600"
          />
        </ChartCard>
      </div>
    </ExecutiveSection>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <ExecutiveCard padding={20} className={exAnimations.fade}>
      <h3 className={cn(exTypography.sectionTitle, "mb-4")}>{title}</h3>
      {children}
    </ExecutiveCard>
  );
}

function Bars({
  points,
  max,
  aClass,
  bClass,
}: {
  points: Array<{
    key: string;
    label: string;
    a: number;
    b: number;
    tip: string;
  }>;
  max: number;
  aClass: string;
  bClass: string;
}) {
  return (
    <div
      className="flex h-40 items-end gap-1 overflow-x-auto"
      role="img"
      aria-label="Gráfico de barras comparativo"
    >
      {points.map((p) => (
        <div
          key={p.key}
          title={p.tip}
          className="flex min-w-[14px] flex-1 flex-col items-center justify-end gap-0.5"
        >
          <div className="flex h-32 w-full items-end justify-center gap-px">
            <div
              className={cn("w-[45%] rounded-t-sm", aClass)}
              style={{ height: `${(p.a / max) * 100}%` }}
            />
            <div
              className={cn("w-[45%] rounded-t-sm", bClass)}
              style={{ height: `${(p.b / max) * 100}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

function SingleBars({
  points,
  max,
  barClass,
}: {
  points: Array<{ key: string; label: string; value: number; tip: string }>;
  max: number;
  barClass: string;
}) {
  return (
    <div
      className="flex h-40 items-end gap-1 overflow-x-auto"
      role="img"
      aria-label="Gráfico de barras"
    >
      {points.map((p) => (
        <div
          key={p.key}
          title={p.tip}
          className="flex min-w-[12px] flex-1 flex-col items-center justify-end gap-0.5"
        >
          <div className="flex h-32 w-full items-end justify-center">
            <div
              className={cn("w-full max-w-[18px] rounded-t-sm", barClass)}
              style={{ height: `${(p.value / max) * 100}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
