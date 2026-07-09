"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { deleteContaPagarAction } from "@/lib/financeiro/actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  id: string;
  descricao: string;
};

export function ContaPagarDeleteDialog({
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
      const result = await deleteContaPagarAction(tenantSlug, id);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.push(
        `/${tenantSlug}/financeiro/contas-pagar?success=deleted`,
      );
      router.refresh();
    });
  }

  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir conta a pagar"
      description={
        <>
          Tem certeza que deseja excluir <strong>{descricao}</strong>? Esta ação
          remove o registro cancelado da listagem.
        </>
      }
      loading={isPending}
      error={error}
      onConfirm={handleConfirm}
    />
  );
}
