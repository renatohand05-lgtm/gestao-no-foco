"use client";

import { Printer } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { OsPrintReceipt } from "@/components/ordens/os-print-receipt";
import type { OrdemServicoDetail } from "@/lib/ordens/ordem-servico-service";

type Props = {
  os: OrdemServicoDetail;
  empresaNome?: string;
  workOrderLabel: string;
  responsavelNome?: string | null;
};

export function OsPrintButton({
  os,
  empresaNome,
  workOrderLabel,
  responsavelNome,
}: Props) {
  const [mounted, setMounted] = useState(false);

  function handlePrint() {
    setMounted(true);
    // Espera o recibo entrar no DOM antes de chamar o print do navegador.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="size-3.5" aria-hidden />
        Imprimir
      </Button>
      {mounted
        ? createPortal(
            <div id="os-print-receipt-portal">
              <OsPrintReceipt
                os={os}
                empresaNome={empresaNome}
                workOrderLabel={workOrderLabel}
                responsavelNome={responsavelNome}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
