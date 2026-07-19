"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ActionButton } from "@/components/ui/action-button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { formatCurrency } from "@/lib/dashboard/format";
import { deleteMetaVendasAction } from "@/lib/metas/actions";

type Props = {
  tenantSlug: string;
  metaId: string;
  competencia: string;
  centroNome: string | null;
  valorMeta: number;
  /** Após exclusão na edição, redireciona para o histórico. */
  redirectToList?: boolean;
  size?: React.ComponentProps<typeof ActionButton>["size"];
  className?: string;
};

export function MetaVendasDeleteButton({
  tenantSlug,
  metaId,
  competencia,
  centroNome,
  valorMeta,
  redirectToList = false,
  size = "sm",
  className,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (isPending) return;
    setOpen(next);
    if (!next) setError(null);
  }

  function handleDelete() {
    if (isPending) return;
    setError(null);

    startTransition(async () => {
      const result = await deleteMetaVendasAction(tenantSlug, metaId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setOpen(false);

      if (redirectToList) {
        router.push(`/${tenantSlug}/configuracoes/metas?success=deleted`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      <ActionButton
        action="delete"
        label="Excluir meta"
        size={size}
        className={className}
        aria-label="Excluir meta de vendas"
        onClick={() => setOpen(true)}
      />

      <DeleteDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Excluir meta de vendas?"
        description={
          <>
            <span className="block">
              Esta ação removerá a meta ativa do período, mas manterá o registro
              técnico para auditoria.
            </span>
            <span className="mt-3 block space-y-1 text-foreground">
              <span className="block">
                <strong>Competência:</strong> {competencia.slice(0, 7)}
              </span>
              <span className="block">
                <strong>Centro de custo:</strong> {centroNome ?? "Geral"}
              </span>
              <span className="block">
                <strong>Valor da meta:</strong> {formatCurrency(valorMeta)}
              </span>
            </span>
          </>
        }
        confirmLabel="Confirmar exclusão"
        cancelLabel="Cancelar"
        loading={isPending}
        loadingLabel="Excluindo..."
        error={error}
        onConfirm={handleDelete}
      />
    </>
  );
}
