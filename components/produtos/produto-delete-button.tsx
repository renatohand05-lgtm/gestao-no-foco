"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ActionButton } from "@/components/ui/action-button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { deleteProdutoAction } from "@/lib/produtos/actions";

type ProdutoDeleteButtonProps = {
  tenantSlug: string;
  produtoId: string;
  produtoNome: string;
};

export function ProdutoDeleteButton({
  tenantSlug,
  produtoId,
  produtoNome,
}: ProdutoDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

      setOpen(false);
      router.push(`/${tenantSlug}/produtos?success=deleted`);
      router.refresh();
    });
  }

  return (
    <>
      <ActionButton action="delete" onClick={() => setOpen(true)} />

      <DeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="Excluir item"
        description={
          <>
            Tem certeza que deseja excluir <strong>{produtoNome}</strong>? Esta
            ação usa exclusão lógica.
          </>
        }
        confirmLabel="Confirmar exclusão"
        loading={isPending}
        error={error}
        onConfirm={handleDelete}
      />
    </>
  );
}
