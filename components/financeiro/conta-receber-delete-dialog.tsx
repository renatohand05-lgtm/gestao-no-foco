"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { deleteContaReceberAction } from "@/lib/financeiro/actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  id: string;
  descricao: string;
};

export function ContaReceberDeleteDialog({
  open,
  onOpenChange,
  tenantSlug,
  id,
  descricao,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteContaReceberAction(tenantSlug, id);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.push(`/${tenantSlug}/financeiro/contas-receber?success=deleted`);
    });
  }

  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir conta a receber"
      description={
        <>
          Tem certeza que deseja excluir <strong>{descricao}</strong>? Somente
          títulos cancelados podem ser excluídos.
        </>
      }
      loading={isPending}
      error={error}
      onConfirm={handleDelete}
    />
  );
}
