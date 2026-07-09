"use client";

import { useState } from "react";

import { ContaReceberDeleteDialog } from "@/components/financeiro/conta-receber-delete-dialog";
import { ActionButton } from "@/components/ui/action-button";

type Props = {
  tenantSlug: string;
  id: string;
  descricao: string;
};

export function ContaReceberDeleteButton({ tenantSlug, id, descricao }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionButton action="delete" onClick={() => setOpen(true)} />
      <ContaReceberDeleteDialog
        open={open}
        onOpenChange={setOpen}
        tenantSlug={tenantSlug}
        id={id}
        descricao={descricao}
      />
    </>
  );
}
