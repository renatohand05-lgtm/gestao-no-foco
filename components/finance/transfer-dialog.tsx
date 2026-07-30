"use client";

import { useRouter } from "next/navigation";

import { TransferForm } from "@/components/finance/transfer-form";
import type { BankAccount } from "@/lib/finance";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  accounts: BankAccount[];
  defaultFromAccountId?: string;
  className?: string;
};

export function TransferDialog({
  open,
  onOpenChange,
  tenantSlug,
  accounts,
  defaultFromAccountId,
  className,
}: Props) {
  const router = useRouter();
  if (!open) return null;

  return (
    <div
      data-transfer-dialog
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center",
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Transferência entre contas"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-[var(--brand-white)] p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </button>
        </div>
        <TransferForm
          key={defaultFromAccountId ?? "new"}
          tenantSlug={tenantSlug}
          accounts={accounts}
          defaultFromAccountId={defaultFromAccountId}
          onDone={() => {
            onOpenChange(false);
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
