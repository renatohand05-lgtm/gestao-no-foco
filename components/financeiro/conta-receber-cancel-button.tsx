"use client";

import { Ban } from "lucide-react";
import { useState } from "react";

import { ContaReceberCancelDialog } from "@/components/financeiro/conta-receber-cancel-dialog";
import { Button } from "@/components/ui/button";

type Props = {
  tenantSlug: string;
  id: string;
  descricao: string;
};

export function ContaReceberCancelButton({ tenantSlug, id, descricao }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Ban className="mr-2 size-4" />
        Cancelar
      </Button>
      <ContaReceberCancelDialog
        open={open}
        onOpenChange={setOpen}
        tenantSlug={tenantSlug}
        id={id}
        descricao={descricao}
      />
    </>
  );
}
