/**
 * Utilidades de texto do assistente — sem dependências, usadas tanto no
 * servidor quanto no navegador (e nos testes em Node).
 */

/**
 * Marcador que a IA escreve na última linha com perguntas de aprofundamento:
 *   [[sugestoes]] pergunta 1 | pergunta 2 | pergunta 3
 * A tela transforma isso em botões e nunca mostra o marcador.
 */
export const SUGGESTION_MARKER = "[[sugestoes]]";

/**
 * Marcador de falha no meio da resposta em streaming: o servidor escreve
 *   [[erro]] mensagem
 * no fim do fluxo se a IA cair depois de já ter começado a responder.
 */
export const ERROR_MARKER = "[[erro]]";

/** Se o texto recebido termina com o marcador de erro, separa a mensagem. */
export function splitErro(raw: string): { texto: string; erro: string | null } {
  const idx = raw.indexOf(ERROR_MARKER);
  if (idx === -1) return { texto: raw, erro: null };
  return {
    texto: raw.slice(0, idx).trimEnd(),
    erro: raw.slice(idx + ERROR_MARKER.length).trim() || "Falha ao gerar a resposta.",
  };
}

/** Tamanho do trecho final de `raw` que já parece o começo do marcador (streaming). */
function partialMarkerLength(raw: string): number {
  const max = Math.min(SUGGESTION_MARKER.length - 1, raw.length);
  for (let k = max; k >= 1; k--) {
    if (raw.endsWith(SUGGESTION_MARKER.slice(0, k))) return k;
  }
  return 0;
}

/**
 * Separa o texto da resposta das perguntas sugeridas. Funciona também com
 * texto incompleto (durante o streaming): o marcador, inteiro ou pela
 * metade, nunca aparece no corpo.
 */
export function splitSugestoes(raw: string): {
  corpo: string;
  sugestoes: string[];
} {
  const idx = raw.indexOf(SUGGESTION_MARKER);
  if (idx === -1) {
    const partial = partialMarkerLength(raw);
    const corpo = partial > 0 ? raw.slice(0, raw.length - partial) : raw;
    return { corpo: corpo.trimEnd(), sugestoes: [] };
  }

  const corpo = raw.slice(0, idx).trimEnd();
  const sugestoes = raw
    .slice(idx + SUGGESTION_MARKER.length)
    .replace(/\n+/g, " ")
    .split("|")
    .map((s) => s.replace(/^[\s\-•*"“]+|[\s"”]+$/g, "").trim())
    .filter((s) => s.length >= 4 && s.length <= 120)
    .slice(0, 3);

  return { corpo, sugestoes };
}

/** Texto limpo (sem o marcador) — é o que volta para a IA como histórico. */
export function textoSemSugestoes(raw: string): string {
  return splitSugestoes(raw).corpo;
}

/** Perguntas que aparecem antes da primeira mensagem, por segmento. */
export function sugestoesIniciais(segment: string | null | undefined): string[] {
  const comuns = [
    "Como está meu mês até agora?",
    "Monte um plano para bater a meta do mês",
    "O que preciso pagar e receber nos próximos dias?",
    "Onde estou gastando mais do que deveria?",
  ];
  if (segment === "oficina") {
    return [
      "Como está meu mês até agora?",
      "Monte um plano para bater a meta do mês",
      "Quais OS estão paradas e o que fazer com elas?",
      "Quais clientes devo reativar esta semana?",
      "Onde estou gastando mais do que deveria?",
      "O que preciso pagar e receber nos próximos dias?",
    ];
  }
  return [...comuns, "Quais clientes devo reativar esta semana?"];
}
