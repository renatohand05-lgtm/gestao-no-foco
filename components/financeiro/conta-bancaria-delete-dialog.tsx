"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { deleteContaBancariaAction } from "@/lib/financeiro/actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  id: string;
  nome: string;
};

export function ContaBancariaDeleteDialog({
  open,
  onOpenChange,
  tenantSlug,
  id,
  nome,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteContaBancariaAction(tenantSlug, id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.push(`/${tenantSlug}/financeiro/contas-bancarias?success=deleted`);
    });
  }

  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir conta bancária"
      description={
        <>
          Tem certeza que deseja excluir <strong>{nome}</strong>? Esta ação
          usa exclusão lógica.
        </>
      }
      loading={isPending}
      error={error}
      onConfirm={handleDelete}
    />
  );
}
