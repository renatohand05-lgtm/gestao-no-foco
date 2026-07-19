import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { mapComercialStatusPresentation } from "@/components/dashboard/comercial/comercial-status-badge";
import { ExecutiveScorePremium } from "@/components/executive/ExecutiveScorePremium";
import { ExecutiveSummary } from "@/components/executive/presentation";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import { formatCurrency } from "@/lib/dashboard/format";
import type { BusinessSummary } from "@/lib/business-intelligence";
import {
  composeExecutiveNarrative,
  type ExecutiveNarrative,
} from "@/lib/executive-presentation";
import {
  exAnimations,
  exMotion,
  exRadius,
  exShadow,
  exSize,
  exStagger,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import {
  CONFIANCA_LABEL,
  type CommercialPanelData,
} from "@/types/commercial-panel";
import type { DashboardTrend } from "@/types/dashboard-executive";
import type { ExecutiveScoreResult } from "@/lib/intelligence/types";

type NextAction = {
  title: string;
  impact: string;
  href?: string | null;
  actionLabel?: string | null;
};

type Signal = {
  title: string;
  detail?: string | null;
};

type Props = {
  tenantSlug: string;
  tenantName: string;
  greeting: string;
  data: CommercialPanelData;
  score: ExecutiveScoreResult;
  nextAction: NextAction | null;
  topRisk?: Signal | null;
  topOpportunity?: Signal | null;
  updatedAtLabel?: string;
  trendPct?: number | null;
  trend?: DashboardTrend | null;
  businessSummary?: BusinessSummary | null;
};

/**
 * Executive Cockpit Hero — Release Candidate (Sprint 13.10).
 * Esquerda: empresa + narrativa · Centro: Score protagonista + métricas · Direita: decisão.
 * Sem novos cálculos.
 */
export function ExecutiveHeroV2({
  tenantSlug,
  tenantName,
  greeting,
  data,
  score,
  nextAction,
  topRisk,
  topOpportunity,
  updatedAtLabel,
  trendPct = null,
  trend = null,
  businessSummary = null,
}: Props) {
  const p = data.projecao;
  const progressValue =
    p.status === "sem_meta" ? 0 : (p.percentual_atingido ?? 0);
  const presentation = mapComercialStatusPresentation(p.status);
  const metaHref = p.meta
    ? `/${tenantSlug}/configuracoes/metas/${p.meta.id}/editar`
    : `/${tenantSlug}/configuracoes/metas/nova?competencia=${data.competencia.slice(0, 7)}`;
  const ctaHref = nextAction?.href ?? metaHref;
  const ctaLabel =
    p.status === "sem_meta"
      ? "Definir meta"
      : nextAction?.actionLabel?.trim()
        ? nextAction.actionLabel
        : nextAction?.title
          ? "Executar decisão"
          : "Abrir dashboard";
  const gapTone =
    p.restante_meta !== null && p.restante_meta > 0 ? "warn" : "ok";

  const narrative: ExecutiveNarrative | null = businessSummary
    ? composeExecutiveNarrative({
        headline: businessSummary.headline,
        executiveSummary: businessSummary.executiveSummary,
        status: businessSummary.status,
        confidence: data.confianca,
        confidenceReason: data.confianca_motivo,
      })
    : null;

  const showRevenue = p.faturamento_realizado != null;
  const showMeta = p.valor_meta != null;
  const showGap = p.restante_meta != null;
  const showForecast = p.projecao_dias_uteis != null;

  return (
    <header
      className={cn(
        "relative isolate w-full overflow-hidden",
        exSize.hero,
        exRadius[24],
        exShadow.hero,
        exAnimations.fade,
      )}
      aria-label="Executive Cockpit"
    >
      <div
        className="absolute inset-0 bg-[linear-gradient(148deg,#05080f_0%,#0a1220_42%,#101a2c_100%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_48%_18%,rgba(56,189,248,0.16),transparent_55%)]"
        aria-hidden
      />
      <div
        className="absolute inset-y-0 left-[28%] w-px bg-gradient-to-b from-transparent via-white/10 to-transparent max-lg:hidden"
        aria-hidden
      />
      <div
        className="absolute inset-y-0 right-[26%] w-px bg-gradient-to-b from-transparent via-white/10 to-transparent max-lg:hidden"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        aria-hidden
      />

      <div
        className={cn(
          "relative grid h-full text-white",
          "gap-8 p-5 sm:p-6 lg:grid-cols-12 lg:items-stretch lg:gap-0 lg:p-0",
        )}
      >
        {/* ESQUERDA — Empresa · Status · Resumo · Confiança */}
        <div
          className={cn(
            "flex min-w-0 flex-col justify-between gap-5 lg:col-span-3 lg:px-7 lg:py-7 xl:px-8",
            exAnimations.slide,
          )}
          style={{ animationDelay: exStagger(0) } as CSSProperties}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <p className={cn(exTypography.label, "text-white/55")}>
                {greeting}
              </p>
              <h1
                className={cn(
                  exTypography.headline,
                  "truncate text-white",
                )}
              >
                {tenantName}
              </h1>
              <p className={cn(exTypography.caption, "text-white/55")}>
                Competência {data.competencia.slice(0, 7)}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Chip>{presentation.label}</Chip>
              <Chip tone="ok">{CONFIANCA_LABEL[data.confianca]}</Chip>
            </div>

            {narrative ? (
              <div className="space-y-2 border-t border-white/10 pt-4">
                <ExecutiveSummary
                  narrative={narrative}
                  confidence={data.confianca}
                  inverse
                  compact
                />
              </div>
            ) : null}
          </div>

          <p className={cn(exTypography.caption, "text-white/40")}>
            {updatedAtLabel
              ? `Atualizado · ${updatedAtLabel}`
              : "Dados sincronizados"}
          </p>
        </div>

        {/* CENTRO — Score protagonista + métricas subordinadas */}
        <div
          className={cn(
            "flex min-w-0 flex-col justify-center gap-6 lg:col-span-5 lg:px-8 lg:py-7",
            "lg:bg-white/[0.02]",
            exAnimations.scale,
          )}
          style={{ animationDelay: exStagger(1) } as CSSProperties}
        >
          <ExecutiveScorePremium
            score={score}
            fallbackValue={progressValue}
            confidenceLabel={`${CONFIANCA_LABEL[data.confianca]} confiança`}
            trendPct={trendPct}
            trend={trend}
            inverse
            featured
          />

          <dl
            className={cn(
              "grid grid-cols-2 gap-x-5 gap-y-4 border-t border-white/10 pt-5 sm:grid-cols-4",
            )}
          >
            {showRevenue ? (
              <MetricCell
                label="Receita"
                value={formatCurrency(p.faturamento_realizado)}
              />
            ) : null}
            {showMeta ? (
              <MetricCell label="Meta" value={formatCurrency(p.valor_meta!)} />
            ) : (
              <MetricCell label="Meta" value="—" />
            )}
            {showGap ? (
              <MetricCell
                label="Gap"
                value={formatCurrency(p.restante_meta!)}
                tone={gapTone}
              />
            ) : null}
            {showForecast ? (
              <MetricCell
                label="Forecast"
                value={formatCurrency(p.projecao_dias_uteis)}
              />
            ) : null}
          </dl>
        </div>

        {/* DIREITA — Prioridade · Risco · Oportunidade · CTA */}
        <div
          className={cn(
            "flex min-w-0 flex-col justify-between gap-4 lg:col-span-4 lg:px-7 lg:py-7 xl:px-8",
            exAnimations.slide,
          )}
          style={{ animationDelay: exStagger(2) } as CSSProperties}
        >
          <div className="space-y-3">
            {nextAction ? (
              <Panel accent="action" emphasized>
                <p className={cn(exTypography.label, "text-sky-200/80")}>
                  Principal prioridade
                </p>
                <p
                  className={cn(
                    exTypography.title,
                    "mt-1.5 line-clamp-3 text-white",
                  )}
                >
                  {nextAction.title}
                </p>
                {nextAction.impact ? (
                  <p
                    className={cn(
                      exTypography.caption,
                      "mt-1.5 line-clamp-2 text-white/55",
                    )}
                  >
                    {nextAction.impact}
                  </p>
                ) : null}
              </Panel>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {topRisk?.title ? (
                <Panel accent="risk">
                  <p className={cn(exTypography.label, "text-rose-300/75")}>
                    Principal risco
                  </p>
                  <p
                    className={cn(
                      exTypography.cardTitle,
                      "mt-1 line-clamp-2 text-white/85",
                    )}
                  >
                    {topRisk.title}
                  </p>
                  {topRisk.detail ? (
                    <p
                      className={cn(
                        exTypography.caption,
                        "mt-0.5 line-clamp-1 text-white/45",
                      )}
                    >
                      {topRisk.detail}
                    </p>
                  ) : null}
                </Panel>
              ) : null}

              {topOpportunity?.title ? (
                <Panel accent="opportunity">
                  <p className={cn(exTypography.label, "text-emerald-300/75")}>
                    Principal oportunidade
                  </p>
                  <p
                    className={cn(
                      exTypography.cardTitle,
                      "mt-1 line-clamp-2 text-white/85",
                    )}
                  >
                    {topOpportunity.title}
                  </p>
                  {topOpportunity.detail ? (
                    <p
                      className={cn(
                        exTypography.caption,
                        "mt-0.5 line-clamp-1 text-white/45",
                      )}
                    >
                      {topOpportunity.detail}
                    </p>
                  ) : null}
                </Panel>
              ) : null}
            </div>
          </div>

          <Button
            size="lg"
            className={cn(
              "min-h-12 w-full rounded-xl bg-white text-slate-900 hover:bg-white/92",
              "dark:bg-white dark:text-slate-900",
              exAnimations.hoverScale,
              exAnimations.focusRingInverse,
              exMotion.press,
            )}
            render={<Link href={ctaHref} />}
          >
            {ctaLabel}
            <DsIcon icon={ArrowRight} size="sm" className="text-current" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function Chip({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "risk";
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-2.5 py-0.5",
        exTypography.caption,
        "font-medium ring-1 ring-white/10",
        tone === "ok" && "bg-emerald-400/10 text-emerald-200",
        tone === "warn" && "bg-amber-400/10 text-amber-200",
        tone === "risk" && "bg-rose-400/10 text-rose-200",
        !tone && "bg-white/[0.06] text-white/75",
      )}
    >
      {children}
    </span>
  );
}

function MetricCell({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className={cn(exTypography.label, "text-white/50")}>{label}</dt>
      <dd
        className={cn(
          exTypography.metricSupport,
          "mt-1 truncate leading-none",
          tone === "warn" && "text-amber-300",
          tone === "ok" && "text-emerald-300",
          !tone && "text-white/90",
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function Panel({
  children,
  accent,
  emphasized,
}: {
  children: ReactNode;
  accent: "action" | "risk" | "opportunity";
  emphasized?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3.5",
        emphasized ? "py-3.5" : "py-2.5",
        accent === "action" &&
          cn(
            "border-sky-300/25 bg-sky-400/[0.08]",
            exShadow.heroPanel,
            emphasized && "ring-1 ring-sky-300/15",
          ),
        accent === "risk" && "border-rose-400/20 bg-rose-500/[0.07]",
        accent === "opportunity" &&
          "border-emerald-400/20 bg-emerald-500/[0.07]",
        exMotion.transition,
      )}
    >
      {children}
    </div>
  );
}

export function ExecutiveHeroV2Skeleton() {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        exSize.hero,
        "bg-[linear-gradient(148deg,#05080f_0%,#0a1220_42%,#101a2c_100%)]",
        exRadius[24],
      )}
      aria-busy="true"
      aria-label="Carregando Executive Cockpit"
    >
      <div className={cn("absolute inset-0 opacity-40", exAnimations.shimmer)} />
      <div className="relative grid h-full gap-6 p-6 lg:grid-cols-12 lg:gap-0">
        <div className="space-y-4 lg:col-span-3 lg:px-7 lg:py-7">
          <div className="h-3 w-20 rounded-full bg-white/10" />
          <div className="h-8 w-40 rounded-lg bg-white/15" />
          <div className="h-16 w-full rounded-xl bg-white/8" />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 lg:col-span-5 lg:bg-white/[0.02]">
          <div className="h-24 w-40 rounded-full bg-white/10" />
          <div className="h-10 w-28 rounded-lg bg-white/15" />
          <div className="grid w-full grid-cols-4 gap-3 px-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-white/8" />
            ))}
          </div>
        </div>
        <div className="space-y-3 lg:col-span-4 lg:px-7 lg:py-7">
          <div className="h-24 rounded-2xl bg-white/10" />
          <div className="h-16 rounded-2xl bg-white/8" />
          <div className="h-12 rounded-xl bg-white/15" />
        </div>
      </div>
    </div>
  );
}
