import Link from "next/link";
import type { ReactNode } from "react";

import { ExecutiveEnginesShell } from "@/components/dashboard/executive/executive-engines-shell";
import {
  ExecutiveBadge,
  ExecutiveCard,
  ExecutiveEmptyState,
  ExecutiveSection,
  MetricCard,
} from "@/components/executive";
import {
  EXECUTIVE_AI_MODULE_LABEL,
} from "@/lib/ai/executive-ai-summary";
import type {
  ExecutiveAiInput,
  ExecutiveAiResult,
} from "@/lib/ai/executive-ai-types";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import { composeExecutiveIntelligenceCenter } from "@/lib/dashboard/executive-intelligence-center-compose";
import {
  EIC_NOTE,
  type EicCriticidade,
  type ExecutiveIntelligenceCenterData,
} from "@/lib/dashboard/executive-intelligence-center-types";
import type { EccHojeKpis } from "@/lib/executive-command-center";
import type { PredictiveIntelligenceResult } from "@/lib/predictive";
import { gofFocusRing, gofGrid, gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  ai: ExecutiveAiResult;
  decision?: ExecutiveDecisionResult | null;
  tenantSlug: string;
  greeting: string;
  tenantName: string;
  dateLabel: string;
  updatedAtLabel: string;
  predictive: PredictiveIntelligenceResult;
  /** Feeds do mesmo ciclo do snapshot (simulações · sem fetch). */
  feeds?: ExecutiveAiInput | null;
  hoje?: EccHojeKpis | null;
};

function criticidadeTone(c: EicCriticidade): "danger" | "warning" | "info" {
  if (c === "critica") return "danger";
  if (c === "alta") return "warning";
  return "info";
}

function moduleLabel(module: string | null): string {
  if (!module) return "Geral";
  if (module in EXECUTIVE_AI_MODULE_LABEL) {
    return EXECUTIVE_AI_MODULE_LABEL[
      module as keyof typeof EXECUTIVE_AI_MODULE_LABEL
    ];
  }
  return module.charAt(0).toUpperCase() + module.slice(1);
}

/**
 * Centro de Inteligência Operacional — cockpit premium (Gate 20.1 / 20.1.1).
 * UI only sobre compose existente · Design System Sprint 19.
 */
export function ExecutiveIntelligenceCenter({
  ai,
  decision = null,
  tenantSlug,
  greeting,
  tenantName,
  dateLabel,
  updatedAtLabel,
  predictive,
  feeds = null,
  hoje = null,
}: Props) {
  const data = composeExecutiveIntelligenceCenter({ ai, decision });
  return (
    <ExecutiveIntelligenceCenterView
      ai={ai}
      decision={decision}
      data={data}
      tenantSlug={tenantSlug}
      greeting={greeting}
      tenantName={tenantName}
      dateLabel={dateLabel}
      updatedAtLabel={updatedAtLabel}
      predictive={predictive}
      feeds={feeds}
      hoje={hoje}
    />
  );
}

export function ExecutiveIntelligenceCenterView({
  ai,
  decision = null,
  data,
  tenantSlug,
  greeting,
  tenantName,
  dateLabel,
  updatedAtLabel,
  predictive,
  feeds = null,
  hoje = null,
}: {
  ai: ExecutiveAiResult;
  decision?: ExecutiveDecisionResult | null;
  data: ExecutiveIntelligenceCenterData;
  tenantSlug: string;
  greeting: string;
  tenantName: string;
  dateLabel: string;
  updatedAtLabel: string;
  predictive: PredictiveIntelligenceResult;
  feeds?: ExecutiveAiInput | null;
  hoje?: EccHojeKpis | null;
}) {
  return (
    <div
      data-dashboard-block="intelligence-center"
      data-decision-engine={data.engineVersion}
      className={cn("space-y-5", gofMotion.fade)}
    >
      {/* Gates 20.2–20.7 — engines compartilhados uma vez por paint */}
      <ExecutiveEnginesShell
        ai={ai}
        decision={decision}
        tenantSlug={tenantSlug}
        greeting={greeting}
        tenantName={tenantName}
        dateLabel={dateLabel}
        updatedAtLabel={updatedAtLabel}
        predictive={predictive}
        feeds={feeds}
        hoje={hoje}
      />

      <ExecutiveSection
        title="Score por domínio"
        description={EIC_NOTE}
        panel
        className="space-y-4"
      >
        {data.score.modules.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {data.score.modules.map((m) => (
              <MetricCard
                key={m.module}
                label={EXECUTIVE_AI_MODULE_LABEL[m.module]}
                value={m.score == null ? "Indisponível" : String(Math.round(m.score))}
                hint={
                  m.score == null
                    ? "Sem cobertura suficiente · tendência indisponível"
                    : `Peso ${m.weight}% · tendência indisponível`
                }
                tone={
                  m.score == null
                    ? "neutral"
                    : m.score >= 80
                      ? "success"
                      : m.score >= 60
                        ? "warning"
                        : "danger"
                }
              />
            ))}
          </div>
        ) : (
          <ExecutiveEmptyState
            title="Scores indisponíveis"
            description="Cobertura insuficiente para montar o score por domínio."
            className="py-6"
          />
        )}

        {data.score.unavailableSources.length > 0 ? (
          <p className={gofTypography.caption}>
            Fontes indisponíveis:{" "}
            {data.score.unavailableSources
              .map((m) => EXECUTIVE_AI_MODULE_LABEL[m])
              .join(", ")}
            .
          </p>
        ) : null}
      </ExecutiveSection>

      <div className={cn(gofGrid.twoCol)}>
        <PanelList
          title="Prioridades do Dia"
          description="Detalhamento · evidências completas (resumo no Command Center)"
          emptyTitle="Sem prioridades"
          emptyDescription="Nenhuma prioridade automática neste momento."
          count={data.prioridades.length}
          defaultOpen={false}
          panelId="eic-detail-prioridades"
        >
          {data.prioridades.map((item, idx) => (
            <ItemCard
              key={item.id}
              badge={`#${idx + 1}`}
              badgeTone="primary"
              module={moduleLabel(item.module)}
              title={item.title}
              body={item.reason}
              meta={null}
              confidence={
                item.source === "decision-engine" ? "Confirmado" : "Parcial"
              }
              evidence={
                item.source === "decision-engine"
                  ? "Evidência · Decision Engine"
                  : "Evidência · Decision Center"
              }
              href={item.href}
            />
          ))}
        </PanelList>

        <PanelList
          title="Oportunidades"
          description="Detalhamento · ganhos com evidência (resumo no Command Center)"
          emptyTitle="Sem oportunidades"
          emptyDescription="Nenhum ganho potencial evidenciado pelos dados."
          count={data.oportunidades.length}
          defaultOpen={false}
          panelId="eic-detail-oportunidades"
        >
          {data.oportunidades.map((item) => (
            <ItemCard
              key={item.id}
              badge="Oportunidade"
              badgeTone="success"
              module={moduleLabel(item.module)}
              title={item.title}
              body={item.description}
              meta={item.potentialGainLabel}
              confidence={item.potentialGainLabel ? "Confirmado" : "Parcial"}
              href={item.href}
            />
          ))}
        </PanelList>

        <PanelList
          title="Riscos"
          description="Detalhamento · criticidade e impacto (resumo no Command Center)"
          emptyTitle="Sem riscos críticos"
          emptyDescription="Nenhum risco com evidência crítica/alta agora."
          count={data.riscos.length}
          defaultOpen={false}
          panelId="eic-detail-riscos"
        >
          {data.riscos.map((item) => (
            <ItemCard
              key={item.id}
              badge={
                item.criticidade === "critica"
                  ? "Crítico"
                  : item.criticidade === "alta"
                    ? "Atenção"
                    : "Médio"
              }
              badgeTone={criticidadeTone(item.criticidade)}
              module={moduleLabel(item.module)}
              title={item.title}
              body={item.description}
              meta={item.impactLabel}
              confidence={item.impactLabel ? "Estimado" : "Parcial"}
              href={item.href}
            />
          ))}
        </PanelList>

        <PanelList
          title="Recomendações Inteligentes"
          description="Detalhamento · regras determinísticas · sem IA generativa"
          emptyTitle="Sem recomendações"
          emptyDescription="Nenhuma recomendação derivada das regras atuais."
          count={data.recomendacoes.length}
          defaultOpen={false}
          panelId="eic-detail-recomendacoes"
        >
          {data.recomendacoes.map((item) => (
            <ItemCard
              key={item.id}
              badge={`P${item.priority}`}
              badgeTone="primary"
              module={moduleLabel(item.module)}
              title={item.action}
              body={item.reason}
              meta={item.expectedImpact}
              href={item.href}
            />
          ))}
        </PanelList>
      </div>
    </div>
  );
}

function PanelList({
  title,
  description,
  emptyTitle,
  emptyDescription,
  count,
  defaultOpen,
  panelId,
  children,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  count: number;
  defaultOpen: boolean;
  panelId: string;
  children: ReactNode;
}) {
  return (
    <details
      className={cn(
        "min-w-0 border border-border/60 bg-[var(--brand-white)]",
        "rounded-xl open:shadow-sm",
        gofMotion.fade,
      )}
      open={defaultOpen}
    >
      <summary
        className={cn(
          "cursor-pointer list-none px-4 py-3 sm:px-5",
          gofFocusRing,
          "rounded-xl",
        )}
        aria-controls={panelId}
      >
        <span className={gofTypography.title}>{title}</span>
        <span className={cn("mt-0.5 block", gofTypography.caption)}>
          {description}
          {count > 0 ? ` · ${count}` : ""}
        </span>
      </summary>
      <div
        id={panelId}
        className="space-y-2 border-t border-border/50 px-4 py-3 sm:px-5"
        role="region"
        aria-label={title}
      >
        {count === 0 ? (
          <ExecutiveEmptyState
            title={emptyTitle}
            description={emptyDescription}
            className="py-6"
          />
        ) : (
          <ul className="space-y-2">{children}</ul>
        )}
      </div>
    </details>
  );
}

function ItemCard({
  badge,
  badgeTone,
  module,
  title,
  body,
  meta,
  confidence,
  evidence,
  href,
}: {
  badge: string;
  badgeTone: "primary" | "success" | "danger" | "warning" | "info";
  module: string;
  title: string;
  body: string;
  meta?: string | null;
  confidence?: string;
  evidence?: string;
  href?: string;
}) {
  return (
    <li>
      <ExecutiveCard padding={16} className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <ExecutiveBadge tone={badgeTone} variant="soft">
            {badge}
          </ExecutiveBadge>
          <ExecutiveBadge tone="neutral" variant="outline">
            {module}
          </ExecutiveBadge>
          {confidence ? (
            <ExecutiveBadge tone="neutral" variant="outline">
              {confidence}
            </ExecutiveBadge>
          ) : null}
        </div>
        <p className="text-sm font-semibold">{title}</p>
        <p className={cn(gofTypography.subtitle, "line-clamp-2")}>{body}</p>
        {meta ? (
          <p className={cn(gofTypography.caption, "text-foreground")}>{meta}</p>
        ) : null}
        {evidence ? (
          <p className={gofTypography.caption}>{evidence}</p>
        ) : null}
        {href ? (
          <Link
            href={href}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Ação recomendada
          </Link>
        ) : null}
      </ExecutiveCard>
    </li>
  );
}
