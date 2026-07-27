"use client";

import type { TraceSpan } from "@/lib/observability";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  traces: TraceSpan[];
  className?: string;
};

export function TracePanel({ traces, className }: Props) {
  return (
    <section
      data-trace-panel
      className={cn(
        "space-y-3 rounded-xl border border-border/60 p-4",
        className,
      )}
    >
      <p className={gofTypography.title}>Traces</p>
      {traces.length === 0 ? (
        <p className={gofTypography.caption}>Sem traces recentes.</p>
      ) : (
        <ul className="space-y-2">
          {traces.map((t) => (
            <li
              key={`${t.traceId}-${t.startedAt}`}
              className="rounded-lg border border-border/40 px-3 py-2 font-mono text-xs"
            >
              <p className="truncate text-foreground">{t.traceId}</p>
              <p className={cn(gofTypography.caption, "font-sans")}>
                {t.module}/{t.action} · {t.status}
                {t.durationMs != null ? ` · ${t.durationMs} ms` : ""}
              </p>
              <p className="truncate text-muted-foreground">
                corr={t.correlationId} · req={t.requestId}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
