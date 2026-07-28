"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { BankAccountCard } from "@/components/finance/bank-account-card";
import { archiveBankAccount, createBankAccount } from "@/lib/finance/actions";
import type { BankAccount, BankAccountType } from "@/lib/finance";
import { gofTypography } from "@/lib/design-system";

type Props = {
  tenantSlug: string;
  accounts: BankAccount[];
};

export function ContasClient({ tenantSlug, accounts }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        className="grid gap-2 rounded-xl border border-border/60 p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            await createBankAccount(tenantSlug, {
              name: String(fd.get("name")),
              bank: String(fd.get("bank") || "") || null,
              agency: String(fd.get("agency") || "") || null,
              accountNumber: String(fd.get("accountNumber") || "") || null,
              type: String(fd.get("type")) as BankAccountType,
              initialBalance: Number(fd.get("initialBalance") || 0),
            });
            router.refresh();
            e.currentTarget.reset();
          });
        }}
      >
        <p className={cnTitle()}>Nova conta bancária</p>
        <input name="name" required placeholder="Nome" className="h-9 rounded-md border px-2 text-sm sm:col-span-2" />
        <input name="bank" placeholder="Banco" className="h-9 rounded-md border px-2 text-sm" />
        <input name="agency" placeholder="Agência" className="h-9 rounded-md border px-2 text-sm" />
        <input name="accountNumber" placeholder="Conta" className="h-9 rounded-md border px-2 text-sm" />
        <select name="type" className="h-9 rounded-md border px-2 text-sm" defaultValue="corrente">
          <option value="corrente">Corrente</option>
          <option value="poupanca">Poupança</option>
          <option value="investimento">Investimento</option>
          <option value="caixa">Caixa</option>
          <option value="outros">Outros</option>
        </select>
        <input
          name="initialBalance"
          type="number"
          step="0.01"
          placeholder="Saldo inicial"
          defaultValue={0}
          className="h-9 rounded-md border px-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md border px-3 text-sm hover:bg-muted sm:col-span-2"
        >
          {pending ? "Salvando…" : "Cadastrar conta"}
        </button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {accounts.map((a) => (
          <BankAccountCard
            key={a.id}
            account={a}
            onArchive={(id) =>
              startTransition(async () => {
                await archiveBankAccount(tenantSlug, id);
                router.refresh();
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

function cnTitle() {
  return gofTypography.title + " sm:col-span-2";
}
