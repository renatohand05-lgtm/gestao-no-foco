/**
 * Rede de lojas — RH: quadro de pessoal, turnover, absenteísmo e ocorrências.
 * Puro (sem banco, sem React): os testes importam daqui e conferem contra o painel original (HTML).
 *
 * Nada que se calcula é gravado: "ativo", tempo de casa, turnover e absenteísmo saem do cadastro e dos
 * lançamentos mensais, para nunca ficarem fora de sincronia.
 */
import { lerData, normalizar } from "./csv.ts";
import { dataValida } from "./filtros.ts";
import { primeiroDiaDoMes, ultimoDiaDoMes } from "./calculo.ts";
import type { CargoRh, ColaboradorRh, IndicadorMes, MesRh, OcorrenciaRh, PrevistoRh, StatusOcorrencia, TipoOcorrencia } from "./tipos.ts";

/* ------------------------------------------------------------------ catálogos (textos do painel original) */

export const CARGOS_RH: readonly { k: CargoRh; nome: string }[] = [
  { k: "gerente_loja", nome: "Gerente de loja" },
  { k: "chefe_cozinha", nome: "Chefe de cozinha" },
  { k: "lider_delivery", nome: "Líder de delivery" },
  { k: "auxiliar_cozinha", nome: "Auxiliar de cozinha" },
  { k: "atendente", nome: "Atendente" },
];
export const rotuloCargo = (k: CargoRh): string => CARGOS_RH.find((c) => c.k === k)?.nome ?? k;

export type TomRh = "ok" | "warn" | "bad" | "neu";

export const TIPOS_OCORRENCIA: readonly { k: TipoOcorrencia; nome: string; tom: TomRh }[] = [
  { k: "advertencia_verbal", nome: "Advertência verbal", tom: "warn" },
  { k: "advertencia_escrita", nome: "Advertência escrita", tom: "bad" },
  { k: "suspensao", nome: "Suspensão", tom: "bad" },
  { k: "falta_injustificada", nome: "Falta injustificada", tom: "bad" },
  { k: "atraso", nome: "Atraso", tom: "warn" },
  { k: "atestado_medico", nome: "Atestado médico", tom: "neu" },
  { k: "feedback", nome: "Feedback", tom: "neu" },
  { k: "elogio", nome: "Elogio", tom: "ok" },
  { k: "treinamento", nome: "Treinamento", tom: "ok" },
  { k: "desligamento", nome: "Desligamento", tom: "bad" },
];
export const rotuloTipo = (k: TipoOcorrencia): string => TIPOS_OCORRENCIA.find((t) => t.k === k)?.nome ?? k;
export const tomDoTipo = (k: TipoOcorrencia): TomRh => TIPOS_OCORRENCIA.find((t) => t.k === k)?.tom ?? "neu";

export const STATUS_OCORRENCIA: readonly { k: StatusOcorrencia; nome: string }[] = [
  { k: "registrada", nome: "Registrada" },
  { k: "aguardando_assinatura", nome: "Aguardando assinatura" },
  { k: "assinada", nome: "Assinada" },
  { k: "recusou_assinar", nome: "Recusou assinar" },
  { k: "concluida", nome: "Concluída" },
];
export const rotuloStatusOcorrencia = (k: StatusOcorrencia): string => STATUS_OCORRENCIA.find((s) => s.k === k)?.nome ?? k;

/** Semáforo do painel original: verde até o 1º limite, amarelo até o 2º, vermelho acima. */
export const LIMITES_TURNOVER = [4, 7] as const;
export const LIMITES_ABSENTEISMO = [2.5, 4] as const;
/** Dias de trabalho previstos por pessoa no mês (sugestão do formulário: headcount × 26). */
export const DIAS_PREVISTOS_POR_PESSOA = 26;
/** Janela dos KPIs e dos alertas de ocorrências. */
export const JANELA_OCORRENCIAS_MESES = 6;

const EPS = 1e-9;
const arred1 = (v: number): number => Math.round(v * 10) / 10;

/* ------------------------------------------------------------------ fórmulas */

export type SomasRh = { headcount: number; admissoes: number; desligamentos: number; faltas: number; diasPrevistos: number };

/** Turnover = ((admissões + desligamentos) ÷ 2) ÷ headcount médio × 100. */
export const turnoverPct = (m: Pick<SomasRh, "headcount" | "admissoes" | "desligamentos">): number | null =>
  m.headcount > 0 ? ((m.admissoes + m.desligamentos) / 2 / m.headcount) * 100 : null;

/** Absenteísmo = dias de falta ÷ dias previstos × 100. */
export const absenteismoPct = (m: Pick<SomasRh, "faltas" | "diasPrevistos">): number | null => (m.diasPrevistos > 0 ? (m.faltas / m.diasPrevistos) * 100 : null);

export type SemaforoRh = "ok" | "warn" | "bad";
export const semaforo = (v: number, lim: readonly [number, number]): SemaforoRh => (v <= lim[0] + EPS ? "ok" : v <= lim[1] + EPS ? "warn" : "bad");

/** Rede = soma das contagens e só depois a fórmula (não a média dos percentuais das lojas). */
export function somarMeses(rows: readonly MesRh[]): SomasRh {
  const s: SomasRh = { headcount: 0, admissoes: 0, desligamentos: 0, faltas: 0, diasPrevistos: 0 };
  for (const r of rows) {
    s.headcount += r.headcount;
    s.admissoes += r.admissoes;
    s.desligamentos += r.desligamentos;
    s.faltas += r.faltas;
    s.diasPrevistos += r.diasPrevistos;
  }
  return s;
}

export const turnoverDoMes = (r: MesRh): number | null => turnoverPct(r);
export const absenteismoDoMes = (r: MesRh): number | null => absenteismoPct(r);

/* ------------------------------------------------------------------ matriz mês × loja */

export type LinhaMatrizRh = {
  /** null = linha "Rede". */
  lojaId: string | null;
  valores: (number | null)[];
  /** Média simples dos meses com valor (como no painel original). */
  media: number | null;
};
export type MatrizRh = { meses: string[]; linhas: LinhaMatrizRh[] };

/**
 * Valor de cada loja em cada mês (turnover ou absenteísmo) e, havendo mais de uma loja, a linha da Rede.
 * Só entram lojas com lançamento; os meses são os que têm lançamento nelas, em ordem.
 */
export function matrizMensal(rows: readonly MesRh[], lojaIds: readonly string[], f: (s: SomasRh) => number | null): MatrizRh {
  const dentro = new Set(lojaIds);
  const uso = rows.filter((r) => dentro.has(r.lojaId));
  const meses = [...new Set(uso.map((r) => r.mes))].sort();
  const lojasComDado = lojaIds.filter((id) => uso.some((r) => r.lojaId === id));
  const media = (v: (number | null)[]): number | null => {
    const ok = v.filter((x): x is number => x != null);
    return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
  };
  const linhas: LinhaMatrizRh[] = lojasComDado.map((id) => {
    const valores = meses.map((m) => {
      const r = uso.find((x) => x.lojaId === id && x.mes === m);
      return r ? f(somarMeses([r])) : null;
    });
    return { lojaId: id, valores, media: media(valores) };
  });
  if (lojasComDado.length > 1) {
    const valores = meses.map((m) => {
      const rs = uso.filter((x) => x.mes === m);
      return rs.length ? f(somarMeses(rs)) : null;
    });
    linhas.push({ lojaId: null, valores, media: media(valores) });
  }
  return { meses, linhas };
}

/** Último mês com lançamento nas lojas e o resultado da rede (soma das contagens) nele. */
export function ultimoMesRh(rows: readonly MesRh[], lojaIds: readonly string[]): { mes: string; turnover: number | null; absenteismo: number | null; lojas: number } | null {
  const dentro = new Set(lojaIds);
  const uso = rows.filter((r) => dentro.has(r.lojaId));
  if (uso.length === 0) return null;
  const mes = uso.reduce((a, r) => (r.mes > a ? r.mes : a), uso[0].mes);
  const doMes = uso.filter((r) => r.mes === mes);
  const s = somarMeses(doMes);
  return { mes, turnover: turnoverPct(s), absenteismo: absenteismoPct(s), lojas: doMes.length };
}

/** Indicadores "calculado" que a tela de Metas mostra (e o painel usa) no lugar do valor lançado à mão. */
export function indicadoresRh(rows: readonly MesRh[]): IndicadorMes[] {
  const out: IndicadorMes[] = [];
  for (const r of rows) {
    const t = turnoverPct(r);
    const a = absenteismoPct(r);
    if (t != null) out.push({ lojaId: r.lojaId, mes: r.mes, indicador: "turnover", valor: t, origem: "calculado" });
    if (a != null) out.push({ lojaId: r.lojaId, mes: r.mes, indicador: "absent", valor: a, origem: "calculado" });
  }
  return out;
}

/* ------------------------------------------------------------------ tempo de casa */

/** Meses completos entre a admissão e `hoje`. O dia da admissão é limitado ao fim do mês: 30/jan completa 1 mês em 28/fev, mas em 27/fev ainda não. */
export function mesesDeCasa(admissao: string, hoje: string): number {
  const [ay, am, ad] = admissao.split("-").map(Number);
  const [hy, hm, hd] = hoje.split("-").map(Number);
  let m = (hy - ay) * 12 + (hm - am);
  const ultimoDiaHoje = new Date(Date.UTC(hy, hm, 0)).getUTCDate();
  if (hd < ad && hd !== ultimoDiaHoje) m -= 1;
  return Math.max(0, m);
}

const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** "4 meses" · "1 ano" · "1,5 ano" · "3,2 anos" (mesmo texto do painel original). */
export function textoTempoDeCasa(m: number): string {
  if (m < 12) return `${m} ${m === 1 ? "mês" : "meses"}`;
  return `${nf1.format(m / 12).replace(",0", "")} ${m < 24 ? "ano" : "anos"}`;
}

export type TempoDeCasaCargo = { cargo: CargoRh; pessoas: number; mediaMeses: number; ate6: number; de6a12: number; mais12: number };

export function tempoDeCasaPorCargo(ativos: readonly ColaboradorRh[], hoje: string): TempoDeCasaCargo[] {
  const out: TempoDeCasaCargo[] = [];
  for (const c of CARGOS_RH) {
    const g = ativos.filter((p) => p.cargo === c.k);
    if (g.length === 0) continue;
    const m = g.map((p) => mesesDeCasa(p.dataAdmissao, hoje));
    out.push({
      cargo: c.k,
      pessoas: g.length,
      mediaMeses: Math.round(m.reduce((a, b) => a + b, 0) / g.length),
      ate6: m.filter((x) => x < 6).length,
      de6a12: m.filter((x) => x >= 6 && x < 12).length,
      mais12: m.filter((x) => x >= 12).length,
    });
  }
  return out;
}

export function tempoMedioDeCasa(ativos: readonly ColaboradorRh[], hoje: string): number | null {
  if (ativos.length === 0) return null;
  return ativos.reduce((a, p) => a + mesesDeCasa(p.dataAdmissao, hoje), 0) / ativos.length;
}

/* ------------------------------------------------------------------ quadro: ativos × previstos */

export type CelulaQuadro = { ativo: number; previsto: number };
export type QuadroLoja = { lojaId: string; porCargo: Record<CargoRh, CelulaQuadro>; ativo: number; previsto: number };
export type QuadroRh = {
  lojas: QuadroLoja[];
  total: { porCargo: Record<CargoRh, CelulaQuadro>; ativo: number; previsto: number };
  /** Soma do que falta em cada cargo (nunca negativa por cargo). */
  vagas: number;
  /** Soma do que passa do previsto em cada cargo. */
  excedente: number;
};

const celulasVazias = (): Record<CargoRh, CelulaQuadro> => ({
  gerente_loja: { ativo: 0, previsto: 0 },
  chefe_cozinha: { ativo: 0, previsto: 0 },
  lider_delivery: { ativo: 0, previsto: 0 },
  auxiliar_cozinha: { ativo: 0, previsto: 0 },
  atendente: { ativo: 0, previsto: 0 },
});

/** Ativos vêm do cadastro (situação "ativo"); previstos, do quadro previsto da loja. */
export function montarQuadro(colaboradores: readonly ColaboradorRh[], previstos: readonly PrevistoRh[], lojaIds: readonly string[]): QuadroRh {
  const total = celulasVazias();
  let vagas = 0;
  let excedente = 0;
  const lojas = lojaIds.map((lojaId) => {
    const porCargo = celulasVazias();
    for (const c of colaboradores) if (c.lojaId === lojaId && c.status === "ativo") porCargo[c.cargo].ativo += 1;
    for (const p of previstos) if (p.lojaId === lojaId) porCargo[p.cargo].previsto = p.previsto;
    let ativo = 0;
    let previsto = 0;
    for (const { k } of CARGOS_RH) {
      const c = porCargo[k];
      ativo += c.ativo;
      previsto += c.previsto;
      total[k].ativo += c.ativo;
      total[k].previsto += c.previsto;
      vagas += Math.max(0, c.previsto - c.ativo);
      excedente += Math.max(0, c.ativo - c.previsto);
    }
    return { lojaId, porCargo, ativo, previsto };
  });
  const ativo = lojas.reduce((a, l) => a + l.ativo, 0);
  const previsto = lojas.reduce((a, l) => a + l.previsto, 0);
  return { lojas, total: { porCargo: total, ativo, previsto }, vagas, excedente };
}

/** Verde com o quadro completo, amarelo a partir de 80% do previsto, vermelho abaixo disso. */
export const statusQuadro = (ativo: number, previsto: number): SemaforoRh => (ativo >= previsto ? "ok" : ativo >= previsto * 0.8 ? "warn" : "bad");

/* ------------------------------------------------------------------ sugestão de lançamento mensal (do cadastro) */

export type SugestaoMes = { headcount: number; admissoes: number; desligamentos: number; diasPrevistos: number };

/**
 * Valores sugeridos para o mês a partir do cadastro: headcount médio (média do início e do fim do mês),
 * admissões e desligamentos do mês e dias previstos (headcount × 26). É só sugestão: a pessoa confere e ajusta.
 * `mes` = AAAA-MM. null quando o cadastro não tem ninguém na loja no período.
 */
export function sugerirMes(colaboradores: readonly ColaboradorRh[], lojaId: string, mes: string): SugestaoMes | null {
  const ini = primeiroDiaDoMes(mes);
  const fim = ultimoDiaDoMes(mes);
  const da = colaboradores.filter((c) => c.lojaId === lojaId);
  const noInicio = da.filter((c) => c.dataAdmissao < ini && (c.dataDesligamento == null || c.dataDesligamento >= ini)).length;
  const noFim = da.filter((c) => c.dataAdmissao <= fim && (c.dataDesligamento == null || c.dataDesligamento > fim)).length;
  const headcount = arred1((noInicio + noFim) / 2);
  if (headcount <= 0) return null;
  return {
    headcount,
    admissoes: da.filter((c) => c.dataAdmissao >= ini && c.dataAdmissao <= fim).length,
    desligamentos: da.filter((c) => c.dataDesligamento != null && c.dataDesligamento >= ini && c.dataDesligamento <= fim).length,
    diasPrevistos: Math.round(headcount * DIAS_PREVISTOS_POR_PESSOA),
  };
}

/* ------------------------------------------------------------------ ocorrências */

/** Primeiro dia da janela dos "últimos 6 meses" (o dia é limitado ao último dia do mês de destino). */
export function inicioDaJanela(hoje: string, meses = JANELA_OCORRENCIAS_MESES): string {
  const [y, m, d] = hoje.split("-").map(Number);
  const alvo = new Date(Date.UTC(y, m - 1 - meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  const dia = Math.min(d, ultimo);
  return `${alvo.getUTCFullYear()}-${String(alvo.getUTCMonth() + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export const ocorrenciasRecentes = (oc: readonly OcorrenciaRh[], hoje: string): OcorrenciaRh[] => {
  const ini = inicioDaJanela(hoje);
  return oc.filter((o) => o.data >= ini && o.data <= hoje);
};

export type KpisOcorrencias = { advertencias: number; suspensoes: number; faltas: number; atrasos: number; atestados: number; elogiosTreinamentos: number };

export function kpisOcorrencias(recentes: readonly OcorrenciaRh[]): KpisOcorrencias {
  const n = (...t: TipoOcorrencia[]) => recentes.filter((o) => t.includes(o.tipo)).length;
  return {
    advertencias: n("advertencia_verbal", "advertencia_escrita"),
    suspensoes: n("suspensao"),
    faltas: n("falta_injustificada"),
    atrasos: n("atraso"),
    atestados: n("atestado_medico"),
    elogiosTreinamentos: n("elogio", "treinamento"),
  };
}

export type AlertaRh = { colaboradorId: string; nivel: "bad" | "warn"; texto: string };

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Quem merece atenção, nas ocorrências recentes (regras do painel original):
 * suspensão + outra ocorrência → avaliar desligamento · 2+ advertências → próximo passo é suspensão ·
 * 2+ faltas injustificadas → conversar e advertir · 1 advertência → acompanhar.
 * Divergência deliberada: uma suspensão sozinha também entra (acompanhar) e quem já foi desligado não aparece.
 */
export function alertasDePessoas(recentes: readonly OcorrenciaRh[], colaboradores: readonly ColaboradorRh[]): AlertaRh[] {
  const ativos = new Set(colaboradores.filter((c) => c.status === "ativo").map((c) => c.id));
  const nome = new Map(colaboradores.map((c) => [c.id, c.nome] as const));
  const por = new Map<string, OcorrenciaRh[]>();
  for (const o of recentes) {
    if (!ativos.has(o.colaboradorId)) continue;
    por.set(o.colaboradorId, [...(por.get(o.colaboradorId) ?? []), o]);
  }
  const out: AlertaRh[] = [];
  for (const [id, os] of por) {
    const adv = os.filter((o) => o.tipo === "advertencia_verbal" || o.tipo === "advertencia_escrita").length;
    const sus = os.filter((o) => o.tipo === "suspensao").length;
    const fal = os.filter((o) => o.tipo === "falta_injustificada").length;
    if (sus >= 1 && adv + fal >= 1) {
      out.push({ colaboradorId: id, nivel: "bad", texto: `${plural(sus, "suspensão", "suspensões")} e ${plural(adv + fal, "outra ocorrência", "outras ocorrências")} — avaliar desligamento com o jurídico/RH.` });
    } else if (adv >= 2) {
      out.push({ colaboradorId: id, nivel: "bad", texto: `${adv} advertências — próximo passo previsto: suspensão.` });
    } else if (fal >= 2) {
      out.push({ colaboradorId: id, nivel: "warn", texto: `${fal} faltas injustificadas — conversar e registrar advertência.` });
    } else if (adv === 1) {
      out.push({ colaboradorId: id, nivel: "warn", texto: "1 advertência — acompanhar." });
    } else if (sus >= 1) {
      out.push({ colaboradorId: id, nivel: "warn", texto: `${plural(sus, "suspensão", "suspensões")} — acompanhar.` });
    }
  }
  return out.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "bad" ? -1 : 1) || (nome.get(a.colaboradorId) ?? "").localeCompare(nome.get(b.colaboradorId) ?? "", "pt-BR"));
}

export type ResumoLojaTipo = {
  tiposUsados: TipoOcorrencia[];
  linhas: { lojaId: string; porTipo: Partial<Record<TipoOcorrencia, number>>; total: number }[];
};

/** Ocorrências por loja e tipo (só os tipos que aparecem), em todo o período carregado. */
export function resumoPorLojaTipo(oc: readonly OcorrenciaRh[], lojaIds: readonly string[]): ResumoLojaTipo {
  const dentro = new Set(lojaIds);
  const uso = oc.filter((o) => dentro.has(o.lojaId));
  const tiposUsados = TIPOS_OCORRENCIA.map((t) => t.k).filter((k) => uso.some((o) => o.tipo === k));
  const linhas = lojaIds.map((lojaId) => {
    const doLoja = uso.filter((o) => o.lojaId === lojaId);
    const porTipo: Partial<Record<TipoOcorrencia, number>> = {};
    for (const o of doLoja) porTipo[o.tipo] = (porTipo[o.tipo] ?? 0) + 1;
    return { lojaId, porTipo, total: doLoja.length };
  });
  return { tiposUsados, linhas };
}

/** Ocorrências mais recentes primeiro (mesma data: a registrada depois primeiro). */
export const ordenarOcorrencias = (oc: readonly OcorrenciaRh[]): OcorrenciaRh[] => [...oc].sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id));

/* ------------------------------------------------------------------ exportação (CSV) */

type Celula = string | number | null;
const ddmmaaaa = (iso: string | null): string => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
const virgula = (v: number | null, casas = 1): string => (v == null ? "" : v.toFixed(casas).replace(".", ","));

export function linhasCsvOcorrencias(oc: readonly OcorrenciaRh[], nomeLoja: (id: string) => string, colaboradores: readonly ColaboradorRh[]): Celula[][] {
  const por = new Map(colaboradores.map((c) => [c.id, c] as const));
  return [
    ["Data", "Colaborador", "Cargo", "Loja", "Tipo", "Motivo", "Responsável", "Status", "Observação"],
    ...ordenarOcorrencias(oc).map((o) => {
      const c = por.get(o.colaboradorId);
      return [ddmmaaaa(o.data), c?.nome ?? "", c ? rotuloCargo(c.cargo) : "", nomeLoja(o.lojaId), rotuloTipo(o.tipo), o.motivo, o.responsavel ?? "", rotuloStatusOcorrencia(o.status), o.observacoes ?? ""];
    }),
  ];
}

export function linhasCsvMovimentos(rows: readonly MesRh[], nomeLoja: (id: string) => string): Celula[][] {
  return [
    ["Mês", "Loja", "Headcount médio", "Admissões", "Desligamentos", "Dias de falta", "Dias previstos", "Turnover (%)", "Absenteísmo (%)"],
    ...[...rows]
      .sort((a, b) => b.mes.localeCompare(a.mes) || nomeLoja(a.lojaId).localeCompare(nomeLoja(b.lojaId), "pt-BR"))
      .map((r) => [`${r.mes.slice(5, 7)}/${r.mes.slice(0, 4)}`, nomeLoja(r.lojaId), virgula(r.headcount), r.admissoes, r.desligamentos, r.faltas, r.diasPrevistos, virgula(turnoverPct(r)), virgula(absenteismoPct(r))]),
  ];
}

export function linhasCsvQuadro(colaboradores: readonly ColaboradorRh[], nomeLoja: (id: string) => string, hoje: string): Celula[][] {
  return [
    ["Nome", "Cargo", "Loja", "Admissão", "Tempo de casa", "Situação", "Desligamento", "Motivo do desligamento"],
    ...[...colaboradores]
      .sort((a, b) => nomeLoja(a.lojaId).localeCompare(nomeLoja(b.lojaId), "pt-BR") || CARGOS_RH.findIndex((c) => c.k === a.cargo) - CARGOS_RH.findIndex((c) => c.k === b.cargo) || a.nome.localeCompare(b.nome, "pt-BR"))
      .map((c) => [
        c.nome,
        rotuloCargo(c.cargo),
        nomeLoja(c.lojaId),
        ddmmaaaa(c.dataAdmissao),
        c.status === "ativo" ? textoTempoDeCasa(mesesDeCasa(c.dataAdmissao, hoje)) : "",
        c.status === "ativo" ? "Ativo" : "Desligado",
        ddmmaaaa(c.dataDesligamento),
        c.motivoDesligamento ?? "",
      ]),
  ];
}

/* ------------------------------------------------------------------ importação (colar lista) */

export type ColaboradorImportado = { nome: string; cargo: CargoRh; dataAdmissao: string };
export type ErroImportacaoRh = { linha: number; mensagem: string };
export type ResultadoImportacaoRh = { linhas: ColaboradorImportado[]; erros: ErroImportacaoRh[]; total: number };

export const LIMITE_IMPORTACAO_RH = 200;

const SINONIMOS_CARGO: readonly [CargoRh, readonly string[]][] = [
  ["gerente_loja", ["gerente", "gerente de loja", "gerente loja"]],
  ["chefe_cozinha", ["chefe", "chefe de cozinha", "chefe cozinha", "cozinheiro chefe"]],
  ["lider_delivery", ["lider", "lider de delivery", "lider delivery"]],
  ["auxiliar_cozinha", ["auxiliar", "auxiliar de cozinha", "auxiliar cozinha", "aux de cozinha", "aux cozinha"]],
  ["atendente", ["atendente", "atendimento"]],
];

export function lerCargo(bruto: string): CargoRh | null {
  const n = normalizar(bruto);
  return SINONIMOS_CARGO.find(([, nomes]) => nomes.includes(n))?.[0] ?? null;
}

/**
 * Lê uma lista colada (Excel ou texto): uma pessoa por linha — Nome ; Cargo ; Admissão (dd/mm/aaaa ou aaaa-mm-dd).
 * Separador: `;` ou tabulação. A primeira linha pode ser o cabeçalho. Tudo ou nada: o chamador só grava se não houver erros.
 * `nomesAtivos` = nomes já ativos na loja (em qualquer grafia de caixa/acento).
 */
export function lerImportacaoColaboradores(texto: string, hoje: string, nomesAtivos: readonly string[] = []): ResultadoImportacaoRh {
  const linhas: ColaboradorImportado[] = [];
  const erros: ErroImportacaoRh[] = [];
  const brutas = texto.replace(/^﻿/, "").split(/\r\n|\r|\n/);
  const ja = new Set(nomesAtivos.map((n) => normalizar(n)));
  const vistos = new Set<string>();
  let total = 0;
  let primeira = true;
  brutas.forEach((raw, i) => {
    if (raw.trim() === "") return;
    const campos = raw.split(raw.includes("\t") ? "\t" : ";").map((c) => c.trim().replace(/^"(.*)"$/, "$1"));
    if (primeira) {
      primeira = false;
      if (normalizar(campos[0] ?? "") === "nome" || (campos.length > 1 && normalizar(campos[1]) === "cargo")) return;
    }
    total += 1;
    const n = i + 1;
    if (total > LIMITE_IMPORTACAO_RH) {
      if (total === LIMITE_IMPORTACAO_RH + 1) erros.push({ linha: n, mensagem: `Mais de ${LIMITE_IMPORTACAO_RH} linhas. Importe em partes.` });
      return;
    }
    const [nome = "", cargoTxt = "", admTxt = ""] = campos;
    if (campos.length < 3) return void erros.push({ linha: n, mensagem: "Use três colunas: Nome ; Cargo ; Admissão." });
    if (nome.length < 2 || nome.length > 120) return void erros.push({ linha: n, mensagem: "Nome deve ter de 2 a 120 caracteres." });
    const cargo = lerCargo(cargoTxt);
    if (!cargo) return void erros.push({ linha: n, mensagem: `Cargo "${cargoTxt}" não reconhecido (use: ${CARGOS_RH.map((c) => c.nome).join(", ")}).` });
    const adm = lerData(admTxt);
    if (!adm || !dataValida(adm)) return void erros.push({ linha: n, mensagem: `Data de admissão "${admTxt}" inválida (use dd/mm/aaaa).` });
    if (adm > hoje) return void erros.push({ linha: n, mensagem: "A admissão não pode ser futura." });
    if (adm < "1990-01-01") return void erros.push({ linha: n, mensagem: "Admissão antes de 1990." });
    const chave = normalizar(nome);
    if (ja.has(chave)) return void erros.push({ linha: n, mensagem: `"${nome}" já está ativo nesta loja.` });
    if (vistos.has(chave)) return void erros.push({ linha: n, mensagem: `"${nome}" aparece mais de uma vez na lista.` });
    vistos.add(chave);
    linhas.push({ nome, cargo, dataAdmissao: adm });
  });
  return { linhas, erros, total };
}

/* ------------------------------------------------------------------ erros do banco em linguagem de gente */

/**
 * Traduz erro do banco (restrição violada) para uma frase clara; null = não é um erro conhecido de RH
 * (o chamador usa a tradução geral). Compara pelo nome da restrição, que é estável.
 */
export function erroRh(error: unknown): string | null {
  const e = error as { code?: string; message?: string; details?: string } | null | undefined;
  if (!e || typeof e !== "object") return null;
  const t = `${e.message ?? ""} ${e.details ?? ""}`;
  const tem = (nome: string) => t.includes(nome);
  if (e.code === "23505") {
    if (tem("rede_rh_colab_nome_uk")) return "Já existe um colaborador ativo com esse nome nesta loja.";
    if (tem("rede_rh_m_uk")) return "Já existe lançamento deste mês para esta loja.";
    if (tem("rede_rh_qp_uk")) return "O quadro previsto desta loja já foi salvo; atualize-o.";
    return null;
  }
  if (e.code === "23503") {
    if (tem("rede_rh_oco_colab_fk")) return "Este colaborador tem ocorrências registradas, então não pode ser excluído nem trocado de loja. Para tirá-lo do quadro, use \"Desligar\".";
    if (tem("rede_rh_colab_loja_fk") || tem("rede_rh_m_loja_fk") || tem("rede_rh_qp_loja_fk") || tem("rede_rh_oco_loja_fk")) return "Loja não encontrada.";
    return null;
  }
  if (e.code === "23514") {
    if (tem("rede_rh_colab_deslig_data_chk")) return "A data de desligamento não pode ser anterior à admissão.";
    if (tem("rede_rh_colab_adm_chk")) return "Data de admissão fora do intervalo permitido.";
    if (tem("rede_rh_m_falta_chk")) return "Os dias de falta não podem passar dos dias previstos.";
    if (tem("rede_rh_m_hc_chk")) return "O headcount médio deve ser maior que zero.";
    if (tem("rede_rh_m_mes_chk")) return "Mês fora do intervalo permitido.";
    if (tem("rede_rh_oco_data_chk")) return "Data da ocorrência fora do intervalo permitido.";
    return null; // as mensagens dos gatilhos já vêm em português e passam pela tradução geral
  }
  return null;
}
