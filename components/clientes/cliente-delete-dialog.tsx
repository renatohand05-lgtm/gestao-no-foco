"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DeleteDialog } from "@/components/ui/delete-dialog";
import { deleteClienteAction } from "@/lib/clientes/actions";

type ClienteDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  clienteId: string;
  clienteNome: string;
};

export function ClienteDeleteDialog({
  open,
  onOpenChange,
  tenantSlug,
  clienteId,
  clienteNome,
}: ClienteDeleteDialogProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);

    startTransition(async () => {
      const result = await deleteClienteAction(tenantSlug, clienteId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      router.push(`/${tenantSlug}/clientes?success=deleted`);
    });
  }

  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir cliente"
      description={
        <>
          Tem certeza que deseja excluir <strong>{clienteNome}</strong>? Esta
          ação usa exclusão lógica e pode ser revertida futuramente no banco.
        </>
      }
      loading={isPending}
      error={error}
      onConfirm={handleDelete}
    />
  );
}
