"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { resendFailedNotificationAction } from "@/lib/retention/actions";
import { communicationHistoryLine } from "@/lib/retention/history-display";
import { operatorStatusLabel } from "@/lib/retention/pipeline";
import type { OutboxRow } from "@/lib/retention/types";
import { cn } from "@/lib/utils";

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
  canResend = false,
  tenantSlug,
}: {
  rows: OutboxRow[];
  canSeeDetails?: boolean;
  canResend?: boolean;
  tenantSlug?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-phase35="cliente-timeline">
        Nenhuma comunicação registrada.
      </p>
    );
  }
  return (
    <ol className="space-y-3" data-phase35="cliente-timeline" data-phase35-3="os-comms">
      {rows.map((row) => (
        <li key={row.id} className="rounded-lg border p-3 text-sm">
          <p className="font-medium" data-phase35-3="comm-line">
            {communicationHistoryLine(row)}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatWhen(row.created_at)}
          </p>
          {row.rendered_preview ? (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
              {row.rendered_preview}
            </p>
          ) : null}
          {canSeeDetails ? (
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="min-h-11 cursor-pointer">Ver detalhes</summary>
              <p>
                Canal: {row.channel === "email" ? "E-mail" : "WhatsApp"} ·{" "}
                {operatorStatusLabel(row.status, row.error_code)}
              </p>
              {row.provider_message_id ? (
                <p>Id do provider: {row.provider_message_id}</p>
              ) : null}
              {row.failure_kind ? <p>Falha: {row.failure_kind}</p> : null}
              {row.error_message ? <p>{row.error_message}</p> : null}
              {row.attempt_count ? <p>Tentativas: {row.attempt_count}</p> : null}
            </details>
          ) : null}
          {canResend &&
          tenantSlug &&
          row.status === "failed" &&
          row.failure_kind !== "permanent" &&
          row.failure_kind !== "blocked_by_allowlist" ? (
            <button
              type="button"
              disabled={pending}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-2 min-h-11")}
              onClick={() =>
                start(async () => {
                  await resendFailedNotificationAction(tenantSlug, row.id);
                  router.refresh();
                })
              }
            >
              Tentar novamente
            </button>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
