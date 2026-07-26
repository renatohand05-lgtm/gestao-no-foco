"use client";

import {
  formatAuditActor,
  formatAuditEventSummary,
  formatAuditEventTitle,
  formatAuditTarget,
  formatAuditTimestamp,
  type AuditEvent,
} from "@/lib/audit";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

import { AuditCategoryBadge } from "@/components/audit/audit-category-badge";
import { AuditSeverityBadge } from "@/components/audit/audit-severity-badge";

type Props = {
  event: AuditEvent;
  className?: string;
};

/**
 * Painel de detalhes de um evento — sem expor dados internos sensíveis além do registrado.
 */
export function AuditDetails({ event, className }: Props) {
  return (
    <article
      data-audit-details
      aria-label={formatAuditEventTitle(event)}
      className={cn(
        "space-y-4 rounded-xl border border-border/60 bg-[var(--brand-white)] p-4 sm:p-5",
        className,
      )}
    >
      <header className="space-y-2">
        <p className={gofTypography.caption}>
          {formatAuditTimestamp(event.timestamp)}
        </p>
        <h2 className={cn(gofTypography.title, "text-lg")}>
          {formatAuditEventTitle(event)}
        </h2>
        <p className={cn(gofTypography.subtitle, "text-sm")}>
          {formatAuditEventSummary(event)}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <AuditSeverityBadge severity={event.severity} />
          <AuditCategoryBadge category={event.category} />
        </div>
      </header>

      <p className="text-sm text-foreground">{event.description}</p>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <Detail label="Tenant" value={event.tenantId} />
        <Detail label="Ator" value={formatAuditActor(event)} />
        <Detail label="Alvo" value={formatAuditTarget(event)} />
        <Detail label="Módulo" value={event.module ?? "—"} />
        <Detail label="Recurso" value={event.resource ?? "—"} />
        <Detail label="Origem" value={event.origin} />
        <Detail label="Correlation" value={event.correlationId ?? "—"} />
        <Detail label="Request" value={event.requestId ?? "—"} />
        <Detail label="Sessão" value={event.sessionId ?? "—"} />
        <Detail label="IP" value={event.ip ?? "—"} />
        <Detail label="Device" value={event.device ?? "—"} />
        <Detail label="Evento" value={event.event} />
      </dl>

      {Object.keys(event.metadata).length > 0 ? (
        <div className="space-y-1">
          <p className={gofTypography.caption}>Metadata</p>
          <pre
            className={cn(
              "overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs",
              gofTypography.caption,
            )}
          >
            {JSON.stringify(event.metadata, null, 2)}
          </pre>
        </div>
      ) : null}
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className={cn(gofTypography.caption)}>{label}</dt>
      <dd className="break-all font-medium text-foreground">{value}</dd>
    </div>
  );
}
