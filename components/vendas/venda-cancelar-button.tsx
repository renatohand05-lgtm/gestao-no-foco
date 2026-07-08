"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ban } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { cancelarVendaAction } from "@/lib/vendas/actions";

type VendaCancelarButtonProps = {
  tenantSlug: string;
  vendaId: string;
  vendaNumero: number;
  isFaturado: boolean;
  redirectTo?: string;
};

export function VendaCancelarButton({
  tenantSlug,
  vendaId,
  vendaNumero,
  isFaturado,
  redirectTo,
}: VendaCancelarButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancelar() {
    setError(null);

    startTransition(async () => {
      const result = await cancelarVendaAction(tenantSlug, vendaId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.push(
        redirectTo ?? `/${tenantSlug}/vendas/${vendaId}?success=cancelado`,
      );
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={isPending}>
        <Ban className="mr-2 size-4" />
        Cancelar
      </Button>

      <DeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="Cancelar venda"
        description={
          <>
            Tem certeza que deseja cancelar a venda{" "}
            <strong>#{String(vendaNumero).padStart(6, "0")}</strong>?
            {isFaturado
              ? " O estoque dos produtos será devolvido automaticamente."
              : " Esta venda ainda não foi faturada."}
          </>
        }
        confirmLabel="Confirmar cancelamento"
        loadingLabel="Cancelando..."
        loading={isPending}
        error={error}
        onConfirm={handleCancelar}
      />
    </>
  );
}
