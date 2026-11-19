/**
 * Rede de lojas — cabeçalho padrão dos relatórios (COMANDO MESTRE §25): cliente, período e filtros, unidades
 * incluídas, data de geração e origem dos dados. Vale para a impressão (PDF) e para o CSV baixado.
 * Puro (sem banco, sem React): roda no navegador, no servidor e nos testes.
 */

type Celula = string | number | null;

export type RelatorioMeta = {
  /** Nome do relatório (ex.: "CMV semanal"). */
  titulo: string;
  /** Nome da empresa cliente. */
  cliente: string;
  /** Período e filtros aplicados, em texto corrido. */
  filtros: string;
  /** Unidades incluídas (ver `descreverUnidades`). */
  unidades: string;
  /** De onde vêm os números. */
  origemDados: string;
};

export const FUSO_RELATORIO = "America/Sao_Paulo";

/** "19/11/2026 13:42" no horário de Brasília, em qualquer máquina. */
export function formatarGeradoEm(d: Date): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_RELATORIO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? "";
  return `${p("day")}/${p("month")}/${p("year")} ${p("hour")}:${p("minute")}`;
}

const LIMITE_NOMES_UNIDADES = 12;

/**
 * Texto das unidades incluídas. Uma loja filtrada: o nome dela. Sem filtro: "Rede toda — N unidades: A, B, C";
 * para quem só enxerga parte da rede (`parcial`): "Lojas do seu acesso — …", para o relatório não parecer da rede inteira.
 * Acima de 12 nomes a lista é abreviada ("… e mais N").
 */
export function descreverUnidades(nomes: readonly string[], filtrada = false, parcial = false): string {
  const lista = nomes.map((n) => n.trim()).filter((n) => n !== "");
  if (lista.length === 0) return "Nenhuma unidade";
  if (filtrada && lista.length === 1) return lista[0];
  const prefixo = filtrada ? "Seleção" : parcial ? "Lojas do seu acesso" : "Rede toda";
  const qtd = `${lista.length} ${lista.length === 1 ? "unidade" : "unidades"}`;
  if (lista.length <= LIMITE_NOMES_UNIDADES) return `${prefixo} — ${qtd}: ${lista.join(", ")}`;
  return `${prefixo} — ${qtd}: ${lista.slice(0, LIMITE_NOMES_UNIDADES).join(", ")} e mais ${lista.length - LIMITE_NOMES_UNIDADES}`;
}

/** Unidades da tela: a loja filtrada ou as lojas ativas que a pessoa enxerga (loja inativa não entra). */
export function unidadesDaTela(lojas: readonly { nome: string; status?: string }[], lojaFiltro?: { nome: string } | null, parcial = false): string {
  if (lojaFiltro) return descreverUnidades([lojaFiltro.nome], true);
  return descreverUnidades(lojas.filter((l) => l.status !== "inativa").map((l) => l.nome), false, parcial);
}

/** Linhas que abrem o CSV: uma informação por linha, mais uma linha em branco antes da tabela. */
export function linhasCabecalhoCsv(meta: RelatorioMeta, geradoEm: string): Celula[][] {
  return [
    ["Relatório", meta.titulo],
    ["Cliente", meta.cliente],
    ["Período e filtros", meta.filtros],
    ["Unidades", meta.unidades],
    ["Gerado em", geradoEm],
    ["Origem dos dados", meta.origemDados],
    [""],
  ];
}

/** O CSV da tabela precedido do cabeçalho do relatório. Sem metadados, devolve a tabela como veio. */
export function comCabecalhoCsv(linhas: readonly (readonly Celula[])[], meta: RelatorioMeta | null | undefined, geradoEm: string): Celula[][] {
  const tabela = linhas.map((l) => [...l]);
  return meta ? [...linhasCabecalhoCsv(meta, geradoEm), ...tabela] : tabela;
}

/**
 * CSS de impressão dos relatórios da rede: some com o que não é relatório (menu lateral, barra de cima, rodapé,
 * botões flutuantes, navegação por abas e botões de ação), solta a rolagem interna para o texto correr por
 * várias páginas e mantém as cores dos semáforos. Só vale enquanto um relatório da rede está na tela.
 */
export const CSS_IMPRESSAO_RELATORIO = `
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  html, body { background: #fff !important; height: auto !important; }
  [data-slot="sidebar"], [data-slot="sidebar-trigger"], [data-app-header-premium], [data-mobile-bottom-nav],
  [data-brand-footer], .fixed, [data-print-oculto] { display: none !important; }
  [data-slot="sidebar-wrapper"], [data-slot="sidebar-inset"], main {
    display: block !important; height: auto !important; min-height: 0 !important; max-height: none !important;
    overflow: visible !important; margin: 0 !important; width: 100% !important; max-width: none !important; padding-left: 0 !important;
  }
  [data-relatorio] .overflow-x-auto, [data-relatorio] .overflow-auto, [data-relatorio] .overflow-y-auto { overflow: visible !important; }
  [data-relatorio] table { min-width: 0 !important; width: 100% !important; font-size: 10px; }
  [data-relatorio] tr, [data-relatorio] figure { break-inside: avoid; }
  [data-relatorio] * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;
