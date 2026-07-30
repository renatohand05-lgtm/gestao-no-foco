"use client";

import Link from "next/link";

import type { TreasuryAccountView } from "@/lib/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

type Props = {
  view: TreasuryAccountView;
  tenantSlug: string;
  onTransfer?: (accountId: string) => void;
  className?: string;
};

export function TreasuryAccountCard({
  view,
  tenantSlug,
  onTransfer,
  className,
}: Props) {
  const { account, availableBalance, shareOfTotalPct, lastMovement, canTransfer } =
    view;
  const detailHref = `/${tenantSlug}/financeiro/contas`;
  const active = account.status === "active";

  return (
    <Card
      data-treasury-account-card
      className={cn(
        "flex h-full flex-col border-border/40 shadow-sm ring-1 ring-border/10",
        className,
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardDescription className="truncate uppercase tracking-[0.05em]">
              {[account.bank || "Banco", account.type].filter(Boolean).join(" · ")}
            </CardDescription>
            <CardTitle className="mt-0.5 truncate text-base">
              {account.name}
            </CardTitle>
          </div>
          <Badge variant={active ? "success" : "outline"}>
            {active ? "Ativa" : "Arquivada"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Saldo disponível
          </p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {money(availableBalance)}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            Atual {money(account.currentBalance)}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Participação no caixa</span>
            <span className="tabular-nums font-medium text-foreground">
              {shareOfTotalPct}%
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={shareOfTotalPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Participação no caixa total"
          >
            <div
              className="h-full rounded-full bg-[var(--brand-graphite)]/70"
              style={{
                width: `${Math.min(100, Math.max(0, shareOfTotalPct))}%`,
              }}
            />
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {lastMovement
            ? `Última movimentação · ${formatDate(lastMovement.movementDate)} · ${lastMovement.description}`
            : "Sem lançamentos recentes"}
        </p>
      </CardContent>

      <CardFooter className="mt-auto gap-2 border-t-0 bg-transparent">
        <Button variant="outline" size="sm" render={<Link href={detailHref} />}>
          Gerir contas
        </Button>
        {canTransfer && onTransfer ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onTransfer(account.id)}
          >
            Transferir
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
