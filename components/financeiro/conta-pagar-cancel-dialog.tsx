"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cancelarContaPagarAction } from "@/lib/financeiro/actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  id: string;
  descricao: string;
};

export function ContaPagarCancelDialog({
  open,
  onOpenChange,
  tenantSlug,
  id,
  descricao,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await cancelarContaPagarAction(tenantSlug, id);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.push(
        `/${tenantSlug}/financeiro/contas-pagar/${id}?success=cancelado`,
      );
      router.refresh();
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancelar conta a pagar"
      description={
        <>
          Tem certeza que deseja cancelar <strong>{descricao}</strong>? O título
          permanecerá no histórico com status cancelado.
        </>
      }
      confirmLabel="Cancelar título"
      loading={isPending}
      error={error}
      onConfirm={handleConfirm}
    />
  );
}
