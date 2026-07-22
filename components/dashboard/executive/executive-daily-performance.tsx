import { civilDateInTimezone, resolveTenantTimezone } from "@/lib/dashboard/tenant-timezone";
import Link from "next/link";

import {
  ExecutiveCard,
  ExecutiveSection,
} from "@/components/executive";
import { ExecutiveSectionState } from "@/components/dashboard/executive/executive-section-state";
import { formatCurrency } from "@/lib/dashboard/format";
import {
  exAnimations,
  exMotion,
  exRadius,
  exSize,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { CommercialPanelData } from "@/types/commercial-panel";

type Props = {
  tenantSlug: string;
  data: CommercialPanelData;
};

/**
 * Painel diário premium — cada dia como card.
 */
export function ExecutiveDailyPerformance({ tenantSlug, data }: Props) {
  if (data.daily.length === 0) {
    return (
      <ExecutiveSection
        title="Painel diário"
        description="Desempenho por dia do mês."
      >
        <ExecutiveSectionState
          variant="empty"
          title="Sem dias no período"
          description="Não há pontos diários para exibir."
        />
      </ExecutiveSection>
    );
  }

  const todayIso = civilDateInTimezone(new Date(), resolveTenantTimezone());
  const maxDaily = Math.max(
    ...data.daily.map((d) => Math.max(d.realizado, d.meta_diaria, d.projetado)),
    1,
  );

  return (
    <ExecutiveSection
      title="Operação diária"
      description="Cada dia conta a história do ritmo — problemas aparecem no heatmap abaixo."
      panel
    >
      <ExecutiveCard padding={24} className={exAnimations.fade}>
        <div
          className={cn(
            "mb-5 flex flex-wrap gap-4 border-b border-border/40 pb-4",
            exTypography.caption,
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-600" /> Realizado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-blue-600" /> Meta
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-violet-500" /> Projetado
          </span>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className={cn("flex gap-3", exSize.chartScrollDaily)}>
            {data.daily.map((d) => {
              const isToday = d.data === todayIso;
              const hReal = (d.realizado / maxDaily) * 100;
              const hMeta = (d.meta_diaria / maxDaily) * 100;
              const hProj = (d.projetado / maxDaily) * 100;
              const tip = [
                d.data,
                `Meta ${formatCurrency(d.meta_diaria)}`,
                `Realizado ${formatCurrency(d.realizado)}`,
                `Projetado ${formatCurrency(d.projetado)}`,
                d.diferenca !== null
                  ? `Diff ${formatCurrency(d.diferenca)}`
                  : null,
                isToday ? "Hoje" : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <Link
                  key={d.data}
                  href={`/${tenantSlug}/vendas?dataDe=${d.data}&dataAte=${d.data}&status=faturado`}
                  title={tip}
                  aria-label={tip}
                  className={cn(
                    "flex w-14 shrink-0 flex-col gap-3 border border-border/40 bg-gradient-to-b from-card to-muted/20 p-2.5",
                    exMotion.transition,
                    exRadius[16],
                    exAnimations.focusRing,
                    exAnimations.hoverLift,
                    exAnimations.hoverGlow,
                    d.is_weekend && "opacity-70",
                    d.is_future &&
                      "border-dashed border-violet-400/50 bg-violet-500/[0.06]",
                    !d.is_future &&
                      d.realizado > 0 &&
                      "border-emerald-600/15",
                    isToday &&
                      "border-blue-600/50 from-blue-50/80 to-card ring-2 ring-blue-600/25 dark:from-blue-950/40",
                  )}
                >
                  <span
                    className={cn(
                      "text-center font-semibold tabular-nums",
                      exTypography.micro,
                      isToday ? "text-blue-600" : undefined,
                    )}
                  >
                    {d.label}
                  </span>
                  <div className="flex h-28 items-end justify-center gap-0.5">
                    {d.is_future ? (
                      <div
                        className="w-2.5 rounded-t bg-violet-500/80"
                        style={{
                          height: `${hProj}%`,
                          minHeight: d.projetado > 0 ? "2px" : "0",
                        }}
                      />
                    ) : (
                      <>
                        <div
                          className="w-2 rounded-t bg-emerald-600/90"
                          style={{
                            height: `${hReal}%`,
                            minHeight: d.realizado > 0 ? "2px" : "0",
                          }}
                        />
                        <div
                          className="w-2 rounded-t bg-blue-600/85"
                          style={{
                            height: `${hMeta}%`,
                            minHeight: d.meta_diaria > 0 ? "2px" : "0",
                          }}
                        />
                      </>
                    )}
                  </div>
                  <span className={cn("truncate text-center", exTypography.caption)}>
                    {formatCurrency(d.is_future ? d.projetado : d.realizado)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </ExecutiveCard>
    </ExecutiveSection>
  );
}

export function ExecutiveDailyPerformanceSkeleton() {
  return (
    <div
      className={cn(
        "h-60 bg-muted/40",
        exRadius[20],
        exAnimations.shimmer,
      )}
      aria-busy="true"
      aria-label="Carregando painel diário"
    />
  );
}
