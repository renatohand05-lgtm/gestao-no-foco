"use client";

import { useEffect, useMemo, useRef } from "react";

import type { PainelAgenciaDados } from "@/lib/painel-agencia/build-data";

import "./painel-agencia.css";
import { painelAgenciaShellHtml } from "./painel-agencia-shell-html";

type Props = {
  dados: PainelAgenciaDados;
  nome: string;
  logoUrl: string | null;
  voltarHref: string;
};

/**
 * Painel Executivo de agência (X Company) no visual do painel HTML original: visão geral, DRE,
 * caixa e reservas, tendência, metas e plano, clientes, churn, gestores e Dras.
 * Renderiza em tela cheia por cima do shell do portal; "Voltar ao portal" devolve ao sistema.
 */
export function PainelAgencia({ dados, nome, logoUrl, voltarHref }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const html = useMemo(
    () => painelAgenciaShellHtml({ nome, logoUrl, voltarHref }),
    [nome, logoUrl, voltarHref],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;

    void (async () => {
      const [{ default: Chart }, { mountPainelAgencia }] = await Promise.all([
        import("chart.js/auto"),
        import("@/lib/painel-agencia/engine"),
      ]);
      if (cancelled) return;
      dispose = mountPainelAgencia(root, dados, Chart);
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [dados]);

  return (
    <div
      ref={rootRef}
      className="pe-ag"
      data-testid="painel-agencia"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
