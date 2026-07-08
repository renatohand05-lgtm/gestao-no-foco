"use client";

import { useState } from "react";

import { ActionButton } from "@/components/ui/action-button";
import { VendaDeleteDialog } from "@/components/vendas/venda-delete-dialog";

type VendaDeleteButtonProps = {
  tenantSlug: string;
  vendaId: string;
  vendaNumero: number;
  redirectTo?: string;
};

export function VendaDeleteButton({
  tenantSlug,
  vendaId,
  vendaNumero,
  redirectTo,
}: VendaDeleteButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionButton action="delete" onClick={() => setOpen(true)} />

      <VendaDeleteDialog
        open={open}
        onOpenChange={setOpen}
        tenantSlug={tenantSlug}
        vendaId={vendaId}
        vendaNumero={vendaNumero}
        redirectTo={redirectTo}
      />
    </>
  );
}
