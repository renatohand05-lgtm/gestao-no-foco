"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";

import { TreasuryAccountCard } from "@/components/finance/treasury-account-card";
import { TransferDialog } from "@/components/finance/transfer-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { TreasuryAccountView } from "@/lib/finance";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  accounts: TreasuryAccountView[];
  className?: string;
};

export function TreasuryAccountsGrid({
  tenantSlug,
  accounts,
  className,
}: Props) {
  const [fromId, setFromId] = useState<string | null>(null);
  const open = Boolean(fromId);

  return (
    <section data-treasury-accounts-grid className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className={gofTypography.title}>Contas bancárias</p>
          <p className={gofTypography.caption}>
            Posição por conta e participação no caixa
          </p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta ativa"
          description="Cadastre uma conta bancária para acompanhar saldos e participação no caixa."
          action={{
            label: "Gerir contas",
            href: `/${tenantSlug}/financeiro/contas`,
          }}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((view) => (
            <TreasuryAccountCard
              key={view.account.id}
              view={view}
              tenantSlug={tenantSlug}
              onTransfer={setFromId}
            />
          ))}
        </div>
      )}

      <TransferDialog
        open={open}
        onOpenChange={(v) => {
          if (!v) setFromId(null);
        }}
        tenantSlug={tenantSlug}
        accounts={accounts.map((a) => a.account)}
        defaultFromAccountId={fromId ?? undefined}
      />
    </section>
  );
}
