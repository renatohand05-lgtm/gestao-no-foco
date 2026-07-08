"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ActionButton } from "@/components/ui/action-button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { deleteClienteAction } from "@/lib/clientes/actions";

type ClienteDeleteButtonProps = {
  tenantSlug: string;
  clienteId: string;
  clienteNome: string;
};

export function ClienteDeleteButton({
  tenantSlug,
  clienteId,
  clienteNome,
}: ClienteDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

      setOpen(false);
      router.push(`/${tenantSlug}/clientes?success=deleted`);
      router.refresh();
    });
  }

  return (
    <>
      <ActionButton action="delete" onClick={() => setOpen(true)} />

      <DeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="Excluir cliente"
        description={
          <>
            Tem certeza que deseja excluir <strong>{clienteNome}</strong>? Esta
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
