"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { ContaReceberReceberDialog } from "@/components/financeiro/conta-receber-receber-dialog";
import { Button } from "@/components/ui/button";
import type { ContaReceberDetail } from "@/types/contas-receber";

type Props = {
  tenantSlug: string;
  item: ContaReceberDetail;
};

export function ContaReceberReceberButton({ tenantSlug, item }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <CheckCircle2 className="mr-2 size-4" />
        Registrar recebimento
      </Button>
      <ContaReceberReceberDialog
        open={open}
        onOpenChange={setOpen}
        tenantSlug={tenantSlug}
        item={item}
      />
    </>
  );
}
