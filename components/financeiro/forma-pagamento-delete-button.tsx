"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ActionButton } from "@/components/ui/action-button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { deleteFormaPagamentoAction } from "@/lib/financeiro/actions";

type Props = {
  tenantSlug: string;
  id: string;
  nome: string;
};

export function FormaPagamentoDeleteButton({ tenantSlug, id, nome }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteFormaPagamentoAction(tenantSlug, id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push(`/${tenantSlug}/financeiro/formas-pagamento?success=deleted`);
      router.refresh();
    });
  }

  return (
    <>
      <ActionButton action="delete" onClick={() => setOpen(true)} />
      <DeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="Excluir forma de pagamento"
        description={
          <>
            Tem certeza que deseja excluir <strong>{nome}</strong>? Esta ação
            usa exclusão lógica.
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
