"use client";

import type { LatencyStats } from "@/lib/observability";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  latency: LatencyStats;
  className?: string;
};

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value} ms</span>
    </div>
  );
}

export function LatencyCard({ latency, className }: Props) {
  return (
    <section
      data-latency-card
      className={cn(
        "space-y-2 rounded-xl border border-border/60 bg-card p-4",
        className,
      )}
    >
      <p className={gofTypography.title}>Latência</p>
      <Row label="Média" value={latency.avgMs} />
      <Row label="P95" value={latency.p95Ms} />
      <Row label="P99" value={latency.p99Ms} />
      <Row label="Mín" value={latency.minMs} />
      <Row label="Máx" value={latency.maxMs} />
      <p className={cn(gofTypography.caption, "pt-1")}>
        Amostras: {latency.samples}
      </p>
    </section>
  );
}
