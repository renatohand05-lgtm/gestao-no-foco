"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Info,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

import {
  ExecutiveBadge,
  ExecutiveCard,
  ExecutiveEmptyState,
  ExecutiveSection,
  ExecutiveSkeleton,
  type ExecutiveBadgeTone,
} from "@/components/executive";
import { DsIcon } from "@/components/ui/ds-icon";
import type {
  DecisionCategory,
  DecisionSeverity,
  ExecutiveDecisionItem,
  ExecutiveDecisionResult,
} from "@/lib/dashboard/executive-decision-types";
import { EXECUTIVE_STATUS_LABEL } from "@/lib/dashboard/executive-ui";
import { formatCurrency } from "@/lib/dashboard/format";
import {
  gofFocusRing,
  gofMotion,
  gofRadius,
  gofTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: ExecutiveDecisionResult;
  tenantSlug: string;
  maxItems?: number;
  compactMaxItems?: number;
  loading?: boolean;
};

const SEVERITY_UI: Record<
  DecisionSeverity,
  { label: string; icon: LucideIcon; tone: ExecutiveBadgeTone; bar: string }
> = {
  critical: {
    label: EXECUTIVE_STATUS_LABEL.critico,
    icon: AlertTriangle,
    tone: "danger",
    bar: "bg-danger",
  },
  warning: {
    label: EXECUTIVE_STATUS_LABEL.atencao,
    icon: AlertTriangle,
    tone: "warning",
    bar: "bg-warning",
  },
  opportunity: {
    label: "Oportunidade",
    icon: Lightbulb,
    tone: "success",
    bar: "bg-success",
  },
  info: {
    label: "Info",
    icon: Info,
    tone: "info",
    bar: "bg-[var(--brand-info)]",
  },
};

/** Grupos premium Gate 19.3 — só apresentação; categorias do payload intactas. */
const GROUP_ORDER = [
  "financeiro",
  "operacao",
  "comercial",
  "estoque",
  "crm",
  "os",
] as const;

type DecisionGroupKey = (typeof GROUP_ORDER)[number];

const GROUP_LABEL: Record<DecisionGroupKey, string> = {
  financeiro: "Financeiro",
  operacao: "Operação",
  comercial: "Comercial",
  estoque: "Estoque",
  crm: "CRM",
  os: "Ordens de Serviço",
};

function mapCategoryToGroup(category: DecisionCategory): DecisionGroupKey {
  if (category === "financeiro") return "financeiro";
  if (category === "estoque") return "estoque";
  if (category === "clientes") return "crm";
  if (category === "oficina") return "os";
  if (category === "vendas" || category === "metas") return "comercial";
  if (category === "operacao" || category === "pessoas") return "operacao";
  return "operacao";
}

function groupItems(items: ExecutiveDecisionItem[]) {
  const map = new Map<DecisionGroupKey, ExecutiveDecisionItem[]>();
  for (const key of GROUP_ORDER) map.set(key, []);
  for (const item of items) {
    const g = mapCategoryToGroup(item.category);
    map.get(g)!.push(item);
  }
  return GROUP_ORDER.filter((k) => (map.get(k)?.length ?? 0) > 0).map((k) => ({
    key: k,
    label: GROUP_LABEL[k],
    items: map.get(k)!,
  }));
}

function impactLabel(item: ExecutiveDecisionItem): string {
  if (item.id === "projecao-mes-abaixo") return "Gap projetado";
  if (item.id === "meta-dia-abaixo") return "Falta para a meta";
  if (item.id === "meta-dia-atingida") return "Acima da meta";
  return "Impacto financeiro";
}

function formatImpactDisplay(item: ExecutiveDecisionItem): string {
  const value = item.impactValue ?? 0;
  const signed =
    item.id === "projecao-mes-abaixo" || item.id === "meta-dia-abaixo"
      ? -Math.abs(value)
      : value;
  const formatted = formatCurrency(Math.abs(signed));
  return signed < 0 ? `-${formatted}` : formatted;
}

function DecisionItemRow({ item }: { item: ExecutiveDecisionItem }) {
  const ui = SEVERITY_UI[item.severity];
  const hasImpact = item.impactValue != null && item.impactValue > 0;

  const content = (
    <div className="flex min-w-0 gap-3.5">
      <span
        className={cn("w-1 shrink-0 self-stretch rounded-full", ui.bar)}
        aria-hidden
      />
      <span
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center",
          gofRadius.md,
          ui.tone === "danger" && "bg-danger/10 text-danger",
          ui.tone === "warning" && "bg-warning/15 text-warning-foreground",
          ui.tone === "success" && "bg-success/10 text-success",
          ui.tone === "info" &&
            "bg-[var(--brand-info)]/10 text-[var(--brand-info)]",
        )}
      >
        <DsIcon icon={ui.icon} size="md" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn(gofTypography.body, "min-w-0 font-semibold")}>
            {item.title}
          </p>
          <ExecutiveBadge tone={ui.tone} variant="soft">
            {ui.label}
          </ExecutiveBadge>
        </div>

        {hasImpact ? (
          <div className="min-w-0">
            <p className={cn(gofTypography.caption, "uppercase tracking-wide")}>
              {impactLabel(item)}
            </p>
            <p className="mt-0.5 text-base font-semibold tracking-tight tabular-nums text-foreground sm:text-[17px]">
              {formatImpactDisplay(item)}
            </p>
          </div>
        ) : null}

        <p className={cn(gofTypography.caption, "line-clamp-2")}>
          {item.description}
        </p>

        {item.actionLabel ? (
          <span className="inline-flex items-center gap-0.5 pt-0.5 text-xs font-medium text-muted-foreground">
            {item.actionLabel}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
    </div>
  );

  if (item.href) {
    return (
      <li>
        <Link
          href={item.href}
          className={cn(
            "block motion-safe:transition-colors motion-safe:duration-150 hover:bg-muted/40",
            gofRadius.lg,
            gofFocusRing,
          )}
          aria-label={`${item.title}. ${item.actionLabel ?? "Abrir"}`}
        >
          <ExecutiveCard padding={16} interactive className="border-border/50">
            {content}
          </ExecutiveCard>
        </Link>
      </li>
    );
  }

  return (
    <li>
      <ExecutiveCard padding={16} className="border-border/50">
        {content}
      </ExecutiveCard>
    </li>
  );
}

function SeverityBreakdown({ data }: { data: ExecutiveDecisionResult }) {
  const { criticalCount, warningCount, opportunityCount, infoCount, totalCount } =
    data.summary;
  if (totalCount === 0) return null;

  const parts: { label: string; count: number; tone: ExecutiveBadgeTone }[] =
    [];
  if (criticalCount > 0)
    parts.push({
      label: EXECUTIVE_STATUS_LABEL.critico,
      count: criticalCount,
      tone: "danger",
    });
  if (warningCount > 0)
    parts.push({
      label: EXECUTIVE_STATUS_LABEL.atencao,
      count: warningCount,
      tone: "warning",
    });
  if (opportunityCount > 0)
    parts.push({ label: "Oportunidade", count: opportunityCount, tone: "success" });
  if (infoCount > 0)
    parts.push({ label: "Info", count: infoCount, tone: "info" });

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-3">
      <p className={cn(gofTypography.body, "mr-1 font-medium")}>
        {totalCount} alerta{totalCount === 1 ? "" : "s"}
      </p>
      {parts.map((p) => (
        <ExecutiveBadge key={p.label} tone={p.tone} variant="soft">
          {p.count} {p.label}
        </ExecutiveBadge>
      ))}
    </div>
  );
}

/**
 * Centro de Decisão premium — agrupado por domínio (Gate 19.3).
 */
export function ExecutiveDecisionCenter({
  data,
  tenantSlug,
  maxItems = 8,
  compactMaxItems = 4,
  loading = false,
}: Props) {
  const desktopItems = data.items.slice(0, maxItems);
  const mobileItems = data.items.slice(0, compactMaxItems);
  const hasMore = data.items.length > compactMaxItems;
  const empty = data.items.length === 0;
  const desktopGroups = groupItems(desktopItems);
  const mobileGroups = groupItems(mobileItems);

  return (
    <div data-dashboard-block="decision-center" className={gofMotion.fade}>
      <ExecutiveSection
        title="Decisões inteligentes"
        description={
          loading
            ? "Carregando prioridades…"
            : `${data.summary.headline} · detalhe por domínio`
        }
        panel
        actions={
          hasMore ? (
            <Link
              href={`/${tenantSlug}/centro-operacoes`}
              className={cn(
                "inline-flex h-8 shrink-0 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-muted/50",
                gofFocusRing,
              )}
              aria-label="Abrir Centro de Operações"
            >
              Centro de Operações →
            </Link>
          ) : undefined
        }
      >
        {empty ? (
          <ExecutiveEmptyState
            title="Operação sob controle"
            description="Nenhum ponto crítico identificado neste momento. A GESTÃO continua monitorando metas, caixa e oficina."
            icon={CheckCircle2}
            className="py-8"
          />
        ) : (
          <details className="group">
            <summary
              className={cn(
                "cursor-pointer list-none rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5",
                gofFocusRing,
                gofTypography.caption,
              )}
            >
              Ver detalhe por domínio
              {!loading ? ` · ${data.summary.totalCount} sinal(is)` : ""}
            </summary>
            <div className="mt-3 space-y-4">
            {!loading ? <SeverityBreakdown data={data} /> : null}
            <div className="hidden space-y-6 sm:block">
              {desktopGroups.map((group) => (
                <section
                  key={group.key}
                  aria-labelledby={`decision-group-${group.key}`}
                  className="space-y-2.5"
                >
                  <h3
                    id={`decision-group-${group.key}`}
                    className={cn(
                      gofTypography.caption,
                      "font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                    )}
                  >
                    {group.label}
                  </h3>
                  <ul className="space-y-2.5">
                    {group.items.map((item) => (
                      <DecisionItemRow key={item.id} item={item} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <div className="space-y-5 sm:hidden">
              {mobileGroups.map((group) => (
                <section
                  key={group.key}
                  aria-labelledby={`decision-group-m-${group.key}`}
                  className="space-y-2.5"
                >
                  <h3
                    id={`decision-group-m-${group.key}`}
                    className={cn(
                      gofTypography.caption,
                      "font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                    )}
                  >
                    {group.label}
                  </h3>
                  <ul className="space-y-2.5">
                    {group.items.map((item) => (
                      <DecisionItemRow key={item.id} item={item} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            </div>
          </details>
        )}
      </ExecutiveSection>
    </div>
  );
}

export function ExecutiveDecisionCenterSkeleton() {
  return (
    <div
      className="space-y-3 rounded-xl border border-border/60 bg-card p-5"
      aria-busy="true"
      aria-label="Carregando centro de decisão"
    >
      <ExecutiveSkeleton heightClassName="h-5" widthClassName="w-1/3" />
      <ExecutiveSkeleton heightClassName="h-32" widthClassName="w-full" />
    </div>
  );
}
