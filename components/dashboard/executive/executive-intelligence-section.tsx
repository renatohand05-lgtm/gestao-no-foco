"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";

import {
  ExecutiveCard,
  ExecutiveEmptyState,
  ExecutiveSection,
  ExecutiveSkeleton,
} from "@/components/executive";
import { DsIcon } from "@/components/ui/ds-icon";
import type { ExecutiveIntelligenceData } from "@/lib/dashboard/executive-intelligence-types";
import { formatCurrency } from "@/lib/dashboard/format";
import {
  gofFocusRing,
  gofGrid,
  gofMotion,
  gofRadius,
  gofTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: ExecutiveIntelligenceData;
  tenantSlug: string;
};

function Unavailable() {
  return (
    <ExecutiveEmptyState
      title="Dados indisponíveis"
      description="Não foi possível carregar este bloco no momento."
      className="py-6"
    />
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
    <ExecutiveCard
      padding={20}
      className="flex min-h-[11.5rem] flex-col"
      header={
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "inline-flex size-8 items-center justify-center bg-muted/70 text-muted-foreground",
              gofRadius.md,
            )}
          >
            <DsIcon icon={icon} size="md" />
          </span>
          <h3 className={gofTypography.title}>{title}</h3>
        </div>
      }
    >
      <div className="flex flex-1 flex-col">{children}</div>
    </ExecutiveCard>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={cn(gofTypography.caption, "min-w-0")}>{label}</span>
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
      <p className={cn(gofTypography.caption, "uppercase tracking-wide")}>
        Valor estimado em negociação
      </p>
      <p className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-foreground">
        {data.totalValor == null ? "Indisponível" : formatCurrency(data.totalValor)}
      </p>
      <p className={cn(gofTypography.caption, "mt-1")}>
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
          "mt-auto inline-flex items-center gap-0.5 pt-3 text-xs font-medium text-muted-foreground hover:text-foreground",
          gofFocusRing,
        )}
      >
        Centro de Operações
        <ArrowUpRight className="size-3.5" aria-hidden />
      </Link>
    </CardShell>
  );
}

/**
 * Inteligência Executiva — Design System oficial (Gate 19.1).
 * Sem Prioridades (Plano) e sem Radar (Cockpit).
 */
export function ExecutiveIntelligenceSection({ data, tenantSlug }: Props) {
  return (
    <div
      data-dashboard-block="executive-intelligence"
      className={gofMotion.fade}
    >
      <ExecutiveSection
        title="Saúde da operação"
        description="Panorama consolidado de potencial e operação."
        panel
        className="space-y-5"
      >
        <div className={gofGrid.twoCol}>
          <ReceitaPotencialCard data={data.receitaPotencial} />
          <SaudeOperacaoCard
            data={data.saudeOperacao}
            tenantSlug={tenantSlug}
          />
        </div>
      </ExecutiveSection>
    </div>
  );
}

export function ExecutiveIntelligenceSectionSkeleton() {
  return (
    <div
      className="space-y-3 rounded-xl border border-border/60 bg-card p-5"
      aria-busy="true"
      aria-label="Carregando inteligência executiva"
    >
      <ExecutiveSkeleton heightClassName="h-5" widthClassName="w-1/3" />
      <ExecutiveSkeleton heightClassName="h-40" widthClassName="w-full" />
    </div>
  );
}
