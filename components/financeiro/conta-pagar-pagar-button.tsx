"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { ContaPagarPagarDialog } from "@/components/financeiro/conta-pagar-pagar-dialog";
import { Button } from "@/components/ui/button";
import type { ContaPagarDetail } from "@/types/contas-pagar";

type Props = {
  tenantSlug: string;
  item: ContaPagarDetail;
  formasPagamento: { id: string; nome: string }[];
  contasBancarias: { id: string; nome: string }[];
};

export function ContaPagarPagarButton({
  tenantSlug,
  item,
  formasPagamento,
  contasBancarias,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <CheckCircle2 className="mr-2 size-4" />
        Registrar pagamento
      </Button>
      <ContaPagarPagarDialog
        open={open}
        onOpenChange={setOpen}
        tenantSlug={tenantSlug}
        item={item}
        formasPagamento={formasPagamento}
        contasBancarias={contasBancarias}
      />
    </>
  );
}
