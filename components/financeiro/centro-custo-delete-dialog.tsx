"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { deleteCentroCustoAction } from "@/lib/financeiro/actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  id: string;
  nome: string;
};

export function CentroCustoDeleteDialog({
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
      const result = await deleteCentroCustoAction(tenantSlug, id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.push(`/${tenantSlug}/financeiro/centros-custo?success=deleted`);
    });
  }

  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir centro de custo"
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
