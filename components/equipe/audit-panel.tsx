import { History } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { TeamAuditEvent } from "@/lib/equipe";
import { formatAuditTimestamp, getAuditEventDefinition } from "@/lib/audit";

type AuditPanelProps = {
  events: TeamAuditEvent[];
};

/** Sprint 30.2 — auditoria honesta: lista eventos reais de audit_events (module=equipe). */
export function AuditPanel({ events }: AuditPanelProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Sem eventos de auditoria"
        description="Ações de equipe (papéis, convites, equipes, cargos) aparecerão aqui conforme forem realizadas."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditoria da Equipe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {getAuditEventDefinition(event.event)?.label ?? event.event}
              </p>
              {event.description ? (
                <p className="text-sm text-muted-foreground">{event.description}</p>
              ) : null}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatAuditTimestamp(event.createdAt)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
