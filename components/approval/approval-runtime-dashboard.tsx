"use client";

import { useMemo, useState } from "react";

import { ApprovalOverdueCard } from "@/components/approval/approval-overdue-card";
import { ApprovalPendingCard } from "@/components/approval/approval-pending-card";
import { ApprovalRuntimePanel } from "@/components/approval/approval-runtime-panel";
import { ApprovalRuntimeSummary } from "@/components/approval/approval-runtime-summary";
import { Input } from "@/components/ui/input";
import {
  computeApprovalKpis,
  filterRuntimeItems,
  type ApprovalRuntimeFilters,
  type ApprovalRuntimeKpis,
  type ApprovalRuntimeListItem,
} from "@/lib/approval/runtime";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  items: ApprovalRuntimeListItem[];
  kpis?: ApprovalRuntimeKpis;
  page?: number;
  total?: number;
  limit?: number;
  selectedId?: string | null;
  className?: string;
  onSelect?: (requestId: string) => void;
};

export function ApprovalRuntimeDashboard({
  items,
  kpis: kpisProp,
  page,
  total,
  limit,
  selectedId,
  className,
  onSelect,
}: Props) {
  const [filters, setFilters] = useState<ApprovalRuntimeFilters>({});

  const filtered = useMemo(
    () => filterRuntimeItems(items, filters),
    [items, filters],
  );
  const kpis = kpisProp ?? computeApprovalKpis(filtered);
  const selected = filtered.find((i) => i.request.id === selectedId) ?? filtered[0];

  return (
    <div
      data-approval-runtime-dashboard
      className={cn("space-y-4", className)}
    >
      <header className="space-y-2">
        <h2 className={cn(gofTypography.title, "text-lg")}>
          Dashboard de Aprovações
        </h2>
        {page != null && total != null ? (
          <p className={gofTypography.caption}>
            Página {page}
            {limit != null ? ` · ${total} total · limite ${limit}` : ` · ${total} total`}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Status"
            className="max-w-[140px]"
            value={filters.status ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value || null }))
            }
          />
          <Input
            placeholder="Prioridade"
            className="max-w-[140px]"
            value={filters.priority ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, priority: e.target.value || null }))
            }
          />
          <Input
            placeholder="Solicitante"
            className="max-w-[160px]"
            value={filters.requesterId ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                requesterId: e.target.value || null,
              }))
            }
          />
        </div>
      </header>

      <ApprovalRuntimeSummary kpis={kpis} />

      <div className="grid gap-3 lg:grid-cols-3">
        <ApprovalPendingCard items={filtered} />
        <ApprovalOverdueCard items={filtered} />
        <section className="space-y-2 rounded-xl border border-border/60 p-3">
          <h3 className={cn(gofTypography.title, "text-sm")}>Lista</h3>
          <ul className="max-h-48 space-y-1 overflow-auto">
            {filtered.map((item) => (
              <li key={item.request.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded px-2 py-1 text-left text-sm hover:bg-muted/50",
                    selected?.request.id === item.request.id && "bg-muted",
                  )}
                  onClick={() => onSelect?.(item.request.id)}
                >
                  {item.request.id} · {item.request.status}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {selected ? (
        <ApprovalRuntimePanel
          request={selected.request}
          definition={selected.definition}
          sla={selected.sla}
          timeline={selected.request.history.map((h) => ({
            id: h.id,
            type:
              h.metadata?.delegated === true
                ? "delegated"
                : h.metadata?.escalated === true
                  ? "escalated"
                  : h.metadata?.reopened === true
                    ? "reopened"
                    : h.metadata?.retry === true
                      ? "retry"
                      : h.decision === "APPROVE"
                        ? "approved"
                        : h.decision === "REJECT"
                          ? "rejected"
                          : h.decision === "CANCEL"
                            ? "cancelled"
                            : h.decision === "EXPIRE"
                              ? "expired"
                              : "created",
            at: h.at,
            actorId: h.actor.userId,
            levelId: h.levelId,
            comment: h.comment,
            metadata: { ...h.metadata },
            auditLinked: true,
          }))}
          disabled
        />
      ) : null}
    </div>
  );
}
