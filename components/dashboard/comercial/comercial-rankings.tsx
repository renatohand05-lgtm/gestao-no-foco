import Link from "next/link";

import { buildRankingItemHref } from "@/lib/dashboard/drill-down";
import { formatCurrency, formatPercent } from "@/lib/dashboard/format";
import {
  ExecutiveCard,
  ExecutiveProgress,
  ExecutiveSection,
} from "@/components/executive";
import {
  exAnimations,
  exSpacing,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type {
  CommercialPanelData,
  CommercialRankingItem,
} from "@/types/commercial-panel";
import type { DashboardFilters } from "@/types/dashboard-executive";

type Props = {
  tenantSlug: string;
  data: CommercialPanelData;
  filters: DashboardFilters;
};

function RankingList({
  title,
  items,
  empty,
  hrefFor,
}: {
  title: string;
  items: CommercialRankingItem[];
  empty: string;
  hrefFor?: (item: CommercialRankingItem) => string | null | undefined;
}) {
  const max = Math.max(...items.map((i) => i.valor), 1);

  return (
    <ExecutiveCard padding={20} className={cn("h-full", exAnimations.fade)}>
      <h5 className={exTypography.label}>{title}</h5>
      {items.length === 0 ? (
        <div className="mt-6 flex min-h-[8rem] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 text-center">
          <p className={exTypography.caption}>{empty}</p>
        </div>
      ) : (
        <ol className="mt-3 space-y-3">
          {items.slice(0, 5).map((item, index) => {
            const href = hrefFor?.(item) ?? null;
            const rank = index + 1;
            const content = (
              <div
                className={cn(
                  "rounded-xl px-2 py-2",
                  href &&
                    cn(
                      exAnimations.hoverLift,
                      "hover:bg-muted/40",
                    ),
                )}
              >
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    <span
                      className={cn(
                        "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums",
                        rank === 1 && "bg-blue-600 text-white",
                        rank === 2 && "bg-blue-600/70 text-white",
                        rank === 3 && "bg-blue-600/50 text-white",
                        rank > 3 && "bg-muted text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {rank}
                    </span>
                    <span className="truncate font-medium">{item.label}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(item.valor)}
                    </span>
                    {item.participacao_pct !== null ? (
                      <span className="mt-0.5 block text-[11px] tabular-nums text-muted-foreground">
                        {formatPercent(item.participacao_pct)}
                      </span>
                    ) : null}
                  </span>
                </div>
                <ExecutiveProgress
                  value={item.valor}
                  max={max}
                  showValue={false}
                  tone="primary"
                  size="sm"
                  className="mt-2"
                />
              </div>
            );
            return (
              <li key={item.id}>
                {href ? (
                  <Link
                    href={href}
                    className={cn("block", exAnimations.focusRing)}
                    aria-label={`${item.label}: ${formatCurrency(item.valor)}`}
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ol>
      )}
    </ExecutiveCard>
  );
}

export function ComercialRankings({ tenantSlug, data, filters }: Props) {
  const monthFilters: DashboardFilters = {
    ...filters,
    dataDe: data.dataDe,
    dataAte: data.dataAte,
  };
  const r = data.rankings;

  const description = `Top clientes, produtos, serviços e centros no mês da competência.${
    !r.vendedor_disponivel
      ? " Ranking de vendedores indisponível — vendas sem campo de vendedor."
      : ""
  }`;

  return (
    <ExecutiveSection title="Rankings comerciais" description={description}>
      <div className={cn("grid lg:grid-cols-2", exSpacing[16])}>
        <RankingList
          title="Top clientes"
          items={r.clientes}
          empty="Nenhum cliente ranqueado no período."
          hrefFor={(item) =>
            buildRankingItemHref(tenantSlug, "clientes", item.id, monthFilters)
          }
        />
        <RankingList
          title="Top produtos"
          items={r.produtos}
          empty="Nenhum produto ranqueado no período."
          hrefFor={(item) =>
            buildRankingItemHref(tenantSlug, "produtos", item.id, monthFilters)
          }
        />
        <RankingList
          title="Top serviços"
          items={r.servicos}
          empty="Nenhum serviço ranqueado no período."
          hrefFor={(item) =>
            buildRankingItemHref(tenantSlug, "servicos", item.id, monthFilters)
          }
        />
        <RankingList
          title="Top centros"
          items={r.centros}
          empty="Nenhum centro com faturamento no período."
          hrefFor={(item) =>
            `/${tenantSlug}/vendas?dataDe=${monthFilters.dataDe}&dataAte=${monthFilters.dataAte}&centroCusto=${item.id}`
          }
        />
      </div>
    </ExecutiveSection>
  );
}
