"use client";

import { createContext, useContext } from "react";

/**
 * Liga o catálogo de carros (marca → modelo → versão → ano) nos cadastros de
 * veículo. O layout do tenant decide: só oficina (`automotiveWorkflow`) ativa.
 * Fora do provider o valor é `false`, e os formulários ficam como sempre foram.
 */
const VeiculoCatalogoContext = createContext(false);

export function VeiculoCatalogoProvider({
  ativo,
  children,
}: {
  ativo: boolean;
  children: React.ReactNode;
}) {
  return <VeiculoCatalogoContext value={ativo}>{children}</VeiculoCatalogoContext>;
}

export function useVeiculoCatalogoAtivo(): boolean {
  return useContext(VeiculoCatalogoContext);
}
