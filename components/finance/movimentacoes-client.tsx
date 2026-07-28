"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { MovementForm } from "@/components/finance/movement-form";
import { MovementTable } from "@/components/finance/movement-table";
import { deleteMovement } from "@/lib/finance/actions";
import type { BankAccount, CashMovement, Category, CostCenter } from "@/lib/finance";

type Props = {
  tenantSlug: string;
  accounts: BankAccount[];
  movements: CashMovement[];
  categories: Category[];
  costCenters: CostCenter[];
};

export function MovimentacoesClient({
  tenantSlug,
  accounts,
  movements,
  categories,
  costCenters,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <MovementForm
        tenantSlug={tenantSlug}
        accounts={accounts}
        categories={categories}
        costCenters={costCenters}
        onDone={() => router.refresh()}
      />
      <MovementTable
        movements={movements}
        onDelete={(id) =>
          startTransition(async () => {
            await deleteMovement(tenantSlug, id);
            router.refresh();
          })
        }
      />
    </div>
  );
}
