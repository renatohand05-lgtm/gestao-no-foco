import Link from "next/link";

import { ExecutiveCockpitHero } from "@/components/dashboard/executive/executive-cockpit-hero";
import {
  ExecutiveBadge,
  ExecutiveCard,
  ExecutiveEmptyState,
  ExecutiveSection,
  MetricCard,
} from "@/components/executive";
import {
  EXECUTIVE_AI_MODULE_LABEL,
  formatExecutiveScore,
} from "@/lib/ai/executive-ai-summary";
import type { ExecutiveAiResult } from "@/lib/ai/executive-ai-types";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import { composeExecutiveIntelligenceCenter } from "@/lib/dashboard/executive-intelligence-center-compose";
import {
  EIC_NOTE,
  type EicCriticidade,
  type ExecutiveIntelligenceCenterData,
} from "@/lib/dashboard/executive-intelligence-center-types";
import { gofFocusRing, gofGrid, gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  ai: ExecutiveAiResult;
  decision?: ExecutiveDecisionResult | null;
  greeting: string;
  tenantName: string;
  dateLabel: string;
  updatedAtLabel: string;
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

function summaryLineFrom(data: ExecutiveIntelligenceCenterData): string {
  const score = formatExecutiveScore(data.score.value);
  const health =
    data.score.health === "indisponivel"
      ? "saúde indisponível"
      : data.score.health;
  const prio = data.prioridades.length;
  const risks = data.riscos.length;
  return `Score ${score} · ${health} · ${prio} prioridade${prio === 1 ? "" : "s"} · ${risks} risco${risks === 1 ? "" : "s"} em evidência.`;
}

/**
 * Centro de Inteligência Operacional — cockpit premium (Gate 20.1 / 20.1.1).
 * UI only sobre compose existente · Design System Sprint 19.
 */
export function ExecutiveIntelligenceCenter({
  ai,
  decision = null,
  greeting,
  tenantName,
  dateLabel,
  updatedAtLabel,
}: Props) {
  const data = composeExecutiveIntelligenceCenter({ ai, decision });
  return (
    <ExecutiveIntelligenceCenterView
      data={data}
      greeting={greeting}
      tenantName={tenantName}
      dateLabel={dateLabel}
      updatedAtLabel={updatedAtLabel}
    />
  );
}

export function ExecutiveIntelligenceCenterView({
  data,
  greeting,
  tenantName,
  dateLabel,
  updatedAtLabel,
}: {
  data: ExecutiveIntelligenceCenterData;
  greeting: string;
  tenantName: string;
  dateLabel: string;
  updatedAtLabel: string;
}) {
  return (
    <div
      data-dashboard-block="intelligence-center"
      data-decision-engine={data.engineVersion}
      className={cn("space-y-5", gofMotion.fade)}
    >
      <ExecutiveCockpitHero
        greeting={greeting}
        tenantName={tenantName}
        dateLabel={dateLabel}
        updatedAtLabel={updatedAtLabel}
        score={data.score.value}
        health={data.score.health}
        confidence={data.score.confidence}
        partial={data.score.partial}
        summaryLine={summaryLineFrom(data)}
        priorityTitle={data.priorityHeadline.title}
        priorityReason={data.priorityHeadline.reason}
        priorityHref={data.priorityHeadline.href}
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
          description="Até 5 itens · ordenados por impacto"
          emptyTitle="Sem prioridades"
          emptyDescription="Nenhuma prioridade automática neste momento."
          count={data.prioridades.length}
          defaultOpen
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
          description="Ganhos potenciais com evidência"
          emptyTitle="Sem oportunidades"
          emptyDescription="Nenhum ganho potencial evidenciado pelos dados."
          count={data.oportunidades.length}
          defaultOpen
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
          description="Criticidade e impacto estimado"
          emptyTitle="Sem riscos críticos"
          emptyDescription="Nenhum risco com evidência crítica/alta agora."
          count={data.riscos.length}
          defaultOpen
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
          description="Regras determinísticas · sem IA generativa"
          emptyTitle="Sem recomendações"
          emptyDescription="Nenhuma recomendação derivada das regras atuais."
          count={data.recomendacoes.length}
          defaultOpen={false}
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
  children,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  count: number;
  defaultOpen: boolean;
  children: React.ReactNode;
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
      >
        <span className={gofTypography.title}>{title}</span>
        <span className={cn("mt-0.5 block", gofTypography.caption)}>
          {description}
          {count > 0 ? ` · ${count}` : ""}
        </span>
      </summary>
      <div className="space-y-2 border-t border-border/50 px-4 py-3 sm:px-5">
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
