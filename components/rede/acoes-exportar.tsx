"use client";

import { Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { gerarCsv } from "@/lib/rede/csv";

type Celula = string | number | null;

/** Baixa um CSV montado no navegador (sem ida ao servidor) e/ou abre a impressão (Salvar como PDF). */
export function AcoesExportar({ arquivo, linhas, imprimir = true, rotulo = "Exportar CSV" }: { arquivo: string; linhas: Celula[][]; imprimir?: boolean; rotulo?: string }) {
  const baixar = () => {
    const blob = new Blob([gerarCsv(linhas)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = arquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button type="button" variant="outline" size="sm" onClick={baixar} disabled={linhas.length <= 1}>
        <Download aria-hidden /> {rotulo}
      </Button>
      {imprimir ? (
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
          <Printer aria-hidden /> Imprimir / PDF
        </Button>
      ) : null}
    </div>
  );
}
