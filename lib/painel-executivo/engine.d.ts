import type { PainelDados } from "./build-data";

/** Monta as telas do Painel Executivo dentro de `root` e devolve a função de limpeza. */
export function mountPainel(
  root: HTMLElement,
  dados: PainelDados,
  chart: unknown,
): () => void;
