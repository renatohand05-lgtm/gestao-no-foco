"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";

import { DsIcon } from "@/components/ui/ds-icon";
import { EXECUTIVE_BLOCK } from "@/lib/dashboard/executive-ui";
import type { ExecutiveIntelligenceData } from "@/lib/dashboard/executive-intelligence-types";
import { formatCurrency } from "@/lib/dashboard/format";
import {
  exAnimations,
  exRadius,
  exShadow,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: ExecutiveIntelligenceData;
  tenantSlug: string;
};

function Unavailable() {
  return (
    <p className="text-sm text-muted-foreground" role="status">
      Dados indisponíveis
    </p>
  );
}

function CardShell({
  title,
  icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "flex min-h-[11.5rem] flex-col",
        EXECUTIVE_BLOCK.section,
        exRadius[16],
        exShadow.card,
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-border/50 px-5 py-3.5 sm:px-6">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
          <DsIcon icon={icon} size="md" />
        </span>
        <h3 className={EXECUTIVE_BLOCK.title}>{title}</h3>
      </header>
      <div className={cn(EXECUTIVE_BLOCK.body, "flex flex-1 flex-col")}>{children}</div>
    </article>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={cn(exTypography.caption, "min-w-0")}>{label}</span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

function ReceitaPotencialCard({
  data,
}: {
  data: ExecutiveIntelligenceData["receitaPotencial"];
}) {
  if (data.status === "unavailable") {
    return (
      <CardShell title="Receita Potencial" icon={CircleDollarSign}>
        <Unavailable />
      </CardShell>
    );
  }

  return (
    <CardShell title="Receita Potencial" icon={CircleDollarSign}>
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        Valor estimado em negociação
      </p>
      <p className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-foreground">
        {data.totalValor == null ? "Indisponível" : formatCurrency(data.totalValor)}
      </p>
      <p className={cn(exTypography.caption, "mt-1")}>
        {data.status === "partial"
          ? "Visão parcial — quantidade de OS disponível; valor em aprovação não é confiável."
          : "Estimativa baseada no valor atual das OS."}
      </p>
      <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
        <MetricRow
          label={`OS aguardando aprovação${
            data.aguardandoAprovacaoQtd != null
              ? ` (${data.aguardandoAprovacaoQtd})`
              : ""
          }`}
          value={
            data.aguardandoAprovacaoValor == null
              ? "Indisponível"
              : formatCurrency(data.aguardandoAprovacaoValor)
          }
        />
        <MetricRow
          label={`Orçamentos pendentes${
            data.orcamentosPendentesQtd != null
              ? ` (${data.orcamentosPendentesQtd})`
              : ""
          }`}
          value={
            data.orcamentosPendentesValor == null
              ? "Indisponível"
              : formatCurrency(data.orcamentosPendentesValor)
          }
        />
      </div>
    </CardShell>
  );
}

function SaudeOperacaoCard({
  data,
  tenantSlug,
}: {
  data: ExecutiveIntelligenceData["saudeOperacao"];
  tenantSlug: string;
}) {
  if (data.status === "unavailable") {
    return (
      <CardShell title="Saúde da Operação" icon={Activity}>
        <Unavailable />
      </CardShell>
    );
  }

  const aguardando =
    data.osAguardandoCliente ?? data.clientesAguardandoRetorno ?? 0;

  return (
    <CardShell title="Saúde da Operação" icon={Activity}>
      <div className="space-y-2.5">
        <MetricRow label="OS abertas" value={String(data.osAbertas ?? 0)} />
        <MetricRow
          label="OS atrasadas"
          value={String(data.osAtrasadas ?? 0)}
        />
        <MetricRow
          label="OS aguardando cliente"
          value={String(aguardando)}
        />
      </div>
      <Link
        href={`/${tenantSlug}/centro-operacoes`}
        className={cn(
          "mt-auto inline-flex items-center gap-0.5 pt-3 text-xs font-medium text-slate-600 hover:text-foreground dark:text-slate-300",
          exAnimations.focusRing,
        )}
      >
        Centro de Operações
        <ArrowUpRight className="size-3.5" aria-hidden />
      </Link>
    </CardShell>
  );
}

/**
 * Inteligência Executiva — panorama consolidado (Gate 17.2).
 * Sem Prioridades (Plano) e sem Radar (Cockpit).
 */
export function ExecutiveIntelligenceSection({ data, tenantSlug }: Props) {
  return (
    <section
      className={cn(exAnimations.fade)}
      aria-labelledby="inteligencia-executiva-titulo"
      data-dashboard-block="executive-intelligence"
    >
      <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h2
            id="inteligencia-executiva-titulo"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Inteligência Executiva
          </h2>
          <p className={cn(exTypography.caption, "mt-0.5")}>
            Panorama consolidado de potencial e operação.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ReceitaPotencialCard data={data.receitaPotencial} />
        <SaudeOperacaoCard
          data={data.saudeOperacao}
          tenantSlug={tenantSlug}
        />
      </div>
    </section>
  );
}

export function ExecutiveIntelligenceSectionSkeleton() {
  return (
    <div
      className={cn(
        "h-52 border border-border/50 bg-card",
        exRadius[16],
        exAnimations.shimmer,
      )}
      aria-busy="true"
      aria-label="Carregando inteligência executiva"
    />
  );
}
