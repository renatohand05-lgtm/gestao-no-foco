import type { LucideIcon } from "lucide-react";
import {
  Crosshair,
  Receipt,
  ArrowUpRight,
  Percent,
  ShoppingBag,
  Ticket,
} from "lucide-react";

import { ExecutiveSection } from "@/components/executive";
import { DsIcon } from "@/components/ui/ds-icon";
import { formatCurrency, formatPercent } from "@/lib/dashboard/format";
import type { DashboardHojeSnapshot } from "@/lib/dashboard/vendas-dia-service";
import {
  exAnimations,
  exColors,
  exRadius,
  exShadow,
  exTypography,
  type ExColorTone,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: DashboardHojeSnapshot;
};

function signedCurrency(value: number | null) {
  if (value == null) return "—";
  const abs = formatCurrency(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return abs;
}

function toneText(tone: ExColorTone) {
  if (tone === "neutral") return "text-foreground";
  return exColors[tone].text;
}

function toneSoft(tone: ExColorTone) {
  if (tone === "neutral") return "bg-muted/70 text-muted-foreground";
  return exColors[tone].soft;
}

function AtingidoProgress({ pct }: { pct: number | null }) {
  if (pct == null) {
    return (
      <div className="h-1.5 w-full rounded-full bg-muted" aria-hidden />
    );
  }
  const fill = Math.min(pct, 100);
  const excess = pct > 100 ? pct - 100 : 0;

  return (
    <div className="space-y-1">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Percentual atingido da meta de hoje"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 100
              ? "bg-emerald-600"
              : pct >= 80
                ? "bg-sky-600"
                : "bg-rose-500",
          )}
          style={{ width: `${fill}%` }}
        />
      </div>
      {excess > 0 ? (
        <p className="text-[0.8125rem] font-normal whitespace-nowrap text-emerald-700 dark:text-emerald-400">
          +{formatPercent(excess)} acima da meta
        </p>
      ) : null}
    </div>
  );
}

function HojeKpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
  footer,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: ExColorTone;
  footer?: React.ReactNode;
}) {
  return (
    <article
      className={cn(
        "flex h-[10.5rem] min-w-0 w-full max-w-full flex-col overflow-hidden bg-card",
        "border border-border/40 ring-1 ring-black/[0.02] dark:border-border/50 dark:ring-white/[0.04]",
        exRadius[16],
        exShadow.card,
        "px-7 py-6 sm:px-8",
        "motion-safe:transition-[box-shadow,border-color,transform,ring-color] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-border/65",
        exShadow.cardHover,
        exAnimations.slide,
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2.5">
        <span
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center",
            exRadius[12],
            toneSoft(tone),
            "motion-safe:transition-colors motion-safe:duration-300",
          )}
        >
          <DsIcon icon={Icon} size="md" />
        </span>
        <p
          className={cn(
            exTypography.label,
            "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap tracking-[0.08em] uppercase",
          )}
        >
          {label}
        </p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden">
        <p
          key={value}
          className={cn(
            exTypography.metricSm,
            toneText(tone),
            "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap leading-none",
            exAnimations.count,
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          )}
          title={value}
        >
          {value}
        </p>
        {hint ? (
          <p
            className={cn(
              exTypography.caption,
              "mt-1.5 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground",
            )}
          >
            {hint}
          </p>
        ) : null}
      </div>

      {footer ? (
        <div className="min-w-0 shrink-0 overflow-hidden">{footer}</div>
      ) : null}
    </article>
  );
}

/** Cards premium do dia — grid contido no container. */
export function ResumoVendasHojeCards({ data }: Props) {
  const h = data.hoje;
  const diferenca = h.meta == null ? null : h.faturamento - h.meta;

  return (
    <ExecutiveSection title="Hoje" panel>
      <div className="@container w-full max-w-full min-w-0 overflow-x-hidden">
        <div
          className={cn(
            "grid w-full max-w-full min-w-0",
            "grid-cols-1 gap-5",
            "sm:grid-cols-2",
            "lg:grid-cols-3",
            "@[80rem]:grid-cols-[repeat(6,minmax(0,1fr))] @[80rem]:gap-6",
          )}
        >
          <HojeKpiCard
            icon={Crosshair}
            tone="neutral"
            label="Meta"
            value={h.meta == null ? "—" : formatCurrency(h.meta)}
            hint={
              h.meta_fonte === "rateio"
                ? "Rateio da meta mensal"
                : h.meta_fonte === "manual"
                  ? "Meta manual"
                  : h.meta_fonte
            }
          />
          <HojeKpiCard
            icon={Receipt}
            tone="info"
            label="Realizado"
            value={formatCurrency(h.faturamento)}
          />
          <HojeKpiCard
            icon={ArrowUpRight}
            tone={
              diferenca == null
                ? "neutral"
                : diferenca >= 0
                  ? "success"
                  : "danger"
            }
            label="Diferença"
            value={signedCurrency(diferenca)}
          />
          <HojeKpiCard
            icon={Percent}
            tone={
              h.percentual == null
                ? "neutral"
                : h.percentual >= 100
                  ? "success"
                  : h.percentual >= 80
                    ? "info"
                    : "danger"
            }
            label="% atingido"
            value={h.percentual == null ? "—" : formatPercent(h.percentual)}
            footer={<AtingidoProgress pct={h.percentual} />}
          />
          <HojeKpiCard
            icon={ShoppingBag}
            tone="neutral"
            label="Quantidade"
            value={String(h.quantidade_vendas)}
          />
          <HojeKpiCard
            icon={Ticket}
            tone="neutral"
            label="Ticket médio"
            value={formatCurrency(h.ticket_medio)}
          />
        </div>
      </div>
    </ExecutiveSection>
  );
}

