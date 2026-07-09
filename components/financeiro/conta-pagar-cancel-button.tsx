"use client";

import { Ban } from "lucide-react";
import { useState } from "react";

import { ContaPagarCancelDialog } from "@/components/financeiro/conta-pagar-cancel-dialog";
import { Button } from "@/components/ui/button";

type Props = {
  tenantSlug: string;
  id: string;
  descricao: string;
};

export function ContaPagarCancelButton({ tenantSlug, id, descricao }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Ban className="mr-2 size-4" />
        Cancelar
      </Button>
      <ContaPagarCancelDialog
        open={open}
        onOpenChange={setOpen}
        tenantSlug={tenantSlug}
        id={id}
        descricao={descricao}
      />
    </>
  );
}
