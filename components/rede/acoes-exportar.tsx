"use client";

import { Download, Printer } from "lucide-react";

import { useRelatorio } from "@/components/rede/relatorio";
import { Button } from "@/components/ui/button";
import { gerarCsv } from "@/lib/rede/csv";
import { comCabecalhoCsv, formatarGeradoEm, type RelatorioMeta } from "@/lib/rede/relatorio";

type Celula = string | number | null;

/**
 * Baixa um CSV montado no navegador (sem ida ao servidor) e/ou abre a impressão (Salvar como PDF).
 * Dentro de um relatório da rede, o CSV abre com o cabeçalho padrão (relatório, cliente, período e filtros,
 * unidades, data de geração e origem dos dados) e uma linha em branco antes da tabela.
 */
export function AcoesExportar({ arquivo, linhas, imprimir = true, rotulo = "Exportar CSV", meta }: { arquivo: string; linhas: Celula[][]; imprimir?: boolean; rotulo?: string; /** Cabeçalho próprio (a tela tem filtros que mudam no navegador); vale mais que o da página. */ meta?: RelatorioMeta }) {
  const relatorio = useRelatorio();
  const baixar = () => {
    const completo = comCabecalhoCsv(linhas, meta ?? relatorio?.meta, relatorio ? relatorio.geradoAgora() : formatarGeradoEm(new Date()));
    const blob = new Blob([gerarCsv(completo)], { type: "text/csv;charset=utf-8" });
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
