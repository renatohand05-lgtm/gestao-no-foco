"use client";

import { useState } from "react";

import { ContaPagarDeleteDialog } from "@/components/financeiro/conta-pagar-delete-dialog";
import { ActionButton } from "@/components/ui/action-button";

type Props = {
  tenantSlug: string;
  id: string;
  descricao: string;
};

export function ContaPagarDeleteButton({ tenantSlug, id, descricao }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionButton action="delete" onClick={() => setOpen(true)} />
      <ContaPagarDeleteDialog
        open={open}
        onOpenChange={setOpen}
        tenantSlug={tenantSlug}
        id={id}
        descricao={descricao}
      />
    </>
  );
}
