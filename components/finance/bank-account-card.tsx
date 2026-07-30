"use client";

import type { BankAccount } from "@/lib/finance";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  account: BankAccount;
  className?: string;
  onArchive?: (id: string) => void;
};

export function BankAccountCard({ account, className, onArchive }: Props) {
  return (
    <article
      data-bank-account-card
      className={cn(
        "rounded-xl border border-border/60 bg-card p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={cn(gofTypography.caption, "uppercase")}>{account.type}</p>
          <h3 className={cn(gofTypography.title, "text-base")}>{account.name}</h3>
          <p className={gofTypography.caption}>
            {[account.bank, account.agency, account.accountNumber]
              .filter(Boolean)
              .join(" · ") || "Sem dados bancários"}
          </p>
        </div>
        <p className="text-lg font-semibold tabular-nums">
          {money(account.currentBalance)}
        </p>
      </div>
      {onArchive && account.status === "active" ? (
        <button
          type="button"
          className="mt-3 text-sm text-muted-foreground underline"
          onClick={() => onArchive(account.id)}
        >
          Arquivar
        </button>
      ) : null}
    </article>
  );
}
