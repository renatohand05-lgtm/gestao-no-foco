/**
 * Rede de lojas — avaliação de gerentes: junta vendas, indicadores, qualidade, RH e a nota de liderança de cada
 * loja num mês e calcula o score (regras em talentos.ts). Puro: o carregador lê o banco e entrega as linhas aqui;
 * os testes exercitam a mesma função com dados fabricados.
 *
 * Nada é gravado já calculado: o score muda quando muda qualquer fonte. Critério sem dado fica de fora (o peso é
 * redistribuído) — a única nota lançada à mão é a de liderança.
 */
import { calcularPainelRede, listarMeses, mesDe, primeiroDiaDoMes, ultimoDiaDoMes } from "./calculo.ts";
import { resumirVisita, ultimaVisitaPorLoja } from "./qualidade.ts";
import { avaliarGerente, casaDoGerenteNoMes, gerenteDaLojaNoMes, quadrante, rankearGerentes, type AvaliacaoGerente } from "./talentos.ts";
import type { ColaboradorRh, ConfigRede, IndicadorMes, LiderancaRh, Loja, MetaFaturamento, MetaRow, NineBoxRh, VendaDia, VisitaQualidade } from "./tipos.ts";

/** Quantos meses o gráfico de evolução mostra (o mês avaliado e os 5 anteriores). */
export const MESES_NA_EVOLUCAO = 6;
/** Quantos meses o seletor oferece (o mês atual e os 11 anteriores). */
export const MESES_NO_SELETOR = 12;

/** Fontes que o perfil enxerga. Fonte invisível some do cálculo (critério ausente), em vez de virar nota. */
export type FontesGerentes = { vendas: boolean; metas: boolean; qualidade: boolean };

export type EntradaGerentes = {
  /** Lojas que a tela mostra (sem as inativas). */
  lojas: readonly Loja[];
  config: ConfigRede;
  metas: readonly MetaRow[];
  metasFat: readonly MetaFaturamento[];
  /** Indicadores do mês já mesclados (calculados têm prioridade sobre os lançados à mão). */
  indicadores: readonly IndicadorMes[];
  vendas: readonly VendaDia[];
  visitas: readonly VisitaQualidade[];
  colaboradores: readonly ColaboradorRh[];
  lideranca: readonly LiderancaRh[];
  ninebox: readonly NineBoxRh[];
  hoje: string;
  fontes: FontesGerentes;
};

export type SituacaoGerente = "avaliada" | "inauguracao" | "sem_gerente";

export type LinhaGerente = AvaliacaoGerente & {
  loja: Loja;
  situacao: SituacaoGerente;
  posicao: number | null;
  /** Nota de liderança lançada no mês (para editar ou excluir). */
  registroLideranca: { id: string; observacoes: string | null; origem: "manual" | "exemplo" } | null;
  /** Tempo de casa do gerente no mês avaliado, em meses completos. */
  casaMeses: number | null;
  /** Nome do quadrante do gerente no Nine Box (null = ainda sem avaliação). */
  quadranteNineBox: string | null;
};

/** O mês atual e os anteriores, do mais recente ao mais antigo. */
export function mesesDoSeletor(hoje: string, quantidade = MESES_NO_SELETOR): string[] {
  const fim = mesDe(hoje);
  const [a, m] = fim.split("-").map(Number);
  const ini = new Date(Date.UTC(a, m - 1 - (quantidade - 1), 1)).toISOString().slice(0, 7);
  return listarMeses(`${ini}-01`, `${fim}-01`).reverse();
}

/** Os `quantidade` meses que terminam em `mes`, do mais antigo ao mais recente. */
export function mesesDaEvolucao(mes: string, quantidade = MESES_NA_EVOLUCAO): string[] {
  const [a, m] = mes.split("-").map(Number);
  const ini = new Date(Date.UTC(a, m - 1 - (quantidade - 1), 1)).toISOString().slice(0, 7);
  return listarMeses(`${ini}-01`, `${mes}-01`);
}

/** Valor lançado (ou calculado) de um indicador da loja no mês; null se não existe. */
const valorDoIndicador = (indicadores: readonly IndicadorMes[], lojaId: string, mes: string, k: "turnover" | "absent"): number | null => {
  const alvo = primeiroDiaDoMes(mes);
  const x = indicadores.find((i) => i.lojaId === lojaId && i.mes === alvo && i.indicador === k);
  return x && Number.isFinite(x.valor) ? x.valor : null;
};

/** Avaliação de todas as lojas num mês, já ordenada pelo ranking (sem score por último). */
export function avaliarGerentesDoMes(e: EntradaGerentes, mes: string): LinhaGerente[] {
  const f = e.fontes;
  const painel = calcularPainelRede({
    lojas: e.lojas,
    config: e.config,
    metas: f.metas ? e.metas : [],
    metasFat: f.metas ? e.metasFat : [],
    indicadores: f.metas ? e.indicadores : [],
    vendas: f.vendas ? e.vendas : [],
    de: primeiroDiaDoMes(mes),
    ate: ultimoDiaDoMes(mes),
    mesRef: mes,
    hoje: e.hoje,
  });
  const porLoja = new Map(painel.porLoja.map((p) => [p.loja.id, p] as const));
  const visitasAteOMes = f.qualidade ? ultimaVisitaPorLoja(e.visitas.filter((v) => v.data <= ultimoDiaDoMes(mes))) : new Map<string, VisitaQualidade>();
  const inicioMes = primeiroDiaDoMes(mes);

  const linhas = e.lojas.map((loja): LinhaGerente => {
    const notasDoMes = e.lideranca.filter((l) => l.lojaId === loja.id && l.mes === inicioMes);
    const gerente = gerenteDaLojaNoMes(e.colaboradores, loja.id, mes, new Set(notasDoMes.map((l) => l.colaboradorId)));
    const registro = gerente ? (notasDoMes.find((l) => l.colaboradorId === gerente.id) ?? null) : null;
    const nb = gerente ? e.ninebox.find((n) => n.colaboradorId === gerente.id) : undefined;
    const p = porLoja.get(loja.id);
    const visita = visitasAteOMes.get(loja.id);
    const base = {
      lojaId: loja.id,
      gerente,
      pctMeta: p?.mes.pctMeta ?? null,
      indOk: p?.ok ?? 0,
      indAvaliados: p?.avaliados ?? 0,
      qualidade: visita ? resumirVisita(visita.respostas).nota : null,
      qualidadeData: visita?.data ?? null,
      turnover: f.metas ? valorDoIndicador(e.indicadores, loja.id, mes, "turnover") : null,
      absenteismo: f.metas ? valorDoIndicador(e.indicadores, loja.id, mes, "absent") : null,
      lideranca: registro?.nota ?? null,
      potencial: nb?.potencial ?? null,
    };
    const av = avaliarGerente(base);
    const emInauguracao = loja.status === "inauguracao" || p == null;
    // Loja que ainda não opera, ou mês sem gerente no cargo: não há o que avaliar (nada de nota por omissão).
    const situacao: SituacaoGerente = !gerente ? "sem_gerente" : emInauguracao ? "inauguracao" : "avaliada";
    const semAvaliacao = situacao !== "avaliada";
    return {
      ...av,
      score: semAvaliacao ? null : av.score,
      rec: semAvaliacao ? null : av.rec,
      loja,
      situacao,
      posicao: null,
      registroLideranca: registro ? { id: registro.id, observacoes: registro.observacoes, origem: registro.origem } : null,
      casaMeses: gerente ? casaDoGerenteNoMes(gerente, mes, e.hoje) : null,
      quadranteNineBox: nb ? quadrante(nb.desempenho, nb.potencial).nome : null,
    };
  });

  const nomeLoja = (id: string) => e.lojas.find((l) => l.id === id)?.nome ?? "";
  return rankearGerentes(linhas, nomeLoja);
}

export type PontoEvolucao = { mes: string; scores: { lojaId: string; score: number | null }[]; media: number | null };

/** Score de cada loja em cada mês da evolução; a média ignora quem não tem score (nunca conta zero). */
export function evolucaoDosGerentes(e: EntradaGerentes, meses: readonly string[]): PontoEvolucao[] {
  return meses.map((mes) => {
    const linhas = avaliarGerentesDoMes(e, mes);
    const scores = linhas.map((l) => ({ lojaId: l.lojaId, score: l.score }));
    const com = scores.filter((s): s is { lojaId: string; score: number } => s.score != null);
    return { mes, scores, media: com.length > 0 ? com.reduce((a, s) => a + s.score, 0) / com.length : null };
  });
}

export type ResumoGerentes = {
  avaliados: number;
  semScore: number;
  scoreMedio: number | null;
  prontosParaPromocao: number;
  emMelhoria: number;
};

export function resumirGerentes(linhas: readonly LinhaGerente[]): ResumoGerentes {
  const com = linhas.filter((l) => l.score != null);
  return {
    avaliados: com.length,
    semScore: linhas.filter((l) => l.situacao === "avaliada" && l.score == null).length,
    scoreMedio: com.length > 0 ? com.reduce((a, l) => a + (l.score as number), 0) / com.length : null,
    prontosParaPromocao: com.filter((l) => l.rec?.rotulo === "Pronto para promoção").length,
    emMelhoria: com.filter((l) => l.rec?.rotulo === "Plano de melhoria").length,
  };
}
