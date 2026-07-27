"use client";

import type { TimelineDetails } from "@/lib/timeline";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  details: TimelineDetails | null;
  className?: string;
  onClose?: () => void;
};

export function TimelineDetailsPanel({ details, className, onClose }: Props) {
  if (!details) {
    return (
      <aside
        data-timeline-details
        className={cn(
          "rounded-xl border border-border/60 p-4 text-sm text-muted-foreground",
          className,
        )}
      >
        Selecione um evento para ver detalhes.
      </aside>
    );
  }

  const { event } = details;

  return (
    <aside
      data-timeline-details
      className={cn(
        "space-y-3 rounded-xl border border-border/60 bg-[var(--brand-white)] p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={gofTypography.caption}>{event.source}</p>
          <h3 className={cn(gofTypography.title, "text-sm")}>{event.title}</h3>
        </div>
        {onClose ? (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            Fechar
          </button>
        ) : null}
      </div>

      <dl className="grid gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Descrição</dt>
          <dd>{event.description ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Ator</dt>
          <dd>{event.actorName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Módulo / categoria</dt>
          <dd>
            {event.module ?? "—"} · {event.category ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Severidade / status</dt>
          <dd>
            {event.severity} · {event.status ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Quando</dt>
          <dd>{event.createdAt}</dd>
        </div>
      </dl>

      <section className="space-y-1">
        <h4 className={cn(gofTypography.caption, "font-semibold")}>Metadata</h4>
        <pre className="max-h-40 overflow-auto rounded bg-muted/40 p-2 text-[10px]">
          {JSON.stringify(details.metadata, null, 2)}
        </pre>
      </section>

      <RelatedList title="Audit relacionado" items={details.relatedAudit.length} />
      <RelatedList title="Workflow relacionado" items={details.relatedWorkflow.length} />
      <RelatedList title="Approval relacionado" items={details.relatedApproval.length} />
      <RelatedList
        title="Notifications relacionadas"
        items={details.relatedNotifications.length}
      />
    </aside>
  );
}

function RelatedList({ title, items }: { title: string; items: number }) {
  return (
    <p className={gofTypography.caption}>
      {title}: {items}
    </p>
  );
}
