"use client";

import { useEffect, useMemo, useRef } from "react";

import type { PainelDados } from "@/lib/painel-executivo/build-data";

import "./painel-executivo.css";
import { painelShellHtml } from "./painel-shell-html";

type Props = {
  dados: PainelDados;
  nome: string;
  logoUrl: string | null;
  voltarHref: string;
};

/**
 * Painel Executivo — 15 telas (visão geral, OS, mecânicos, serviços, clientes, veículos, peças,
 * despesas, DRE, caixa, 4º tri, orçamento/DRE 2027, metas e plano de ação) no visual do painel
 * da Bem Vindo Car. Renderiza em tela cheia por cima do shell do portal; o botão
 * "Voltar ao portal" devolve ao sistema.
 */
export function PainelExecutivo({ dados, nome, logoUrl, voltarHref }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const html = useMemo(
    () => painelShellHtml({ nome, logoUrl, voltarHref }),
    [nome, logoUrl, voltarHref],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;

    void (async () => {
      const [{ default: Chart }, { mountPainel }] = await Promise.all([
        import("chart.js/auto"),
        import("@/lib/painel-executivo/engine"),
      ]);
      if (cancelled) return;
      dispose = mountPainel(root, dados, Chart);
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [dados]);

  return (
    <div
      ref={rootRef}
      className="pe-root"
      data-testid="painel-executivo"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
