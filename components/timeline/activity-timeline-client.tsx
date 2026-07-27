"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";

import { TimelineDashboard } from "@/components/timeline/timeline-dashboard";
import { TimelineEmpty } from "@/components/timeline/timeline-empty";
import { TimelineError } from "@/components/timeline/timeline-error";
import { TimelineLoading } from "@/components/timeline/timeline-loading";
import {
  getActivityDetails,
  listActivity,
} from "@/lib/timeline/actions";
import type {
  TimelineDashboardKpis,
  TimelineDetails,
  TimelineEvent,
  TimelineFilters,
  TimelinePage,
} from "@/lib/timeline";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  initialPage: TimelinePage;
  initialKpis: TimelineDashboardKpis;
  initialFilters?: TimelineFilters;
};

export function ActivityTimelineClient({
  tenantSlug,
  initialPage,
  initialKpis,
  initialFilters = {},
}: Props) {
  const [page, setPage] = useState(initialPage);
  const [kpis, setKpis] = useState(initialKpis);
  const [filters, setFilters] = useState<TimelineFilters>(initialFilters);
  const [details, setDetails] = useState<TimelineDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reload = useCallback(
    (nextFilters: TimelineFilters, offset = 0) => {
      startTransition(async () => {
        setError(null);
        const result = await listActivity(tenantSlug, nextFilters, {
          limit: page.limit,
          offset,
          order: "desc",
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        setPage(result.page);
        setKpis(result.kpis);
        setFilters(nextFilters);
      });
    },
    [tenantSlug, page.limit],
  );

  const onSelect = useCallback(
    (event: TimelineEvent) => {
      startTransition(async () => {
        const result = await getActivityDetails(tenantSlug, event.id);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setDetails(result.details);
      });
    },
    [tenantSlug],
  );

  if (error) {
    return <TimelineError message={error} />;
  }

  return (
    <div className="space-y-4" data-activity-timeline>
      {pending ? <TimelineLoading label="Atualizando atividade…" /> : null}

      {page.items.length === 0 && !pending ? (
        <TimelineEmpty />
      ) : (
        <TimelineDashboard
          items={page.items}
          kpis={kpis}
          total={page.total}
          details={details}
          onSelect={onSelect}
          onFiltersChange={(next) => reload(next, 0)}
        />
      )}

      <nav
        aria-label="Paginação da atividade"
        className="flex flex-wrap items-center justify-between gap-2"
      >
        <p className="text-sm text-muted-foreground">
          {page.offset + 1}–{Math.min(page.offset + page.limit, page.total)} de{" "}
          {page.total}
        </p>
        <div className="flex gap-2">
          {page.offset > 0 ? (
            <button
              type="button"
              className={cn(
                "inline-flex h-8 items-center rounded-md border border-input px-3 text-sm hover:bg-muted",
              )}
              onClick={() =>
                reload(filters, Math.max(0, page.offset - page.limit))
              }
            >
              Anterior
            </button>
          ) : null}
          {page.hasMore ? (
            <button
              type="button"
              className="inline-flex h-8 items-center rounded-md border border-input px-3 text-sm hover:bg-muted"
              onClick={() => reload(filters, page.offset + page.limit)}
            >
              Próxima
            </button>
          ) : null}
          {filters.search || filters.source || filters.module ? (
            <button
              type="button"
              className="inline-flex h-8 items-center rounded-md border border-input px-3 text-sm hover:bg-muted"
              onClick={() => reload({})}
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
      </nav>

      {details?.event.link ? (
        <p className="text-sm">
          <Link className="underline" href={details.event.link}>
            Abrir entidade relacionada
          </Link>
        </p>
      ) : null}
    </div>
  );
}
