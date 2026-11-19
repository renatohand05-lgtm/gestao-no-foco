"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { CabecalhoImpressao } from "@/components/rede/cabecalho-impressao";
import { CSS_IMPRESSAO_RELATORIO, formatarGeradoEm, type RelatorioMeta } from "@/lib/rede/relatorio";

type Contexto = { meta: RelatorioMeta; geradoAgora: () => string };

const RelatorioContexto = createContext<Contexto | null>(null);

/** Cabeçalho do relatório da tela aberta (null fora de um relatório) — o CSV baixado usa o mesmo. */
export function useRelatorio(): Contexto | null {
  return useContext(RelatorioContexto);
}

/**
 * Envolve uma tela de relatório da rede: mostra o cabeçalho padrão só na impressão (cliente, período e filtros,
 * unidades, data de geração e origem dos dados), limpa a página impressa (sem menu lateral nem botões flutuantes)
 * e entrega o mesmo cabeçalho aos botões de exportar CSV. A data da impressão é a do momento em que se imprime.
 */
export function RelatorioProvider({
  meta,
  geradoEm,
  className,
  semCabecalho = false,
  children,
}: {
  meta: RelatorioMeta;
  /** Data e hora da geração, já formatadas (o servidor usa `formatarGeradoEm(new Date())`). */
  geradoEm: string;
  className?: string;
  /** A tela monta o próprio cabeçalho (filtros que mudam no navegador); o provider só limpa a página e entrega o contexto. */
  semCabecalho?: boolean;
  children: ReactNode;
}) {
  const [impresso, setImpresso] = useState(geradoEm);

  useEffect(() => {
    const atualizar = () => setImpresso(formatarGeradoEm(new Date()));
    window.addEventListener("beforeprint", atualizar);
    return () => window.removeEventListener("beforeprint", atualizar);
  }, []);

  const valor = useMemo<Contexto>(() => ({ meta, geradoAgora: () => formatarGeradoEm(new Date()) }), [meta]);

  return (
    <RelatorioContexto.Provider value={valor}>
      <style dangerouslySetInnerHTML={{ __html: CSS_IMPRESSAO_RELATORIO }} />
      <div data-relatorio="" className={className}>
        {semCabecalho ? null : <CabecalhoImpressao titulo={meta.titulo} cliente={meta.cliente} filtros={meta.filtros} unidades={meta.unidades} geradoEm={impresso} origemDados={meta.origemDados} />}
        {children}
      </div>
    </RelatorioContexto.Provider>
  );
}
