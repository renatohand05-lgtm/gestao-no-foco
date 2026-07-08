"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { faturarVendaAction } from "@/lib/vendas/actions";
import { formatVendaNumero } from "@/lib/vendas/format";

type VendaFaturarButtonProps = {
  tenantSlug: string;
  vendaId: string;
  vendaNumero: number;
  redirectTo?: string;
};

export function VendaFaturarButton({
  tenantSlug,
  vendaId,
  vendaNumero,
  redirectTo,
}: VendaFaturarButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFaturar() {
    setError(null);

    startTransition(async () => {
      const result = await faturarVendaAction(tenantSlug, vendaId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.push(
        redirectTo ?? `/${tenantSlug}/vendas/${vendaId}?success=faturado`,
      );
      router.refresh();
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={isPending}>
        <Receipt className="mr-2 size-4" />
        Faturar
      </Button>

      <DeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="Faturar venda"
        description={
          <>
            Confirmar faturamento da venda{" "}
            <strong>{formatVendaNumero(vendaNumero)}</strong>? O estoque será
            baixado automaticamente para os produtos com controle de estoque.
          </>
        }
        confirmLabel="Confirmar faturamento"
        loadingLabel="Faturando..."
        loading={isPending}
        error={error}
        onConfirm={handleFaturar}
      />
    </>
  );
}
