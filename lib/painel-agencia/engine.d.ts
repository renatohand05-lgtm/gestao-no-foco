import type { PainelAgenciaDados } from "./build-data";

/** Monta as telas do Painel Executivo (agência) dentro de `root` e devolve a função de limpeza. */
export function mountPainelAgencia(
  root: HTMLElement,
  dados: PainelAgenciaDados,
  chart: unknown,
): () => void;
