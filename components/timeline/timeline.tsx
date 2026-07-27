"use client";

import { useMemo, useState } from "react";

import { TimelineDetailsPanel } from "@/components/timeline/timeline-details";
import { TimelineEmpty } from "@/components/timeline/timeline-empty";
import { TimelineFiltersBar } from "@/components/timeline/timeline-filters";
import { TimelineGroupView } from "@/components/timeline/timeline-group";
import { TimelineHeader } from "@/components/timeline/timeline-header";
import { TimelineItem } from "@/components/timeline/timeline-item";
import { TimelineSearch } from "@/components/timeline/timeline-search";
import { TimelineSidebar } from "@/components/timeline/timeline-sidebar";
import {
  filterTimelineEvents,
  groupTimelineEvents,
  type TimelineDashboardKpis,
  type TimelineDetails,
  type TimelineEvent,
  type TimelineFilters,
  type TimelineGroupBy,
} from "@/lib/timeline";
import { cn } from "@/lib/utils";

type Props = {
  items: TimelineEvent[];
  total?: number;
  kpis?: TimelineDashboardKpis | null;
  details?: TimelineDetails | null;
  groupBy?: TimelineGroupBy;
  className?: string;
  onSelect?: (event: TimelineEvent) => void;
  onFiltersChange?: (filters: TimelineFilters) => void;
};

export function Timeline({
  items,
  total,
  kpis,
  details,
  groupBy = "day",
  className,
  onSelect,
  onFiltersChange,
}: Props) {
  const [filters, setFilters] = useState<TimelineFilters>({});
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      filterTimelineEvents(items, {
        ...filters,
        search: search || filters.search,
      }),
    [items, filters, search],
  );

  const groups = useMemo(
    () => groupTimelineEvents(filtered, groupBy),
    [filtered, groupBy],
  );

  return (
    <div data-timeline className={cn("space-y-4", className)}>
      <TimelineHeader total={total ?? filtered.length} />
      <div className="flex flex-wrap gap-3">
        <TimelineSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            onFiltersChange?.({ ...filters, search: v || null });
          }}
        />
        <TimelineFiltersBar
          value={filters}
          onChange={(next) => {
            setFilters(next);
            onFiltersChange?.(next);
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_280px]">
        <TimelineSidebar
          kpis={kpis}
          onSourceClick={(source) => {
            const next = { ...filters, source };
            setFilters(next);
            onFiltersChange?.(next);
          }}
        />

        <div className="min-w-0 space-y-4">
          {filtered.length === 0 ? (
            <TimelineEmpty />
          ) : groupBy === "none" ? (
            <div className="space-y-2">
              {filtered.map((event) => (
                <TimelineItem
                  key={event.id}
                  event={event}
                  selected={selectedId === event.id}
                  onSelect={(e) => {
                    setSelectedId(e.id);
                    onSelect?.(e);
                  }}
                />
              ))}
            </div>
          ) : (
            groups.map((group) => (
              <TimelineGroupView
                key={group.key}
                group={group}
                selectedId={selectedId}
                onSelect={(e) => {
                  setSelectedId(e.id);
                  onSelect?.(e);
                }}
              />
            ))
          )}
        </div>

        <TimelineDetailsPanel details={details ?? null} />
      </div>
    </div>
  );
}
