"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { deleteMovimentacaoAction } from "@/lib/estoque/actions";

type EstoqueDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  movimentacaoId: string;
  produtoNome: string;
};

export function EstoqueDeleteDialog({
  open,
  onOpenChange,
  tenantSlug,
  movimentacaoId,
  produtoNome,
}: EstoqueDeleteDialogProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);

    startTransition(async () => {
      const result = await deleteMovimentacaoAction(tenantSlug, movimentacaoId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.push(`/${tenantSlug}/estoque?success=deleted`);
    });
  }

  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir movimentação"
      description={
        <>
          Tem certeza que deseja excluir a movimentação de{" "}
          <strong>{produtoNome}</strong>? Esta ação oculta o registro do
          histórico, mas não reverte automaticamente o estoque atual.
        </>
      }
      loading={isPending}
      error={error}
      onConfirm={handleDelete}
    />
  );
}
