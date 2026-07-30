"use client";

import type { TreasuryTransferResult } from "@/lib/finance";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  result: TreasuryTransferResult;
  className?: string;
};

export function TransferSummary({ result, className }: Props) {
  return (
    <div
      data-transfer-summary
      className={cn(
        "space-y-2 rounded-lg border border-emerald-600/30 bg-emerald-50/50 p-3 text-sm",
        className,
      )}
    >
      <p className={gofTypography.title}>Transferência concluída</p>
      <p>
        {money(result.amount)} de{" "}
        <strong>{result.fromAccountName}</strong> para{" "}
        <strong>{result.toAccountName}</strong>
      </p>
      <dl className="grid gap-1 text-xs text-muted-foreground">
        <div className="flex justify-between gap-2">
          <dt>Grupo</dt>
          <dd className="font-mono">{result.transferGroupId ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Correlation</dt>
          <dd className="font-mono truncate">{result.correlationId}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Replay</dt>
          <dd>{result.replayed ? "Sim (idempotente)" : "Não"}</dd>
        </div>
      </dl>
    </div>
  );
}
