"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { deleteVendaAction } from "@/lib/vendas/actions";
import { formatVendaNumero } from "@/lib/vendas/format";

type VendaDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  vendaId: string;
  vendaNumero: number;
  redirectTo?: string;
};

export function VendaDeleteDialog({
  open,
  onOpenChange,
  tenantSlug,
  vendaId,
  vendaNumero,
  redirectTo,
}: VendaDeleteDialogProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);

    startTransition(async () => {
      const result = await deleteVendaAction(tenantSlug, vendaId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.push(redirectTo ?? `/${tenantSlug}/vendas?success=deleted`);
    });
  }

  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir venda"
      description={
        <>
          Tem certeza que deseja excluir a venda{" "}
          <strong>{formatVendaNumero(vendaNumero)}</strong>? Esta ação usa
          exclusão lógica.
        </>
      }
      loading={isPending}
      error={error}
      onConfirm={handleDelete}
    />
  );
}
