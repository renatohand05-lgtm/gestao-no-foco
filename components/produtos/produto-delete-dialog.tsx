"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { deleteProdutoAction } from "@/lib/produtos/actions";

type ProdutoDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  produtoId: string;
  produtoNome: string;
};

export function ProdutoDeleteDialog({
  open,
  onOpenChange,
  tenantSlug,
  produtoId,
  produtoNome,
}: ProdutoDeleteDialogProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);

    startTransition(async () => {
      const result = await deleteProdutoAction(tenantSlug, produtoId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.push(`/${tenantSlug}/produtos?success=deleted`);
    });
  }

  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir item"
      description={
        <>
          Tem certeza que deseja excluir <strong>{produtoNome}</strong>? Esta
          ação usa exclusão lógica e pode ser revertida futuramente no banco.
        </>
      }
      loading={isPending}
      error={error}
      onConfirm={handleDelete}
    />
  );
}
