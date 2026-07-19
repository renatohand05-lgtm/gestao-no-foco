import Link from "next/link";

import {
  ExecutiveCard,
  ExecutiveProgress,
  ExecutiveSection,
} from "@/components/executive";
import { ExecutiveSectionState } from "@/components/dashboard/executive/executive-section-state";
import { buildRankingItemHref } from "@/lib/dashboard/drill-down";
import { formatCurrency, formatPercent } from "@/lib/dashboard/format";
import {
  exAnimations,
  exRadius,
  exSize,
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

function medalClass(rank: number) {
  if (rank === 1) return "bg-amber-500 text-white";
  if (rank === 2) return "bg-slate-400 text-white";
  if (rank === 3) return "bg-orange-700 text-white";
  return "bg-muted text-muted-foreground";
}

function RankingCard({
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
    <ExecutiveCard padding={24} className={cn("h-full", exAnimations.fade)}>
      <h3 className={exTypography.label}>{title}</h3>
      {items.length === 0 ? (
        <div
          className={cn(
            "mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/30 px-4 text-center",
            exSize.rankingEmpty,
          )}
        >
          <p className={exTypography.caption}>{empty}</p>
        </div>
      ) : (
        <ol className="mt-4 space-y-3.5">
          {items.slice(0, 5).map((item, index) => {
            const rank = index + 1;
            const href = hrefFor?.(item) ?? null;
            const content = (
              <div
                className={cn(
                  "rounded-2xl px-2.5 py-2.5",
                  rank <= 3 && "bg-blue-600/[0.03] ring-1 ring-blue-600/10",
                  href && cn(exAnimations.hoverLift, "hover:bg-muted/50"),
                )}
              >
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    <span
                      className={cn(
                        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
                        medalClass(rank),
                      )}
                      aria-label={`Posição ${rank}`}
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
                      <span
                        className={cn(
                          "mt-0.5 block tabular-nums",
                          exTypography.micro,
                        )}
                      >
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

export function ExecutiveRankingsGrid({ tenantSlug, data, filters }: Props) {
  const monthFilters: DashboardFilters = {
    ...filters,
    dataDe: data.dataDe,
    dataAte: data.dataAte,
  };
  const r = data.rankings;
  const hasAny =
    r.clientes.length + r.produtos.length + r.servicos.length + r.centros.length >
    0;

  if (!hasAny) {
    return (
      <ExecutiveSection
        title="Rankings executivos"
        description="Top clientes, produtos, serviços e centros."
      >
        <ExecutiveSectionState
          variant="empty"
          title="Sem rankings no período"
          description="Quando houver vendas faturadas, os tops aparecem aqui."
          actionHref={`/${tenantSlug}/vendas/nova`}
          actionLabel="Registrar venda"
        />
      </ExecutiveSection>
    );
  }

  const description = `Top clientes, produtos, serviços e centros.${
    !r.vendedor_disponivel ? " Ranking de vendedores indisponível." : ""
  }`;

  return (
    <ExecutiveSection
      title="Oportunidades"
      description={description}
      panel
    >
      <div className={cn("grid lg:grid-cols-2", exSpacing[16])}>
        <RankingCard
          title="Top clientes"
          items={r.clientes}
          empty="Nenhum cliente ranqueado."
          hrefFor={(item) =>
            buildRankingItemHref(tenantSlug, "clientes", item.id, monthFilters)
          }
        />
        <RankingCard
          title="Top produtos"
          items={r.produtos}
          empty="Nenhum produto ranqueado."
          hrefFor={(item) =>
            buildRankingItemHref(tenantSlug, "produtos", item.id, monthFilters)
          }
        />
        <RankingCard
          title="Top serviços"
          items={r.servicos}
          empty="Nenhum serviço ranqueado."
          hrefFor={(item) =>
            buildRankingItemHref(tenantSlug, "servicos", item.id, monthFilters)
          }
        />
        <RankingCard
          title="Top centros"
          items={r.centros}
          empty="Nenhum centro ranqueado."
          hrefFor={(item) =>
            `/${tenantSlug}/vendas?dataDe=${monthFilters.dataDe}&dataAte=${monthFilters.dataAte}&centroCusto=${item.id}`
          }
        />
      </div>
    </ExecutiveSection>
  );
}

export function ExecutiveRankingsGridSkeleton() {
  return (
    <div
      className={cn("grid lg:grid-cols-2", exSpacing[16])}
      aria-busy="true"
      aria-label="Carregando rankings"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-64 bg-muted/40",
            exRadius[20],
            exAnimations.shimmer,
          )}
        />
      ))}
    </div>
  );
}
