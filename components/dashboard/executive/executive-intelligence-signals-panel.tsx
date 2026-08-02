"use client";

import { useMemo } from "react";

import {
  ExecutiveBadge,
  ExecutiveCard,
  ExecutiveSection,
} from "@/components/executive";
import type { ExecutiveAiResult } from "@/lib/ai/executive-ai-types";
import type { DashboardCharts } from "@/types/dashboard-executive";
import {
  composeEnterpriseInsights,
  type BusinessHealthResult,
  type EnterpriseInsightsPack,
} from "@/lib/enterprise";
import { gofGrid, gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  ai: ExecutiveAiResult;
  businessHealth?: BusinessHealthResult | null;
  charts?: DashboardCharts | null;
};

function scoreLabel(n: number | null): string {
  return n == null || !Number.isFinite(n) ? "—" : String(Math.round(n));
}

function ScoreChip({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
      <p className={cn(gofTypography.caption, "text-muted-foreground")}>
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {scoreLabel(value)}
      </p>
    </div>
  );
}

/**
 * Camada de apresentação 29.4 — scores nomeados + sinais + stub IA futura.
 * Não recalcula KPIs; só compõe engines existentes + heurísticas de série.
 */
export function ExecutiveIntelligenceSignalsPanel({
  ai,
  businessHealth = null,
  charts = null,
}: Props) {
  const pack: EnterpriseInsightsPack = useMemo(
    () =>
      composeEnterpriseInsights({
        ai,
        businessHealth,
        charts,
      }),
    [ai, businessHealth, charts],
  );

  const actionableSignals = pack.signals.filter((s) => {
    if (s.kind === "tendencia") {
      return s.direction === "crescimento" || s.direction === "queda";
    }
    if (s.kind === "anomalia") return s.anomaly !== "nenhuma";
    if (s.kind === "sazonalidade") {
      return s.hint === "padrao_semanal" || s.hint === "padrao_mensal";
    }
    return false;
  });

  return (
    <ExecutiveSection
      title="Inteligência Executiva"
      description="Sinais e scores compostos a partir de dados já calculados · Sprint 29.4"
      className={cn(gofMotion.fade, "min-w-0")}
      actions={
        <ExecutiveBadge tone="info">
          {pack.aiHook.llmEnabled ? "LLM" : "Determinístico"}
        </ExecutiveBadge>
      }
    >
      <ExecutiveCard className="space-y-4">
        <div className={cn(gofGrid.metrics, "gap-3")}>
          <ScoreChip label="Saúde operacional" value={pack.scores.overall} />
          <ScoreChip label="Financeiro" value={pack.scores.financeiro} />
          <ScoreChip label="Comercial" value={pack.scores.comercial} />
          <ScoreChip label="Operacional" value={pack.scores.operacional} />
        </div>

        {pack.criticalIndicators.length > 0 ? (
          <div className="space-y-2">
            <p className={cn(gofTypography.caption, "font-medium text-foreground")}>
              Indicadores críticos
            </p>
            <ul className="space-y-2">
              {pack.criticalIndicators.slice(0, 5).map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-[var(--border-subtle)] px-3 py-2"
                >
                  <p className={cn(gofTypography.body, "font-medium")}>
                    {c.label}
                  </p>
                  <p className={gofTypography.caption}>{c.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {actionableSignals.length > 0 ? (
          <div className="space-y-2">
            <p className={cn(gofTypography.caption, "font-medium text-foreground")}>
              Tendências e anomalias
            </p>
            <ul className="space-y-2">
              {actionableSignals.slice(0, 6).map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-[var(--border-subtle)] px-3 py-2"
                >
                  <p className={cn(gofTypography.body, "font-medium")}>
                    {s.title}
                  </p>
                  <p className={gofTypography.caption}>{s.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className={gofTypography.caption}>
            Sem sinais de tendência/anomalia acionáveis neste ciclo (série curta
            ou estável).
          </p>
        )}

        <p className={gofTypography.caption}>
          Fonte de scores: {pack.scores.source} · hook IA futura:{" "}
          {pack.aiHook.providerId} (LLM desligado)
        </p>
      </ExecutiveCard>
    </ExecutiveSection>
  );
}
