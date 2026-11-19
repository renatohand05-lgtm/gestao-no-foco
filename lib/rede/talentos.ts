/**
 * Rede de lojas — talentos: avaliação de gerentes, Nine Box e sucessão/carreira.
 * Puro (sem banco, sem React): os testes importam daqui e conferem contra o painel original (HTML).
 *
 * Nada que se calcula é gravado: o score do gerente, o quadrante, a contagem por quadrante, a prontidão e o mapa de
 * sucessão saem das notas e dos outros módulos (vendas, indicadores, qualidade, RH), para nunca ficarem
 * fora de sincronia. Indicador ausente NÃO ganha nota inventada: o peso dele é redistribuído entre os que existem.
 */
import { primeiroDiaDoMes, ultimoDiaDoMes } from "./calculo.ts";
import { CARGOS_RH, mesesDeCasa, rotuloCargo, textoTempoDeCasa } from "./rh.ts";
import type { CargoCarreira, CargoRh, ColaboradorRh, CriterioCargo, NineBoxRh, NivelNineBox } from "./tipos.ts";

/* ------------------------------------------------------------------ Nine Box (textos do painel original) */

export const NIVEIS_NINE_BOX: readonly { k: NivelNineBox; nome: string }[] = [
  { k: 1, nome: "Baixo" },
  { k: 2, nome: "Médio" },
  { k: 3, nome: "Alto" },
];
export const rotuloNivel = (n: number | null | undefined): string => NIVEIS_NINE_BOX.find((x) => x.k === n)?.nome ?? "";

export type QuadranteNineBox = { nome: string; orientacao: string; cor: string };

const NB: Record<string, QuadranteNineBox> = {
  "3-3": { nome: "Talento", orientacao: "Promover ou preparar para o próximo cargo; dar projetos desafiadores.", cor: "#3fc58e" },
  "2-3": { nome: "Alto potencial", orientacao: "Acelerar desenvolvimento com mentoria e PDI.", cor: "#7bd3a9" },
  "1-3": { nome: "Enigma", orientacao: "Entender a causa do baixo desempenho; ajustar função ou treinamento.", cor: "#f2b33d" },
  "3-2": { nome: "Forte desempenho", orientacao: "Reconhecer e ampliar responsabilidades.", cor: "#7bd3a9" },
  "2-2": { nome: "Mantenedor", orientacao: "Manter engajado e treinar para evoluir.", cor: "#eedbca" },
  "1-2": { nome: "Questionável", orientacao: "PDI com metas claras e acompanhamento mensal.", cor: "#f2b33d" },
  "3-1": { nome: "Especialista", orientacao: "Valorizar como referência técnica no cargo atual.", cor: "#eedbca" },
  "2-1": { nome: "Eficaz", orientacao: "Manter e acompanhar.", cor: "#b9aa9e" },
  "1-1": { nome: "Insuficiente", orientacao: "Plano de melhoria com prazo; avaliar permanência.", cor: "#e5303f" },
};

/** Ordem da legenda "o que fazer em cada quadrante" no painel original (chave = desempenho-potencial). */
export const ORDEM_LEGENDA_NINE_BOX: readonly string[] = ["3-3", "2-3", "3-2", "2-2", "1-3", "3-1", "1-2", "2-1", "1-1"];

export const chaveQuadrante = (desempenho: number, potencial: number): string => `${desempenho}-${potencial}`;
export const quadrante = (desempenho: number, potencial: number): QuadranteNineBox => NB[chaveQuadrante(desempenho, potencial)] ?? { nome: "—", orientacao: "", cor: "#b9aa9e" };

export type PessoaNineBox = { colaborador: ColaboradorRh; avaliacao: NineBoxRh | null };

const ordemCargo = (c: CargoRh): number => CARGOS_RH.findIndex((x) => x.k === c);

/**
 * Ativos das lojas (e do cargo, se pedido) com a avaliação de cada um, quando existe. Quem ainda não foi
 * avaliado aparece SEM nota (nunca com "médio" por padrão). Ordem do painel original: cargo, loja, nome.
 */
export function juntarNineBox(
  colaboradores: readonly ColaboradorRh[],
  avaliacoes: readonly NineBoxRh[],
  filtro: { lojaIds: readonly string[]; cargo?: CargoRh | null },
  nomeLoja: (id: string) => string,
): PessoaNineBox[] {
  const lojas = new Set(filtro.lojaIds);
  const porColab = new Map(avaliacoes.map((a) => [a.colaboradorId, a] as const));
  return colaboradores
    .filter((c) => c.status === "ativo" && lojas.has(c.lojaId) && (!filtro.cargo || c.cargo === filtro.cargo))
    .map((c) => ({ colaborador: c, avaliacao: porColab.get(c.id) ?? null }))
    .sort(
      (a, b) =>
        ordemCargo(a.colaborador.cargo) - ordemCargo(b.colaborador.cargo) ||
        nomeLoja(a.colaborador.lojaId).localeCompare(nomeLoja(b.colaborador.lojaId), "pt-BR") ||
        a.colaborador.nome.localeCompare(b.colaborador.nome, "pt-BR"),
    );
}

export type CelulaNineBox = { desempenho: NivelNineBox; potencial: NivelNineBox; chave: string; quadrante: QuadranteNineBox; pessoas: PessoaNineBox[] };
export type MatrizNineBox = { celulas: CelulaNineBox[]; avaliados: number; pendentes: number };

/** 9 células na ordem em que o painel as desenha: potencial de cima (alto) para baixo, desempenho da esquerda (baixo) para a direita. */
export function matrizNineBox(pessoas: readonly PessoaNineBox[]): MatrizNineBox {
  const celulas: CelulaNineBox[] = [];
  for (const p of [3, 2, 1] as const) {
    for (const d of [1, 2, 3] as const) {
      celulas.push({
        desempenho: d,
        potencial: p,
        chave: chaveQuadrante(d, p),
        quadrante: quadrante(d, p),
        pessoas: pessoas.filter((x) => x.avaliacao?.desempenho === d && x.avaliacao?.potencial === p),
      });
    }
  }
  const avaliados = pessoas.filter((x) => x.avaliacao != null).length;
  return { celulas, avaliados, pendentes: pessoas.length - avaliados };
}

/** "Talentos no nine box": alto desempenho e alto potencial. */
export const contarTalentos = (pessoas: readonly PessoaNineBox[]): number => pessoas.filter((x) => x.avaliacao?.desempenho === 3 && x.avaliacao?.potencial === 3).length;

/* ------------------------------------------------------------------ trilhas, critérios e prontidão (painel original) */

export const rotuloCargoCarreira = (c: CargoCarreira): string => (c === "supervisor_regional" ? "Supervisor Regional" : rotuloCargo(c));

export const TRILHAS: readonly { nome: string; cargos: readonly CargoCarreira[] }[] = [
  { nome: "Trilha de cozinha", cargos: ["auxiliar_cozinha", "chefe_cozinha", "gerente_loja", "supervisor_regional"] },
  { nome: "Trilha de salão e delivery", cargos: ["atendente", "lider_delivery", "gerente_loja", "supervisor_regional"] },
];

export const CRITERIOS_PADRAO: Record<CargoCarreira, { min: number | null; texto: string }> = {
  auxiliar_cozinha: { min: 12, texto: "12 meses no cargo, domínio das fichas técnicas e boas práticas, treinamento de liderança de praça." },
  atendente: { min: 6, texto: "6 meses no cargo, conhecimento das plataformas e da expedição, treinamento de conferência e embalagem." },
  chefe_cozinha: { min: 12, texto: "12 meses no cargo, CMV e rupturas na meta, treinamento de gestão (DRE, escalas e estoque)." },
  lider_delivery: { min: 12, texto: "12 meses no cargo, preparo, cancelamentos e nota iFood na meta, treinamento de gestão." },
  gerente_loja: { min: 18, texto: '18 meses no cargo, loja acima de R$ 500 mil, indicadores na meta e nine box "Talento".' },
  supervisor_regional: { min: null, texto: "Cargo previsto na estrutura de 10 lojas (2 supervisores, 5 lojas cada)." },
};

export const CARGOS_CARREIRA: readonly CargoCarreira[] = [...CARGOS_RH.map((c) => c.k), "supervisor_regional"];

/** Critério vigente do cargo: o ajuste do consultor, se houver; senão o padrão do painel original. */
export function criterioDoCargo(cargo: CargoCarreira, ajustes: readonly CriterioCargo[]): { cargo: CargoCarreira; min: number | null; texto: string; ajustado: boolean } {
  const a = ajustes.find((x) => x.cargo === cargo);
  if (a) return { cargo, min: a.tempoMinimoMeses, texto: a.criterio, ajustado: true };
  const p = CRITERIOS_PADRAO[cargo];
  return { cargo, min: p.min, texto: p.texto, ajustado: false };
}

/**
 * Tempo mínimo "no cargo": o cadastro só guarda a admissão, então conta o tempo de casa (como no painel original).
 */
export const tempoMinimoAtendido = (p: ColaboradorRh, min: number | null, hoje: string): boolean | null => (min == null ? null : mesesDeCasa(p.dataAdmissao, hoje) >= min);

/**
 * Prontos para subir (critério inicial): potencial alto + desempenho médio ou alto + tempo mínimo atendido.
 * `pessoas` já vem filtrado pelas lojas da tela. Cargo sem tempo mínimo (supervisor) não tem "prontos".
 */
export function prontosParaSubir(cargo: CargoCarreira, pessoas: readonly PessoaNineBox[], ajustes: readonly CriterioCargo[], hoje: string): PessoaNineBox[] {
  const c = criterioDoCargo(cargo, ajustes);
  if (c.min == null) return [];
  return pessoas.filter((x) => x.colaborador.cargo === cargo && x.avaliacao != null && x.avaliacao.potencial === 3 && x.avaliacao.desempenho >= 2 && mesesDeCasa(x.colaborador.dataAdmissao, hoje) >= (c.min ?? 0));
}

export type TomProntidao = "ok" | "warn" | "neu";
export type Prontidao = { rotulo: "Pronto agora" | "6 a 12 meses" | "12 a 24 meses"; tom: TomProntidao };

/** Prontidão para promoção, pelas duas notas do Nine Box (null = ainda não é candidato). */
export function prontidao(desempenho: number, potencial: number): Prontidao | null {
  if (desempenho === 3 && potencial === 3) return { rotulo: "Pronto agora", tom: "ok" };
  if (potencial === 3) return { rotulo: "6 a 12 meses", tom: "warn" };
  if (potencial === 2 && desempenho === 3) return { rotulo: "12 a 24 meses", tom: "neu" };
  return null;
}

/** Cargos-chave do mapa de sucessão e de quais cargos vêm os sucessores. */
export const CARGOS_CHAVE_SUCESSAO: readonly { cargo: CargoRh; alimentam: readonly CargoRh[] }[] = [
  { cargo: "gerente_loja", alimentam: ["chefe_cozinha", "lider_delivery"] },
  { cargo: "chefe_cozinha", alimentam: ["auxiliar_cozinha"] },
  { cargo: "lider_delivery", alimentam: ["atendente"] },
];

export type CandidatoSucessao = { pessoa: PessoaNineBox; prontidao: Prontidao; tempoMinimo: boolean | null };
export type RiscoSucessao = { rotulo: "Sem sucessor" | "Baixo" | "Médio"; tom: "bad" | "ok" | "warn" };
export type LinhaSucessao = {
  lojaId: string;
  cargo: CargoRh;
  titulares: PessoaNineBox[];
  candidatos: CandidatoSucessao[];
  risco: RiscoSucessao;
};

const pontosNineBox = (a: NineBoxRh): number => a.potencial * 3 + a.desempenho;

/**
 * Mapa de sucessão por loja e cargo-chave: sucessor indicado automaticamente pelo Nine Box (maior potencial, depois
 * maior desempenho; empate: mais tempo de casa, depois nome). Só entra quem está ativo e foi avaliado.
 */
export function mapaSucessao(lojaIds: readonly string[], pessoas: readonly PessoaNineBox[], ajustes: readonly CriterioCargo[], hoje: string): LinhaSucessao[] {
  const linhas: LinhaSucessao[] = [];
  for (const lojaId of lojaIds) {
    for (const k of CARGOS_CHAVE_SUCESSAO) {
      const daLoja = pessoas.filter((x) => x.colaborador.lojaId === lojaId);
      const titulares = daLoja
        .filter((x) => x.colaborador.cargo === k.cargo)
        .sort((a, b) => a.colaborador.dataAdmissao.localeCompare(b.colaborador.dataAdmissao) || a.colaborador.nome.localeCompare(b.colaborador.nome, "pt-BR"));
      const candidatos: CandidatoSucessao[] = [];
      for (const x of daLoja) {
        if (!k.alimentam.includes(x.colaborador.cargo) || !x.avaliacao) continue;
        const pr = prontidao(x.avaliacao.desempenho, x.avaliacao.potencial);
        if (pr) candidatos.push({ pessoa: x, prontidao: pr, tempoMinimo: tempoMinimoAtendido(x.colaborador, criterioDoCargo(x.colaborador.cargo, ajustes).min, hoje) });
      }
      candidatos.sort(
        (a, b) =>
          pontosNineBox(b.pessoa.avaliacao as NineBoxRh) - pontosNineBox(a.pessoa.avaliacao as NineBoxRh) ||
          a.pessoa.colaborador.dataAdmissao.localeCompare(b.pessoa.colaborador.dataAdmissao) ||
          a.pessoa.colaborador.nome.localeCompare(b.pessoa.colaborador.nome, "pt-BR"),
      );
      const melhor = candidatos[0];
      const risco: RiscoSucessao = !melhor ? { rotulo: "Sem sucessor", tom: "bad" } : melhor.prontidao.rotulo === "Pronto agora" ? { rotulo: "Baixo", tom: "ok" } : { rotulo: "Médio", tom: "warn" };
      linhas.push({ lojaId, cargo: k.cargo, titulares, candidatos, risco });
    }
  }
  return linhas;
}

/* ------------------------------------------------------------------ avaliação de gerentes */

export type CriterioGerente = "vendas" | "indicadores" | "qualidade" | "pessoas" | "lideranca";

/** Pesos do painel original (somam 100). */
export const PESOS_GERENTE: readonly { k: CriterioGerente; nome: string; peso: number }[] = [
  { k: "vendas", nome: "Vendas x meta", peso: 30 },
  { k: "indicadores", nome: "Indicadores na meta", peso: 25 },
  { k: "qualidade", nome: "Nota da visita de qualidade", peso: 15 },
  { k: "pessoas", nome: "Pessoas (turnover e absenteísmo)", peso: 15 },
  { k: "lideranca", nome: "Liderança", peso: 15 },
];

/** Turnover (%) e absenteísmo (%) que dão nota 100 e nota 0: linear entre os dois (painel original). */
export const FAIXA_NOTA_TURNOVER = [3, 10] as const;
export const FAIXA_NOTA_ABSENTEISMO = [2, 6] as const;
/** Abaixo desta soma de pesos presentes o score não é calculado: seria a nota de um ou dois critérios vendida como nota do gerente. */
export const PESO_MINIMO_SCORE = 50;
export const LIDERANCA_MAXIMA = 5;

const limitar = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
/** 100 em `bom` ou melhor, 0 em `ruim` ou pior, linear entre os dois. */
export const notaLinear = (x: number, bom: number, ruim: number): number => limitar(((ruim - x) / (ruim - bom)) * 100, 0, 100);

export type ComponentesGerente = Record<CriterioGerente, number | null>;

export type EntradaGerente = {
  lojaId: string;
  gerente: ColaboradorRh | null;
  /** % da meta de faturamento do mês (até o último dia lançado). */
  pctMeta: number | null;
  /** Indicadores dentro da meta e indicadores com meta E valor lançado, no mês. */
  indOk: number;
  indAvaliados: number;
  /** Nota (0–100) da última visita de qualidade até o fim do mês e a data dela. */
  qualidade: number | null;
  qualidadeData: string | null;
  turnover: number | null;
  absenteismo: number | null;
  /** Nota de liderança (0–5) do gerente no mês. */
  lideranca: number | null;
  /** Potencial do gerente no Nine Box (só usado na recomendação). */
  potencial: NivelNineBox | null;
};

/** Cada componente de 0 a 100, ou null quando não há dado (nunca zero ou média no lugar). */
export function componentesGerente(e: Pick<EntradaGerente, "pctMeta" | "indOk" | "indAvaliados" | "qualidade" | "turnover" | "absenteismo" | "lideranca">): ComponentesGerente {
  const notasPessoas: number[] = [];
  if (e.turnover != null) notasPessoas.push(notaLinear(e.turnover, FAIXA_NOTA_TURNOVER[0], FAIXA_NOTA_TURNOVER[1]));
  if (e.absenteismo != null) notasPessoas.push(notaLinear(e.absenteismo, FAIXA_NOTA_ABSENTEISMO[0], FAIXA_NOTA_ABSENTEISMO[1]));
  return {
    vendas: e.pctMeta != null && Number.isFinite(e.pctMeta) ? Math.min(100, Math.max(0, e.pctMeta)) : null,
    indicadores: e.indAvaliados > 0 ? (e.indOk / e.indAvaliados) * 100 : null,
    qualidade: e.qualidade != null && Number.isFinite(e.qualidade) ? limitar(e.qualidade, 0, 100) : null,
    pessoas: notasPessoas.length > 0 ? notasPessoas.reduce((a, b) => a + b, 0) / notasPessoas.length : null,
    lideranca: e.lideranca != null && Number.isFinite(e.lideranca) ? limitar((e.lideranca / LIDERANCA_MAXIMA) * 100, 0, 100) : null,
  };
}

export type ResultadoScore = {
  /** 0–100; null quando os critérios presentes pesam menos que PESO_MINIMO_SCORE. */
  score: number | null;
  /** Soma dos pesos dos critérios presentes (de 100). */
  pesoUsado: number;
  criterios: number;
  ausentes: CriterioGerente[];
};

/** Média ponderada só dos critérios presentes: o peso do que falta é redistribuído proporcionalmente (regra do painel original). */
export function scoreGerente(c: ComponentesGerente): ResultadoScore {
  let peso = 0;
  let soma = 0;
  let criterios = 0;
  const ausentes: CriterioGerente[] = [];
  for (const w of PESOS_GERENTE) {
    const v = c[w.k];
    if (v == null) {
      ausentes.push(w.k);
      continue;
    }
    peso += w.peso;
    soma += w.peso * v;
    criterios++;
  }
  return { score: peso >= PESO_MINIMO_SCORE ? soma / peso : null, pesoUsado: peso, criterios, ausentes };
}

export type TomRecomendacao = "ok" | "neu" | "warn" | "bad";
export type RecomendacaoGerente = { rotulo: string; tom: TomRecomendacao; texto: string };

/** Recomendação do painel original. "Pronto para promoção" exige potencial alto avaliado no Nine Box. */
export function recomendacaoGerente(score: number, potencial: number | null): RecomendacaoGerente {
  if (score >= 85 && potencial === 3) return { rotulo: "Pronto para promoção", tom: "ok", texto: "Candidato a Supervisor Regional na estrutura de 10 lojas." };
  if (score >= 70) return { rotulo: "Desenvolver (PDI)", tom: "neu", texto: "Manter no cargo com plano de desenvolvimento individual." };
  if (score >= 55) return { rotulo: "Acompanhar de perto", tom: "warn", texto: "Plano de ação mensal nos indicadores fora da meta." };
  return { rotulo: "Plano de melhoria", tom: "bad", texto: "Metas claras com prazo de 90 dias e acompanhamento semanal." };
}

export type FaixaScore = "otimo" | "bom" | "atencao" | "critico";
export const faixaDoScore = (score: number): FaixaScore => (score >= 85 ? "otimo" : score >= 70 ? "bom" : score >= 55 ? "atencao" : "critico");

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "78" — sem casas, como no painel original; com uma casa (truncada) só quando o arredondamento cruzaria uma faixa (84,7 não vira "85"). */
export function formatarScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return "—";
  const r = Math.round(score);
  const enganaria = [85, 70, 55].some((limite) => r >= limite && score < limite);
  return enganaria ? nf1.format(Math.floor(score * 10 + 1e-9) / 10) : nf0.format(score);
}

export type AvaliacaoGerente = EntradaGerente & {
  comp: ComponentesGerente;
  score: number | null;
  pesoUsado: number;
  criterios: number;
  ausentes: CriterioGerente[];
  rec: RecomendacaoGerente | null;
};

export function avaliarGerente(e: EntradaGerente): AvaliacaoGerente {
  const comp = componentesGerente(e);
  const r = scoreGerente(comp);
  return { ...e, comp, score: r.score, pesoUsado: r.pesoUsado, criterios: r.criterios, ausentes: r.ausentes, rec: r.score == null ? null : recomendacaoGerente(r.score, e.potencial) };
}

/** Maior score primeiro; sem score por último; empate pela loja. */
export function rankearGerentes<T extends { score: number | null; lojaId: string }>(itens: readonly T[], nomeLoja: (id: string) => string): (T & { posicao: number | null })[] {
  const ord = [...itens].sort((a, b) => (b.score ?? Number.NEGATIVE_INFINITY) - (a.score ?? Number.NEGATIVE_INFINITY) || nomeLoja(a.lojaId).localeCompare(nomeLoja(b.lojaId), "pt-BR"));
  let pos = 0;
  return ord.map((x) => ({ ...x, posicao: x.score == null ? null : ++pos }));
}

/**
 * Gerente da loja no mês: quem ocupava o cargo de gerente de loja (admitido até o fim do mês e, se saiu, depois
 * do começo dele). Se mais de um, prefere quem tem nota de liderança no mês; depois o admitido por último.
 */
export function gerenteDaLojaNoMes(colaboradores: readonly ColaboradorRh[], lojaId: string, mes: string, comNota: ReadonlySet<string> = new Set()): ColaboradorRh | null {
  const ini = primeiroDiaDoMes(mes);
  const fim = ultimoDiaDoMes(mes);
  const candidatos = colaboradores.filter((c) => c.lojaId === lojaId && c.cargo === "gerente_loja" && c.dataAdmissao <= fim && (c.dataDesligamento == null || c.dataDesligamento >= ini));
  candidatos.sort((a, b) => Number(comNota.has(b.id)) - Number(comNota.has(a.id)) || b.dataAdmissao.localeCompare(a.dataAdmissao) || a.nome.localeCompare(b.nome, "pt-BR"));
  return candidatos[0] ?? null;
}

/** Lê a nota digitada ("4,5" ou "4.5"); vazio ou texto que não é número = null (nunca zero). */
export function lerNotaLideranca(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (t === "" || !/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Tempo de casa do gerente no mês avaliado (até hoje, se o mês ainda não acabou). */
export function casaDoGerenteNoMes(gerente: ColaboradorRh, mes: string, hoje: string): number {
  const ref = ultimoDiaDoMes(mes) < hoje ? ultimoDiaDoMes(mes) : hoje;
  return mesesDeCasa(gerente.dataAdmissao, ref < gerente.dataAdmissao ? gerente.dataAdmissao : ref);
}

/* ------------------------------------------------------------------ histórico de alterações do Nine Box */

export type NotasNineBox = { desempenho: number; potencial: number };
export type ItemHistoricoNineBox = {
  id: string;
  quando: string;
  acao: "insert" | "update" | "delete";
  usuario: string;
  colaboradorId: string | null;
  antes: NotasNineBox | null;
  depois: NotasNineBox | null;
};

/** "Desempenho Médio → Alto · Potencial Alto (sem mudança)" em português simples. */
export function descreverMudancaNineBox(h: Pick<ItemHistoricoNineBox, "acao" | "antes" | "depois">): string {
  const par = (n: NotasNineBox) => `desempenho ${rotuloNivel(n.desempenho).toLowerCase()}, potencial ${rotuloNivel(n.potencial).toLowerCase()}`;
  if (h.acao === "insert" && h.depois) return `Avaliou: ${par(h.depois)} (${quadrante(h.depois.desempenho, h.depois.potencial).nome})`;
  if (h.acao === "delete" && h.antes) return `Removeu a avaliação (era ${par(h.antes)})`;
  if (h.antes && h.depois) {
    const partes: string[] = [];
    if (h.antes.desempenho !== h.depois.desempenho) partes.push(`Desempenho ${rotuloNivel(h.antes.desempenho)} → ${rotuloNivel(h.depois.desempenho)}`);
    if (h.antes.potencial !== h.depois.potencial) partes.push(`Potencial ${rotuloNivel(h.antes.potencial)} → ${rotuloNivel(h.depois.potencial)}`);
    const q0 = quadrante(h.antes.desempenho, h.antes.potencial).nome;
    const q1 = quadrante(h.depois.desempenho, h.depois.potencial).nome;
    return partes.length ? `${partes.join(" · ")} (${q0} → ${q1})` : "Observação alterada";
  }
  return "Alteração";
}

/** Lê notas de um instantâneo (jsonb do histórico); null se vierem inválidas. */
export function lerNotasNineBox(bruto: unknown): NotasNineBox | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  const d = Number(o.desempenho);
  const p = Number(o.potencial);
  return [1, 2, 3].includes(d) && [1, 2, 3].includes(p) ? { desempenho: d, potencial: p } : null;
}

/* ------------------------------------------------------------------ exportação (CSV) */

type Celula = string | number | null;
const ddmmaaaa = (iso: string | null): string => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

/** Mesmas colunas do painel original; quem ainda não foi avaliado sai com desempenho e potencial em branco. */
export function linhasCsvNineBox(pessoas: readonly PessoaNineBox[], nomeLoja: (id: string) => string): Celula[][] {
  return [
    ["Nome", "Cargo", "Loja", "Admissão", "Desempenho", "Potencial", "Quadrante"],
    ...pessoas.map((x) => [
      x.colaborador.nome,
      rotuloCargo(x.colaborador.cargo),
      nomeLoja(x.colaborador.lojaId),
      ddmmaaaa(x.colaborador.dataAdmissao),
      rotuloNivel(x.avaliacao?.desempenho),
      rotuloNivel(x.avaliacao?.potencial),
      x.avaliacao ? quadrante(x.avaliacao.desempenho, x.avaliacao.potencial).nome : "Sem avaliação",
    ]),
  ];
}

const dec1 = (v: number | null): Celula => (v == null ? "" : Math.round(v * 10) / 10);

export function linhasCsvGerentes(avs: readonly (AvaliacaoGerente & { posicao: number | null })[], nomeLoja: (id: string) => string, mesRotulo: string): Celula[][] {
  return [
    ["Mês", "Posição", "Gerente", "Loja", "Vendas x meta (%)", "Indicadores na meta (%)", "Qualidade (%)", "Pessoas (%)", "Liderança (0 a 5)", "Score", "Critérios considerados", "Nine box", "Recomendação"],
    ...avs.map((a) => [
      mesRotulo,
      a.posicao ?? "",
      a.gerente?.nome ?? "Sem gerente cadastrado",
      nomeLoja(a.lojaId),
      dec1(a.comp.vendas),
      dec1(a.comp.indicadores),
      dec1(a.comp.qualidade),
      dec1(a.comp.pessoas),
      a.lideranca ?? "",
      dec1(a.score),
      `${a.criterios} de ${PESOS_GERENTE.length}`,
      a.potencial != null ? "avaliado" : "sem avaliação",
      a.rec?.rotulo ?? "Dados insuficientes",
    ]),
  ];
}

export function linhasCsvSucessao(linhas: readonly LinhaSucessao[], nomeLoja: (id: string) => string): Celula[][] {
  return [
    ["Loja", "Cargo-chave", "Titular", "Nine box do titular", "Sucessor indicado", "Cargo do sucessor", "Prontidão", "Tempo mínimo atendido", "Outros candidatos", "Risco"],
    ...linhas.map((l) => {
      const t = l.titulares[0];
      const c = l.candidatos[0];
      return [
        nomeLoja(l.lojaId),
        rotuloCargo(l.cargo),
        t ? t.colaborador.nome + (l.titulares.length > 1 ? ` (+${l.titulares.length - 1})` : "") : "",
        t?.avaliacao ? quadrante(t.avaliacao.desempenho, t.avaliacao.potencial).nome : "",
        c?.pessoa.colaborador.nome ?? "",
        c ? rotuloCargo(c.pessoa.colaborador.cargo) : "",
        c?.prontidao.rotulo ?? "",
        c ? (c.tempoMinimo == null ? "" : c.tempoMinimo ? "Sim" : "Não") : "",
        Math.max(0, l.candidatos.length - 1),
        l.risco.rotulo,
      ];
    }),
  ];
}

export { textoTempoDeCasa };
