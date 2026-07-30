"use client";

import { Badge } from "@/components/ui/badge";
import type { ConfidenceBand } from "@/lib/import-engine/assisted-intelligence";

const LABELS: Record<ConfidenceBand, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  unrecognized: "Não reconhecido",
};

const VARIANT: Record<ConfidenceBand, "default" | "secondary" | "outline" | "destructive"> = {
  high: "default",
  medium: "secondary",
  low: "outline",
  unrecognized: "destructive",
};

export function ConfidenceBadge({
  band,
  percent,
  origin,
}: {
  band: ConfidenceBand;
  percent?: number;
  origin?: string;
}) {
  const pct =
    percent != null && Number.isFinite(percent)
      ? ` ${Math.round(percent * 100)}%`
      : "";
  return (
    <Badge variant={VARIANT[band]} title={origin ? `Origem: ${origin}` : undefined}>
      {LABELS[band]}
      {pct}
    </Badge>
  );
}
