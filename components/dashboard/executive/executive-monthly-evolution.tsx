import {
  ExecutiveCard,
  ExecutiveSection,
} from "@/components/executive";
import { ExecutiveSectionState } from "@/components/dashboard/executive/executive-section-state";
import { formatCurrency } from "@/lib/dashboard/format";
import {
  exAnimations,
  exRadius,
  exShadow,
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
 * Evolução acumulada Meta × Realizado × Projeção — mesmos dados, UI premium.
 */
export function ExecutiveMonthlyEvolution({ tenantSlug, data }: Props) {
  if (data.daily.length === 0) {
    return (
      <ExecutiveSection
        title="Evolução mensal"
        description="Meta, realizado e projeção acumulados."
        panel
      >
        <ExecutiveSectionState
          variant="empty"
          title="Sem série diária"
          description="Não há pontos diários para este período."
          actionHref={`/${tenantSlug}/vendas/nova`}
          actionLabel="Registrar venda"
        />
      </ExecutiveSection>
    );
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const maxAcum = Math.max(
    ...data.daily.map((d) =>
      Math.max(d.acumulado_realizado, d.acumulado_meta, d.acumulado_projetado),
    ),
    1,
  );

  return (
    <ExecutiveSection
      title="Evolução"
      description="Como a meta, o realizado e a projeção caminham no mês."
      panel
    >
      <ExecutiveCard padding={24} className={exAnimations.fade}>
        <div className="flex flex-col gap-3 border-b border-border/40 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className={exTypography.sectionTitle}>Trajetória do mês</h3>
            <p className={exTypography.caption}>
              Último ponto destacado · área leve sob o realizado
            </p>
          </div>
          <div className={cn("flex flex-wrap gap-4", exTypography.caption)}>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-600 shadow-sm shadow-emerald-600/30" aria-hidden />
              Realizado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-blue-600 shadow-sm shadow-blue-600/30" aria-hidden />
              Meta
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-violet-500 shadow-sm shadow-violet-500/30" aria-hidden />
              Projeção
            </span>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto pb-1">
          <div
            className={cn(
              "flex items-end gap-1.5 border-b border-dashed border-border/50 px-1",
              exSize.chartH,
              exSize.chartScrollMonthly,
            )}
            role="img"
            aria-label="Evolução acumulada meta versus realizado versus projeção"
          >
            {data.daily.map((d, index) => {
              const hReal = (d.acumulado_realizado / maxAcum) * 100;
              const hMeta = (d.acumulado_meta / maxAcum) * 100;
              const hProj = (d.acumulado_projetado / maxAcum) * 100;
              const isHighlight =
                d.data === todayIso || index === data.daily.length - 1;
              return (
                <div
                  key={d.data}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-0.5",
                    d.is_weekend && "opacity-60",
                    isHighlight && "bg-blue-600/5 ring-1 ring-blue-600/25",
                  )}
                  title={`${d.data}: real ${formatCurrency(d.acumulado_realizado)} · meta ${formatCurrency(d.acumulado_meta)} · proj ${formatCurrency(d.acumulado_projetado)}`}
                >
                  <div className="relative flex h-48 w-full items-end justify-center gap-px sm:h-56">
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-x-0.5 bottom-0 bg-gradient-to-t from-emerald-600/15 to-emerald-600/0",
                        exRadius[12],
                      )}
                      style={{ height: `${hReal}%` }}
                      aria-hidden
                    />
                    <div
                      className={cn(
                        "relative z-10 w-full max-w-[8px] rounded-t-md bg-emerald-600",
                        exAnimations.chartBar,
                        exShadow.successGlow,
                      )}
                      style={{
                        height: `${hReal}%`,
                        minHeight: d.acumulado_realizado > 0 ? "2px" : "0",
                      }}
                    />
                    <div
                      className={cn(
                        "relative z-10 w-full max-w-[8px] rounded-t-md bg-blue-600",
                        exAnimations.chartBar,
                      )}
                      style={{
                        height: `${hMeta}%`,
                        minHeight: d.acumulado_meta > 0 ? "2px" : "0",
                      }}
                    />
                    <div
                      className={cn(
                        "relative z-10 w-full max-w-[8px] rounded-t-md bg-violet-500/90",
                        exAnimations.chartBar,
                      )}
                      style={{
                        height: `${hProj}%`,
                        minHeight: d.acumulado_projetado > 0 ? "2px" : "0",
                      }}
                    />
                    {isHighlight && !d.is_future ? (
                      <span
                        className="absolute -top-1 size-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-card"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      exTypography.micro,
                      "tabular-nums",
                      isHighlight
                        ? "font-semibold text-blue-600"
                        : undefined,
                    )}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </ExecutiveCard>
    </ExecutiveSection>
  );
}

export function ExecutiveMonthlyEvolutionSkeleton() {
  return (
    <div
      className={cn(
        "h-80 bg-muted/40",
        exRadius[20],
        exAnimations.shimmer,
      )}
      aria-busy="true"
      aria-label="Carregando evolução mensal"
    />
  );
}
