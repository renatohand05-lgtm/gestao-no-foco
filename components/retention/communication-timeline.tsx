import { operatorStatusLabel } from "@/lib/retention/pipeline";
import { originLabel } from "@/lib/retention/origin";
import type { OutboxRow } from "@/lib/retention/types";

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CommunicationTimeline({
  rows,
  canSeeDetails = false,
}: {
  rows: OutboxRow[];
  canSeeDetails?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-phase35="cliente-timeline">
        Nenhuma comunicação registrada.
      </p>
    );
  }
  return (
    <ol className="space-y-3" data-phase35="cliente-timeline">
      {rows.map((row) => (
        <li key={row.id} className="rounded-lg border p-3 text-sm">
          <p className="font-medium tabular-nums">{formatWhen(row.created_at)}</p>
          <p className="capitalize">{row.channel === "email" ? "E-mail" : "WhatsApp"}</p>
          <p>{originLabel(row.origin_kind, row.template_code)}</p>
          <p className="text-muted-foreground">{operatorStatusLabel(row.status)}</p>
          {row.rendered_preview ? (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
              {row.rendered_preview}
            </p>
          ) : null}
          {canSeeDetails ? (
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="min-h-11 cursor-pointer">Ver detalhes</summary>
              <p>Origem: {row.entity_type} {row.entity_id ? `· ${row.entity_id.slice(0, 8)}` : ""}</p>
              {row.failure_kind ? <p>Falha: {row.failure_kind}</p> : null}
              {row.error_message ? <p>{row.error_message}</p> : null}
              {row.attempt_count ? <p>Tentativas: {row.attempt_count}</p> : null}
            </details>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
