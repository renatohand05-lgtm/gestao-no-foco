#!/usr/bin/env node
/**
 * Testes de talentos da rede (regras puras, sem banco): avaliação de gerentes, Nine Box, trilhas e sucessão.
 * 1) Paridade com o painel original: as contas do HTML (gerScore, NB, prontos, prontidao, FEED, rhSuc, CSV) foram
 *    transcritas abaixo e rodam sobre os mesmos dados (scripts/fixtures/rede-html-rh.json: 82 pessoas, notas de
 *    liderança) e sobre milhares de combinações sorteadas; o app precisa bater. As divergências deliberadas estão
 *    testadas como divergências (e documentadas no relatório).
 * 2) Regras do sistema: indicador ausente não ganha nota (peso redistribuído), peso mínimo, gerente da loja no mês,
 *    ordem estável, histórico em português, CSV.
 * Node com --experimental-strip-types.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { lerEntrada } from "../lib/rede/acao-comum.ts";
import { mapCriterioCargo, mapLideranca, mapNineBox } from "../lib/rede/mapeadores-talentos.ts";
import { MENU_REDE, modulosDoItem } from "../lib/rede/menu.ts";
import { CARGOS_RH, erroRh } from "../lib/rede/rh.ts";
import { criterioCargoSchema, liderancaSchema, nineBoxSchema } from "../lib/rede/schemas-talentos.ts";
import {
  CARGOS_CARREIRA,
  CARGOS_CHAVE_SUCESSAO,
  CRITERIOS_PADRAO,
  FAIXA_NOTA_ABSENTEISMO,
  FAIXA_NOTA_TURNOVER,
  ORDEM_LEGENDA_NINE_BOX,
  PESOS_GERENTE,
  PESO_MINIMO_SCORE,
  TRILHAS,
  avaliarGerente,
  casaDoGerenteNoMes,
  chaveQuadrante,
  componentesGerente,
  contarTalentos,
  criterioDoCargo,
  descreverMudancaNineBox,
  faixaDoScore,
  formatarScore,
  gerenteDaLojaNoMes,
  juntarNineBox,
  lerNotaLideranca,
  lerNotasNineBox,
  linhasCsvGerentes,
  linhasCsvNineBox,
  linhasCsvSucessao,
  mapaSucessao,
  matrizNineBox,
  notaLinear,
  prontidao,
  prontosParaSubir,
  quadrante,
  rankearGerentes,
  recomendacaoGerente,
  rotuloCargoCarreira,
  rotuloNivel,
  scoreGerente,
  tempoMinimoAtendido,
} from "../lib/rede/talentos.ts";

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    console.error("FALHOU:", msg);
  }
}
function igual(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg} — obtido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`);
}
const perto = (a, b, eps = 1e-9) => a != null && b != null && Math.abs(a - b) <= eps;

const aqui = dirname(fileURLToPath(import.meta.url));
const HTML = JSON.parse(readFileSync(join(aqui, "fixtures", "rede-html-rh.json"), "utf8"));
const SLUG = HTML.lojaSlug; // chave do HTML -> slug do app
const NOME_CARGO = Object.fromEntries(Object.entries(HTML.cargos).map(([n, k]) => [k, n]));

/* ------------------------------------------------------------------ o HTML, transcrito (L955–1082) */
const HTML_NB = {
  "3-3": ["Talento", "Promover ou preparar para o próximo cargo; dar projetos desafiadores.", "#3fc58e"],
  "2-3": ["Alto potencial", "Acelerar desenvolvimento com mentoria e PDI.", "#7bd3a9"],
  "1-3": ["Enigma", "Entender a causa do baixo desempenho; ajustar função ou treinamento.", "#f2b33d"],
  "3-2": ["Forte desempenho", "Reconhecer e ampliar responsabilidades.", "#7bd3a9"],
  "2-2": ["Mantenedor", "Manter engajado e treinar para evoluir.", "#eedbca"],
  "1-2": ["Questionável", "PDI com metas claras e acompanhamento mensal.", "#f2b33d"],
  "3-1": ["Especialista", "Valorizar como referência técnica no cargo atual.", "#eedbca"],
  "2-1": ["Eficaz", "Manter e acompanhar.", "#b9aa9e"],
  "1-1": ["Insuficiente", "Plano de melhoria com prazo; avaliar permanência.", "#e5303f"],
};
const HTML_LEGENDA = ["3-3", "2-3", "3-2", "2-2", "1-3", "3-1", "1-2", "2-1", "1-1"];
const HTML_LV = ["", "Baixo", "Médio", "Alto"];
const HTML_TRILHAS = [
  { n: "Trilha de cozinha", c: ["Auxiliar de cozinha", "Chefe de cozinha", "Gerente de loja", "Supervisor Regional"] },
  { n: "Trilha de salão e delivery", c: ["Atendente", "Líder de delivery", "Gerente de loja", "Supervisor Regional"] },
];
const HTML_REQ = {
  "Auxiliar de cozinha": { min: 12, txt: "12 meses no cargo, domínio das fichas técnicas e boas práticas, treinamento de liderança de praça." },
  Atendente: { min: 6, txt: "6 meses no cargo, conhecimento das plataformas e da expedição, treinamento de conferência e embalagem." },
  "Chefe de cozinha": { min: 12, txt: "12 meses no cargo, CMV e rupturas na meta, treinamento de gestão (DRE, escalas e estoque)." },
  "Líder de delivery": { min: 12, txt: "12 meses no cargo, preparo, cancelamentos e nota iFood na meta, treinamento de gestão." },
  "Gerente de loja": { min: 18, txt: '18 meses no cargo, loja acima de R$ 500 mil, indicadores na meta e nine box "Talento".' },
  "Supervisor Regional": { min: null, txt: "Cargo previsto na estrutura de 10 lojas (2 supervisores, 5 lojas cada)." },
};
const HTML_FEED = { "Gerente de loja": ["Chefe de cozinha", "Líder de delivery"], "Chefe de cozinha": ["Auxiliar de cozinha"], "Líder de delivery": ["Atendente"] };
const HTML_CARGOS = ["Gerente de loja", "Chefe de cozinha", "Líder de delivery", "Auxiliar de cozinha", "Atendente"];
// "hoje" no fim do mês: a conta do HTML (diferença de meses do calendário) e a do app (meses completos) coincidem.
const HOJE = "2026-12-31";
const htmlMesesCasa = (adm, hoje = HOJE) => {
  const a = new Date(adm + "T12:00");
  const h = new Date(hoje + "T12:00");
  return Math.max(0, (h.getFullYear() - a.getFullYear()) * 12 + h.getMonth() - a.getMonth());
};
const htmlProntidao = (p) => (p.desempenho === 3 && p.potencial === 3 ? ["Pronto agora", "s-ok"] : p.potencial === 3 ? ["6 a 12 meses", "s-warn"] : p.potencial === 2 && p.desempenho === 3 ? ["12 a 24 meses", "s-neu"] : null);
const htmlLin = (x, a, b) => Math.max(0, Math.min(100, ((b - x) / (b - a)) * 100));
// gerScore (L1003–1018) com os insumos já calculados (ST[id].pctMeta, ok/ms.length, vis.score, turnover, absent, liderança).
function htmlScore({ pctMeta, ok, tot, qual, turnover, absent, lider, potencial }) {
  const comp = { vendas: Math.min(100, pctMeta), ind: (ok / tot) * 100, qual, pessoas: (htmlLin(turnover, 3, 10) + htmlLin(absent, 2, 6)) / 2, lider: (lider / 5) * 100 };
  const W = { vendas: 30, ind: 25, qual: 15, pessoas: 15, lider: 15 };
  let sw = 0;
  let s = 0;
  Object.keys(W).forEach((k) => {
    if (comp[k] != null) {
      sw += W[k];
      s += W[k] * comp[k];
    }
  });
  const score = s / sw;
  const rec = score >= 85 && potencial === 3 ? ["Pronto para promoção", "s-ok"] : score >= 70 ? ["Desenvolver (PDI)", "s-neu"] : score >= 55 ? ["Acompanhar de perto", "s-warn"] : ["Plano de melhoria", "s-bad"];
  return { comp, score, rec };
}

/* ------------------------------------------------------------------ dados do HTML no formato do app */
const lojaId = (chave) => `loja-${SLUG[chave]}`;
const nomeLoja = (id) => id.replace("loja-", "");
const COLABS = HTML.pessoas.map((p) => ({
  id: `c${p.id}`,
  lojaId: lojaId(p.loja),
  nome: p.nome,
  cargo: HTML.cargos[p.cargo],
  dataAdmissao: p.admissao,
  status: "ativo",
  dataDesligamento: null,
  motivoDesligamento: null,
  observacoes: null,
  origem: "exemplo",
}));
const AVALS = HTML.pessoas.map((p) => ({ id: `n${p.id}`, lojaId: lojaId(p.loja), colaboradorId: `c${p.id}`, desempenho: p.desempenho, potencial: p.potencial, observacoes: null, origem: "exemplo" }));
const TODAS = Object.keys(SLUG).map(lojaId);

/* ================================================================== paridade: catálogos */
igual(Object.keys(HTML_NB).map((k) => [k, quadrante(+k[0], +k[2]).nome, quadrante(+k[0], +k[2]).orientacao, quadrante(+k[0], +k[2]).cor]), Object.entries(HTML_NB).map(([k, v]) => [k, v[0], v[1], v[2]]), "9 quadrantes: nome, orientação e cor = HTML");
igual(ORDEM_LEGENDA_NINE_BOX, HTML_LEGENDA, "ordem da legenda = HTML");
igual([1, 2, 3].map(rotuloNivel), ["Baixo", "Médio", "Alto"], "níveis Baixo/Médio/Alto");
igual(HTML_LV.slice(1), ["Baixo", "Médio", "Alto"], "HTML usa os mesmos níveis");
igual(rotuloNivel(null), "", "sem nota = sem rótulo (nunca 'Médio')");
igual(quadrante(0, 9).nome, "—", "combinação inválida não vira quadrante");
igual(chaveQuadrante(2, 3), "2-3", "chave desempenho-potencial");
igual(TRILHAS.map((t) => [t.nome, t.cargos.map(rotuloCargoCarreira)]), HTML_TRILHAS.map((t) => [t.n, t.c]), "2 trilhas = HTML (nome e passos)");
igual(CARGOS_CARREIRA.map(rotuloCargoCarreira), [...HTML_CARGOS, "Supervisor Regional"], "cargos da carreira = 5 do RH + Supervisor Regional");
igual(CARGOS_RH.map((c) => c.nome), HTML_CARGOS, "ordem dos cargos = HTML");
for (const c of CARGOS_CARREIRA) {
  const nome = rotuloCargoCarreira(c);
  igual([CRITERIOS_PADRAO[c].min, CRITERIOS_PADRAO[c].texto], [HTML_REQ[nome].min, HTML_REQ[nome].txt], `critério padrão de ${nome} = REQ do HTML`);
  igual(criterioDoCargo(c, []).ajustado, false, `${nome}: sem ajuste usa o padrão`);
}
igual(CARGOS_CHAVE_SUCESSAO.map((k) => [rotuloCargoCarreira(k.cargo), k.alimentam.map(rotuloCargoCarreira)]), Object.entries(HTML_FEED), "cargos-chave e quem os alimenta = FEED do HTML");
igual(PESOS_GERENTE.map((p) => p.peso), [30, 25, 15, 15, 15], "pesos 30/25/15/15/15");
igual(PESOS_GERENTE.reduce((a, p) => a + p.peso, 0), 100, "pesos somam 100");
igual([FAIXA_NOTA_TURNOVER, FAIXA_NOTA_ABSENTEISMO], [[3, 10], [2, 6]], "faixas de nota de turnover e absenteísmo = HTML");

/* ================================================================== paridade: nine box com os 82 do HTML */
{
  for (const filtroLoja of [TODAS, ...TODAS.map((l) => [l])]) {
    for (const cargo of [null, ...CARGOS_RH.map((c) => c.k)]) {
      const pessoas = juntarNineBox(COLABS, AVALS, { lojaIds: filtroLoja, cargo }, nomeLoja);
      const esperado = HTML.pessoas.filter((p) => filtroLoja.includes(lojaId(p.loja)) && (!cargo || HTML.cargos[p.cargo] === cargo));
      igual(pessoas.length, esperado.length, `nine box: ${filtroLoja.length} loja(s), cargo ${cargo ?? "todos"}: mesmas pessoas`);
      const m = matrizNineBox(pessoas);
      igual(m.celulas.length, 9, "matriz com 9 células");
      // ordem de desenho do HTML: potencial 3→1, desempenho 1→3
      const ordem = [];
      for (let p = 3; p >= 1; p--) for (let d = 1; d <= 3; d++) ordem.push(`${d}-${p}`);
      igual(m.celulas.map((c) => c.chave), ordem, "células na ordem de desenho do HTML");
      for (const c of m.celulas) {
        const g = esperado.filter((x) => x.desempenho === c.desempenho && x.potencial === c.potencial);
        igual(c.pessoas.map((x) => x.colaborador.nome).sort(), g.map((x) => x.nome).sort(), `quadrante ${c.chave}: nomes = HTML`);
        igual(c.quadrante.nome, HTML_NB[c.chave][0], `quadrante ${c.chave}: nome`);
      }
      igual(m.avaliados, esperado.length, "todos avaliados");
      igual(m.pendentes, 0, "nenhum pendente");
      igual(contarTalentos(pessoas), esperado.filter((x) => x.desempenho === 3 && x.potencial === 3).length, "talentos (3-3) = KPI do HTML");
    }
  }
  const todas = juntarNineBox(COLABS, AVALS, { lojaIds: TODAS }, nomeLoja);
  igual(todas.length, 82, "82 pessoas ativas no nine box");
  igual(contarTalentos(todas), 10, "10 talentos (3-3) no HTML");
  // ordem: cargo (ordem do HTML), loja, nome
  const ord = todas.map((x) => CARGOS_RH.findIndex((c) => c.k === x.colaborador.cargo));
  assert(ord.every((v, i) => i === 0 || ord[i - 1] <= v), "ordenado por cargo na ordem do HTML");
}

/* ================================================================== paridade: prontos, trilhas e mapa de sucessão */
for (const filtro of [TODAS, ...TODAS.map((l) => [l])]) {
  const pessoas = juntarNineBox(COLABS, AVALS, { lojaIds: filtro }, nomeLoja);
  const htmlPessoas = HTML.pessoas.filter((p) => filtro.includes(lojaId(p.loja)));
  for (const c of CARGOS_CARREIRA) {
    const nome = rotuloCargoCarreira(c);
    const r = HTML_REQ[nome];
    const esperado = !r || r.min == null ? [] : htmlPessoas.filter((p) => p.cargo === nome && p.potencial === 3 && p.desempenho >= 2 && htmlMesesCasa(p.admissao) >= r.min);
    const obtido = prontosParaSubir(c, pessoas, [], HOJE);
    igual(obtido.map((x) => x.colaborador.nome).sort(), esperado.map((x) => x.nome).sort(), `prontos para subir (${nome}, ${filtro.length} loja(s)) = HTML`);
  }
  const mapa = mapaSucessao(filtro, pessoas, [], HOJE);
  igual(mapa.length, filtro.length * 3, "uma linha por loja e cargo-chave");
  for (const l of mapa) {
    const cargoNome = NOME_CARGO[l.cargo];
    const tit = htmlPessoas.filter((p) => lojaId(p.loja) === l.lojaId && p.cargo === cargoNome);
    const cand = htmlPessoas
      .filter((p) => lojaId(p.loja) === l.lojaId && HTML_FEED[cargoNome].includes(p.cargo) && htmlProntidao(p))
      .sort((a, b) => b.potencial * 3 + b.desempenho - (a.potencial * 3 + a.desempenho));
    igual(l.titulares.length, tit.length, `${l.lojaId}/${cargoNome}: nº de titulares = HTML`);
    igual(l.candidatos.length, cand.length, `${l.lojaId}/${cargoNome}: nº de candidatos = HTML`);
    igual(new Set(l.candidatos.map((c) => c.pessoa.colaborador.nome)), new Set(cand.map((c) => c.nome)), `${l.lojaId}/${cargoNome}: mesmos candidatos`);
    if (cand[0]) {
      const pesoMelhor = cand[0].potencial * 3 + cand[0].desempenho;
      const obtidoMelhor = l.candidatos[0].pessoa.avaliacao;
      igual(obtidoMelhor.potencial * 3 + obtidoMelhor.desempenho, pesoMelhor, `${l.lojaId}/${cargoNome}: sucessor indicado tem a maior pontuação (= HTML)`);
      igual(l.candidatos[0].prontidao.rotulo, htmlProntidao(cand[0])[0], `${l.lojaId}/${cargoNome}: prontidão do sucessor`);
      const risco = htmlProntidao(cand[0])[0] === "Pronto agora" ? "Baixo" : "Médio";
      igual(l.risco.rotulo, risco, `${l.lojaId}/${cargoNome}: risco`);
    } else {
      igual(l.risco.rotulo, "Sem sucessor", `${l.lojaId}/${cargoNome}: sem candidato = Sem sucessor`);
      igual(l.risco.tom, "bad", "risco sem sucessor é vermelho");
    }
  }
}
// prontidão: todas as 9 combinações = HTML
for (let d = 1; d <= 3; d++)
  for (let p = 1; p <= 3; p++) {
    const h = htmlProntidao({ desempenho: d, potencial: p });
    const o = prontidao(d, p);
    igual(o ? [o.rotulo, `s-${o.tom}`] : null, h, `prontidão ${d}-${p} = HTML`);
  }

/* ================================================================== paridade: score do gerente com notas de liderança do HTML */
{
  const gerentesHtml = HTML.pessoas.filter((p) => p.cargo === "Gerente de loja");
  igual(gerentesHtml.length, 5, "5 gerentes no HTML");
  let combos = 0;
  // varre o espaço: vendas, indicadores, qualidade (presente/ausente), turnover, absenteísmo, liderança real de cada loja, potencial real
  for (const g of gerentesHtml) {
    const lider = HTML.lideranca[g.loja];
    for (const pctMeta of [0, 35.5, 82, 99.9, 100, 118, 140])
      for (const [ok, tot] of [[0, 6], [3, 6], [5, 6], [6, 6], [1, 1]])
        for (const qual of [null, 0, 55.5, 86, 100])
          for (const turnover of [0, 3, 6.6, 10, 25])
            for (const absent of [0, 2, 4, 6, 12]) {
              const h = htmlScore({ pctMeta, ok, tot, qual, turnover, absent, lider, potencial: g.potencial });
              const a = avaliarGerente({ lojaId: lojaId(g.loja), gerente: null, pctMeta, indOk: ok, indAvaliados: tot, qualidade: qual, qualidadeData: null, turnover, absenteismo: absent, lideranca: lider, potencial: g.potencial });
              combos++;
              assert(perto(a.score, h.score, 1e-9), `score gerente ${g.loja} ${pctMeta}/${ok}-${tot}/${qual}/${turnover}/${absent}: ${a.score} != ${h.score}`);
              if (a.score != null) {
                assert(a.rec.rotulo === h.rec[0] && `s-${a.rec.tom}` === h.rec[1], `recomendação ${g.loja}: ${a.rec?.rotulo} != ${h.rec[0]}`);
                assert(perto(a.comp.vendas, h.comp.vendas) && perto(a.comp.indicadores, h.comp.ind) && perto(a.comp.pessoas, h.comp.pessoas) && perto(a.comp.lideranca, h.comp.lider), "componentes = HTML");
                assert((qual == null && a.comp.qualidade == null) || perto(a.comp.qualidade, qual), "qualidade: ausente continua ausente");
              }
            }
  }
  assert(combos > 8000, `varredura grande (${combos} combinações)`);
  // sorteio com semente (xorshift) para cobrir o interior do espaço
  let s = 123456789;
  const rnd = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1000003) / 1000003;
  };
  for (let i = 0; i < 4000; i++) {
    const tot = 1 + Math.floor(rnd() * 8);
    const ok = Math.floor(rnd() * (tot + 1));
    const entrada = { pctMeta: rnd() * 160, ok, tot, qual: rnd() < 0.4 ? null : rnd() * 100, turnover: rnd() * 14, absent: rnd() * 9, lider: rnd() * 5, potencial: 1 + Math.floor(rnd() * 3) };
    const h = htmlScore(entrada);
    const a = avaliarGerente({ lojaId: "x", gerente: null, pctMeta: entrada.pctMeta, indOk: ok, indAvaliados: tot, qualidade: entrada.qual, qualidadeData: null, turnover: entrada.turnover, absenteismo: entrada.absent, lideranca: entrada.lider, potencial: entrada.potencial });
    assert(perto(a.score, h.score, 1e-9) && a.rec.rotulo === h.rec[0], `sorteio ${i}: score/recomendação = HTML`);
  }
  // faixas de recomendação nos limites (85 só com potencial alto)
  igual(recomendacaoGerente(85, 3).rotulo, "Pronto para promoção", "85 + potencial alto = promoção");
  igual(recomendacaoGerente(99, 2).rotulo, "Desenvolver (PDI)", "score alto sem potencial alto não promove");
  igual(recomendacaoGerente(99, null).rotulo, "Desenvolver (PDI)", "sem nine box não promove");
  igual(recomendacaoGerente(84.99, 3).rotulo, "Desenvolver (PDI)", "84,99 não promove");
  igual(recomendacaoGerente(70, 1).rotulo, "Desenvolver (PDI)", "70 = PDI");
  igual(recomendacaoGerente(69.99, 1).rotulo, "Acompanhar de perto", "69,99 = acompanhar");
  igual(recomendacaoGerente(55, 1).rotulo, "Acompanhar de perto", "55 = acompanhar");
  igual(recomendacaoGerente(54.99, 1).rotulo, "Plano de melhoria", "54,99 = melhoria");
  igual(recomendacaoGerente(85, 3).texto, "Candidato a Supervisor Regional na estrutura de 10 lojas.", "texto da promoção = HTML");
  igual(recomendacaoGerente(40, 1).texto, "Metas claras com prazo de 90 dias e acompanhamento semanal.", "texto da melhoria = HTML");
  igual([85, 84.9, 70, 69.9, 55, 54.9].map(faixaDoScore), ["otimo", "bom", "bom", "atencao", "atencao", "critico"], "faixas de cor do score");
}

/* ================================================================== regras do sistema: indicador ausente não ganha nota */
{
  const base = { pctMeta: 100, indOk: 4, indAvaliados: 4, qualidade: 100, turnover: 3, absenteismo: 2, lideranca: 5 };
  const c = componentesGerente(base);
  igual([c.vendas, c.indicadores, c.qualidade, c.pessoas, c.lideranca], [100, 100, 100, 100, 100], "tudo perfeito = 100 em cada critério");
  igual(scoreGerente(c).score, 100, "score 100");
  igual(scoreGerente(c).pesoUsado, 100, "peso 100");

  // sem visita de qualidade: peso redistribuído, sem nota inventada
  const semQ = componentesGerente({ ...base, qualidade: null });
  igual(semQ.qualidade, null, "sem visita: qualidade é null (não zero)");
  const rq = scoreGerente(semQ);
  igual([rq.pesoUsado, rq.criterios, rq.ausentes], [85, 4, ["qualidade"]], "sem visita: 85 de peso, 4 critérios, 'qualidade' ausente");
  igual(rq.score, 100, "sem visita e o resto perfeito = 100 (não 85)");
  const c2 = { vendas: 80, indicadores: 60, qualidade: null, pessoas: 100, lideranca: 40 };
  igual(scoreGerente(c2).score, (30 * 80 + 25 * 60 + 15 * 100 + 15 * 40) / 85, "redistribuição proporcional (= HTML)");

  // indicadores: sem meta/valor lançado, nenhum conta; não vira "0% na meta"
  igual(componentesGerente({ ...base, indOk: 0, indAvaliados: 0 }).indicadores, null, "sem indicador avaliado: critério ausente (HTML contava como 0%)");
  igual(componentesGerente({ ...base, indOk: 0, indAvaliados: 5 }).indicadores, 0, "5 avaliados, nenhum na meta = 0");
  // pessoas: só um dos dois
  igual(componentesGerente({ ...base, turnover: 3, absenteismo: null }).pessoas, 100, "só turnover: média só do que existe");
  igual(componentesGerente({ ...base, turnover: null, absenteismo: 6 }).pessoas, 0, "só absenteísmo ruim = 0");
  igual(componentesGerente({ ...base, turnover: null, absenteismo: null }).pessoas, null, "sem turnover nem absenteísmo: ausente");
  igual(componentesGerente({ ...base, lideranca: null }).lideranca, null, "sem nota de liderança: ausente");
  igual(componentesGerente({ ...base, pctMeta: null }).vendas, null, "sem meta/venda: ausente");
  igual(componentesGerente({ ...base, pctMeta: Number.NaN }).vendas, null, "NaN não vira nota");
  igual(componentesGerente({ ...base, pctMeta: 250 }).vendas, 100, "vendas limitada a 100");
  igual(componentesGerente({ ...base, lideranca: 7 }).lideranca, 100, "liderança limitada a 5");

  // peso mínimo: poucos critérios não viram "nota do gerente"
  const so2 = scoreGerente({ vendas: 90, indicadores: null, qualidade: null, pessoas: 90, lideranca: null });
  igual([so2.score, so2.pesoUsado], [null, 45], "vendas + pessoas (45%) não bastam para score");
  const so3 = scoreGerente({ vendas: 90, indicadores: 90, qualidade: null, pessoas: null, lideranca: null });
  igual([so3.score, so3.pesoUsado], [90, 55], "vendas + indicadores (55%) bastam");
  igual(PESO_MINIMO_SCORE, 50, "peso mínimo 50");
  const nada = scoreGerente({ vendas: null, indicadores: null, qualidade: null, pessoas: null, lideranca: null });
  igual([nada.score, nada.pesoUsado, nada.criterios], [null, 0, 0], "nenhum dado: sem score");
  const av = avaliarGerente({ lojaId: "x", gerente: null, pctMeta: null, indOk: 0, indAvaliados: 0, qualidade: null, qualidadeData: null, turnover: null, absenteismo: null, lideranca: null, potencial: null });
  igual([av.score, av.rec], [null, null], "sem dado: sem score e sem recomendação (nunca 'Plano de melhoria' por falta de dado)");

  // notaLinear
  igual([notaLinear(3, 3, 10), notaLinear(10, 3, 10), notaLinear(0, 3, 10), notaLinear(20, 3, 10), notaLinear(6.5, 3, 10)], [100, 0, 100, 0, 50], "notaLinear: 100 no bom, 0 no ruim, linear no meio");
}

/* ================================================================== formatação do score */
igual([formatarScore(null), formatarScore(undefined), formatarScore(Number.NaN)], ["—", "—", "—"], "score ausente vira traço");
igual([formatarScore(78.4), formatarScore(78.5), formatarScore(100), formatarScore(0)], ["78", "79", "100", "0"], "score sem casas, como no HTML");
igual([formatarScore(84.7), formatarScore(84.99), formatarScore(69.6), formatarScore(54.95)], ["84,7", "84,9", "69,6", "54,9"], "não arredonda para cima cruzando uma faixa (84,7 não vira 85)");
igual([formatarScore(85), formatarScore(70), formatarScore(55)], ["85", "70", "55"], "nos limites exatos mostra inteiro");

/* ================================================================== ranking */
{
  const lojaNome = (id) => id;
  const r = rankearGerentes(
    [
      { lojaId: "b", score: 80 },
      { lojaId: "a", score: 80 },
      { lojaId: "c", score: null },
      { lojaId: "d", score: 91 },
      { lojaId: "e", score: 12 },
    ],
    lojaNome,
  );
  igual(r.map((x) => [x.lojaId, x.posicao]), [["d", 1], ["a", 2], ["b", 3], ["e", 4], ["c", null]], "ranking: maior primeiro, empate pela loja, sem score por último e sem posição");
}

/* ================================================================== gerente da loja no mês */
{
  const g = (id, nome, adm, desl = null, loja = "L1", cargo = "gerente_loja") => ({ id, lojaId: loja, nome, cargo, dataAdmissao: adm, status: desl ? "desligado" : "ativo", dataDesligamento: desl, motivoDesligamento: null, observacoes: null, origem: "manual" });
  const lista = [g("a", "Ana", "2024-01-10", "2026-09-15"), g("b", "Bia", "2026-09-10"), g("c", "Cris", "2020-01-01", null, "L2"), g("d", "Dani", "2026-10-02", null, "L1", "chefe_cozinha")];
  igual(gerenteDaLojaNoMes(lista, "L1", "2026-08")?.id, "a", "agosto: Ana");
  igual(gerenteDaLojaNoMes(lista, "L1", "2026-09")?.id, "b", "setembro: duas no cargo — a admitida por último (Bia)");
  igual(gerenteDaLojaNoMes(lista, "L1", "2026-09", new Set(["a"]))?.id, "a", "setembro: quem tem nota de liderança no mês tem preferência");
  igual(gerenteDaLojaNoMes(lista, "L1", "2026-10")?.id, "b", "outubro: Bia");
  igual(gerenteDaLojaNoMes(lista, "L1", "2023-12"), null, "antes de qualquer gerente: ninguém");
  igual(gerenteDaLojaNoMes(lista, "L2", "2026-11")?.id, "c", "outra loja não se mistura");
  igual(gerenteDaLojaNoMes(lista, "L3", "2026-11"), null, "loja sem gerente");
  igual(gerenteDaLojaNoMes(lista, "L1", "2026-09-30".slice(0, 7))?.nome, "Bia", "chefe de cozinha não conta como gerente");
  // tempo de casa no mês avaliado
  igual(casaDoGerenteNoMes(g("x", "X", "2025-11-18"), "2026-05", "2026-11-18"), 6, "tempo de casa no fim do mês avaliado");
  igual(casaDoGerenteNoMes(g("x", "X", "2025-11-18"), "2026-11", "2026-11-18"), 12, "mês corrente conta até hoje");
  igual(casaDoGerenteNoMes(g("x", "X", "2026-11-18"), "2026-11", "2026-11-18"), 0, "admitido hoje: 0 mês");
}

/* ================================================================== critério por cargo (ajuste do consultor) e tempo mínimo */
{
  const colab = (adm, cargo = "auxiliar_cozinha") => ({ id: "x", lojaId: "L1", nome: "X", cargo, dataAdmissao: adm, status: "ativo", dataDesligamento: null, motivoDesligamento: null, observacoes: null, origem: "manual" });
  const ajustes = [{ cargo: "auxiliar_cozinha", tempoMinimoMeses: 6, criterio: "Seis meses e curso de segurança alimentar.", origem: "manual" }];
  const c = criterioDoCargo("auxiliar_cozinha", ajustes);
  igual([c.min, c.texto, c.ajustado], [6, "Seis meses e curso de segurança alimentar.", true], "ajuste do consultor vale no lugar do padrão");
  igual(criterioDoCargo("atendente", ajustes).ajustado, false, "outros cargos seguem o padrão");
  igual(criterioDoCargo("supervisor_regional", [{ cargo: "supervisor_regional", tempoMinimoMeses: null, criterio: "x", origem: "manual" }]).min, null, "sem tempo mínimo continua sem tempo mínimo");
  igual([tempoMinimoAtendido(colab("2026-05-31"), 6, "2026-11-30"), tempoMinimoAtendido(colab("2026-06-01"), 6, "2026-11-30"), tempoMinimoAtendido(colab("2020-01-01"), null, "2026-11-30")], [true, false, null], "tempo mínimo: 6 meses completos; sem exigência = n/a");
  const aval = (d, p) => ({ id: "n", lojaId: "L1", colaboradorId: "x", desempenho: d, potencial: p, observacoes: null, origem: "manual" });
  const pessoa = (adm, d, p) => ({ colaborador: colab(adm), avaliacao: d ? aval(d, p) : null });
  // com o padrão (12 meses) 8 meses não basta; com o ajuste (6) basta — e muda a lista de prontos
  const ps = [pessoa("2026-03-01", 3, 3)];
  igual(prontosParaSubir("auxiliar_cozinha", ps, [], "2026-11-30").length, 0, "padrão 12 meses: 8 meses não basta");
  igual(prontosParaSubir("auxiliar_cozinha", ps, ajustes, "2026-11-30").length, 1, "ajuste 6 meses: basta");
  igual(prontosParaSubir("auxiliar_cozinha", [pessoa("2020-01-01", 2, 3)], [], "2026-11-30").length, 1, "potencial alto + desempenho médio entra");
  igual(prontosParaSubir("auxiliar_cozinha", [pessoa("2020-01-01", 1, 3)], [], "2026-11-30").length, 0, "desempenho baixo não entra");
  igual(prontosParaSubir("auxiliar_cozinha", [pessoa("2020-01-01", 3, 2)], [], "2026-11-30").length, 0, "potencial médio não entra");
  igual(prontosParaSubir("auxiliar_cozinha", [pessoa("2020-01-01", null, null)], [], "2026-11-30").length, 0, "sem avaliação não entra");
  igual(prontosParaSubir("supervisor_regional", ps, [], "2026-11-30").length, 0, "supervisor regional não tem 'prontos'");
  const m = mapaSucessao(["L1"], [{ colaborador: colab("2020-01-01", "chefe_cozinha"), avaliacao: aval(2, 2) }, { colaborador: { ...colab("2024-01-01"), id: "y", nome: "Y" }, avaliacao: aval(3, 3) }], ajustes, "2026-11-30");
  const chefe = m.find((l) => l.cargo === "chefe_cozinha");
  igual([chefe.titulares.length, chefe.candidatos.length, chefe.candidatos[0].tempoMinimo, chefe.risco.rotulo], [1, 1, true, "Baixo"], "mapa: chefe com auxiliar pronto agora = risco baixo");
  igual(m.find((l) => l.cargo === "gerente_loja").risco.rotulo, "Sem sucessor", "mapa: gerente sem chefe/líder candidato = sem sucessor");
  // quem não foi avaliado nunca é sucessor
  const m2 = mapaSucessao(["L1"], [{ colaborador: colab("2020-01-01"), avaliacao: null }], [], "2026-11-30");
  igual(m2.every((l) => l.candidatos.length === 0), true, "sem avaliação não é candidato");
}

/* ================================================================== nine box: quem não foi avaliado, quem não está ativo */
{
  const colab = (id, nome, status = "ativo", cargo = "atendente", loja = "L1") => ({ id, lojaId: loja, nome, cargo, dataAdmissao: "2025-01-01", status, dataDesligamento: status === "ativo" ? null : "2026-10-10", motivoDesligamento: null, observacoes: null, origem: "manual" });
  const aval = (colaboradorId, d, p, loja = "L1") => ({ id: `n-${colaboradorId}`, lojaId: loja, colaboradorId, desempenho: d, potencial: p, observacoes: null, origem: "manual" });
  const colabs = [colab("1", "Ana"), colab("2", "Beto"), colab("3", "Caio", "desligado"), colab("4", "Duda", "ativo", "chefe_cozinha"), colab("5", "Eli", "ativo", "atendente", "L2")];
  const avs = [aval("1", 3, 3), aval("3", 3, 3), aval("5", 1, 1, "L2")];
  const ps = juntarNineBox(colabs, avs, { lojaIds: ["L1"] }, (x) => x);
  igual(ps.map((p) => p.colaborador.nome), ["Duda", "Ana", "Beto"], "só ativos da loja; ordem cargo (chefe antes de atendente), nome");
  const mt = matrizNineBox(ps);
  igual([mt.avaliados, mt.pendentes], [1, 2], "1 avaliado e 2 pendentes (sem nota inventada)");
  igual(mt.celulas.find((c) => c.chave === "3-3").pessoas.map((p) => p.colaborador.nome), ["Ana"], "Ana no quadrante Talento");
  igual(mt.celulas.reduce((a, c) => a + c.pessoas.length, 0), 1, "pendentes não aparecem em nenhuma célula");
  igual(contarTalentos(ps), 1, "talentos = 1 (o desligado não conta)");
  igual(juntarNineBox(colabs, avs, { lojaIds: ["L1"], cargo: "atendente" }, (x) => x).map((p) => p.colaborador.nome), ["Ana", "Beto"], "filtro por cargo");
  igual(juntarNineBox(colabs, avs, { lojaIds: [] }, (x) => x).length, 0, "nenhuma loja visível = ninguém (não vaza)");
}

/* ================================================================== histórico em português */
{
  igual(descreverMudancaNineBox({ acao: "insert", antes: null, depois: { desempenho: 3, potencial: 3 } }), "Avaliou: desempenho alto, potencial alto (Talento)", "primeira avaliação");
  igual(descreverMudancaNineBox({ acao: "update", antes: { desempenho: 2, potencial: 3 }, depois: { desempenho: 3, potencial: 3 } }), "Desempenho Médio → Alto (Alto potencial → Talento)", "mudou o desempenho");
  igual(descreverMudancaNineBox({ acao: "update", antes: { desempenho: 2, potencial: 2 }, depois: { desempenho: 1, potencial: 3 } }), "Desempenho Médio → Baixo · Potencial Médio → Alto (Mantenedor → Enigma)", "mudou os dois");
  igual(descreverMudancaNineBox({ acao: "update", antes: { desempenho: 2, potencial: 2 }, depois: { desempenho: 2, potencial: 2 } }), "Observação alterada", "só a observação");
  igual(descreverMudancaNineBox({ acao: "delete", antes: { desempenho: 1, potencial: 1 }, depois: null }), "Removeu a avaliação (era desempenho baixo, potencial baixo)", "remoção");
  igual(descreverMudancaNineBox({ acao: "update", antes: null, depois: null }), "Alteração", "instantâneo ilegível não quebra");
  igual([lerNotasNineBox({ desempenho: 2, potencial: 3, x: 1 }), lerNotasNineBox({ desempenho: 4, potencial: 1 }), lerNotasNineBox(null), lerNotasNineBox("x"), lerNotasNineBox({ desempenho: "3", potencial: "1" })], [{ desempenho: 2, potencial: 3 }, null, null, null, { desempenho: 3, potencial: 1 }], "leitura defensiva do instantâneo");
}

/* ================================================================== CSV */
{
  const pessoas = juntarNineBox(COLABS, AVALS, { lojaIds: TODAS }, nomeLoja);
  const csv = linhasCsvNineBox(pessoas, nomeLoja);
  igual(csv[0], ["Nome", "Cargo", "Loja", "Admissão", "Desempenho", "Potencial", "Quadrante"], "colunas do CSV = HTML");
  igual(csv.length, 83, "cabeçalho + 82 pessoas");
  const p0 = pessoas[0];
  igual(csv[1], [p0.colaborador.nome, rotuloCargoCarreira(p0.colaborador.cargo), nomeLoja(p0.colaborador.lojaId), `${p0.colaborador.dataAdmissao.slice(8, 10)}/${p0.colaborador.dataAdmissao.slice(5, 7)}/${p0.colaborador.dataAdmissao.slice(0, 4)}`, HTML_LV[p0.avaliacao.desempenho], HTML_LV[p0.avaliacao.potencial], HTML_NB[`${p0.avaliacao.desempenho}-${p0.avaliacao.potencial}`][0]], "linha do CSV");
  const semNota = linhasCsvNineBox([{ colaborador: COLABS[0], avaliacao: null }], nomeLoja);
  igual([semNota[1][4], semNota[1][5], semNota[1][6]], ["", "", "Sem avaliação"], "pendente sai em branco (nunca 'Médio')");
  const gs = linhasCsvGerentes(
    [
      { posicao: 1, lojaId: "a", gerente: { nome: "Gê" }, comp: { vendas: 90.04, indicadores: 100, qualidade: null, pessoas: 50.55, lideranca: 92 }, lideranca: 4.6, score: 85.66, criterios: 4, potencial: 3, rec: { rotulo: "Pronto para promoção" } },
      { posicao: null, lojaId: "b", gerente: null, comp: { vendas: null, indicadores: null, qualidade: null, pessoas: null, lideranca: null }, lideranca: null, score: null, criterios: 0, potencial: null, rec: null },
    ],
    (x) => x,
    "outubro de 2026",
  );
  igual(gs[0].length, 13, "13 colunas no CSV de gerentes");
  igual(gs[1], ["outubro de 2026", 1, "Gê", "a", 90, 100, "", 50.6, 4.6, 85.7, "4 de 5", "avaliado", "Pronto para promoção"], "CSV de gerentes: arredonda a uma casa, ausente em branco");
  igual(gs[2], ["outubro de 2026", "", "Sem gerente cadastrado", "b", "", "", "", "", "", "", "0 de 5", "sem avaliação", "Dados insuficientes"], "CSV: gerente sem dado");
  const mapa = mapaSucessao(TODAS, pessoas, [], HOJE);
  const cs = linhasCsvSucessao(mapa, nomeLoja);
  igual(cs.length, 1 + TODAS.length * 3, "CSV da sucessão: uma linha por loja e cargo-chave");
  igual(cs[0].length, 10, "10 colunas");
}

/* ================================================================== mapeadores (linhas do banco, mesmo sujas) */
{
  const nb = mapNineBox({ id: "i", loja_id: "L", colaborador_id: "c", desempenho: 2, potencial: 3, observacoes: "  bom  ", origem: "manual" });
  igual(nb, { id: "i", lojaId: "L", colaboradorId: "c", desempenho: 2, potencial: 3, observacoes: "bom", origem: "manual" }, "mapNineBox");
  igual(mapNineBox({ id: "i", loja_id: "L", colaborador_id: "c", desempenho: "3", potencial: 1, observacoes: "", origem: "exemplo" }).desempenho, 3, "numérico em texto");
  igual(mapNineBox({ id: "i", loja_id: "L", colaborador_id: "c", desempenho: 9, potencial: 1, observacoes: null, origem: "x" }), null, "nível inválido: linha descartada");
  igual(mapNineBox({ id: "i", loja_id: "L", colaborador_id: null, desempenho: 1, potencial: 1 }), null, "sem colaborador: descartada");
  const ld = mapLideranca({ id: "i", loja_id: "L", colaborador_id: "c", mes: "2026-10-01", nota: "4.6", observacoes: null, origem: "exemplo" });
  igual(ld, { id: "i", lojaId: "L", colaboradorId: "c", mes: "2026-10-01", nota: 4.6, observacoes: null, origem: "exemplo" }, "mapLideranca");
  igual(mapLideranca({ id: "i", loja_id: "L", colaborador_id: "c", mes: "2026-10-01", nota: 7 }), null, "nota fora de 0–5: descartada");
  igual(mapLideranca({ id: "i", loja_id: "L", colaborador_id: "c", mes: "x", nota: 3 }), null, "mês inválido: descartada");
  const cr = mapCriterioCargo({ cargo: "atendente", tempo_minimo_meses: 6, criterio: " texto ", origem: "manual" });
  igual(cr, { cargo: "atendente", tempoMinimoMeses: 6, criterio: "texto", origem: "manual" }, "mapCriterioCargo");
  igual(mapCriterioCargo({ cargo: "atendente", tempo_minimo_meses: null, criterio: "t" }).tempoMinimoMeses, null, "sem tempo mínimo");
  igual(mapCriterioCargo({ cargo: "ceo", tempo_minimo_meses: 1, criterio: "t" }), null, "cargo desconhecido: descartado");
}

/* ================================================================== validação dos formulários */
{
  const L = "11111111-1111-4111-8111-111111111111";
  const C = "22222222-2222-4222-8222-222222222222";
  const ok = (s, v) => s.safeParse(v).success;
  assert(ok(nineBoxSchema, { lojaId: L, colaboradorId: C, desempenho: 3, potencial: 1, observacoes: "" }), "nine box válido");
  assert(!ok(nineBoxSchema, { lojaId: L, colaboradorId: C, desempenho: 4, potencial: 1 }), "desempenho 4 recusado");
  assert(!ok(nineBoxSchema, { lojaId: L, colaboradorId: C, desempenho: 0, potencial: 1 }), "desempenho 0 recusado");
  assert(!ok(nineBoxSchema, { lojaId: L, colaboradorId: C, desempenho: 2.5, potencial: 1 }), "desempenho fracionado recusado");
  assert(!ok(nineBoxSchema, { lojaId: L, colaboradorId: C, potencial: 1 }), "desempenho ausente recusado (não vira médio)");
  assert(!ok(nineBoxSchema, { lojaId: L, colaboradorId: C, desempenho: "3", potencial: 1 }), "desempenho em texto recusado");
  assert(!ok(nineBoxSchema, { lojaId: L, colaboradorId: "x", desempenho: 1, potencial: 1 }), "colaborador inválido recusado");
  assert(!ok(nineBoxSchema, { lojaId: L, colaboradorId: C, desempenho: 1, potencial: 1, observacoes: "x".repeat(501) }), "observação > 500 recusada");
  igual(nineBoxSchema.parse({ lojaId: L, colaboradorId: C, desempenho: 1, potencial: 2, observacoes: "   " }).observacoes, null, "observação em branco vira null");
  assert(ok(liderancaSchema, { lojaId: L, colaboradorId: C, mes: "2026-10", nota: 4.5, observacoes: "" }), "liderança válida");
  assert(ok(liderancaSchema, { lojaId: L, colaboradorId: C, mes: "2026-10", nota: 0 }), "nota 0 é válida");
  assert(ok(liderancaSchema, { lojaId: L, colaboradorId: C, mes: "2026-10", nota: 5 }), "nota 5 é válida");
  assert(!ok(liderancaSchema, { lojaId: L, colaboradorId: C, mes: "2026-10", nota: 5.1 }), "nota > 5 recusada");
  assert(!ok(liderancaSchema, { lojaId: L, colaboradorId: C, mes: "2026-10", nota: -1 }), "nota negativa recusada");
  assert(!ok(liderancaSchema, { lojaId: L, colaboradorId: C, mes: "2026-10" }), "nota ausente recusada (não vira zero)");
  assert(!ok(liderancaSchema, { lojaId: L, colaboradorId: C, mes: "2026-13", nota: 3 }), "mês 13 recusado");
  assert(!ok(liderancaSchema, { lojaId: L, colaboradorId: C, mes: "2026-10", nota: 4.55 }), "mais de uma casa recusada");
  assert(ok(criterioCargoSchema, { cargo: "atendente", tempoMinimoMeses: 6, criterio: "ok" }), "critério válido");
  assert(ok(criterioCargoSchema, { cargo: "supervisor_regional", tempoMinimoMeses: null, criterio: "ok" }), "sem tempo mínimo é válido");
  assert(!ok(criterioCargoSchema, { cargo: "ceo", tempoMinimoMeses: 6, criterio: "ok" }), "cargo desconhecido recusado");
  assert(!ok(criterioCargoSchema, { cargo: "atendente", tempoMinimoMeses: 121, criterio: "ok" }), "tempo mínimo > 120 recusado");
  assert(!ok(criterioCargoSchema, { cargo: "atendente", tempoMinimoMeses: -1, criterio: "ok" }), "tempo mínimo negativo recusado");
  assert(!ok(criterioCargoSchema, { cargo: "atendente", tempoMinimoMeses: 1.5, criterio: "ok" }), "tempo mínimo fracionado recusado");
  assert(!ok(criterioCargoSchema, { cargo: "atendente", tempoMinimoMeses: 6, criterio: "   " }), "critério vazio recusado");
  assert(!ok(criterioCargoSchema, { cargo: "atendente", tempoMinimoMeses: 6, criterio: "x".repeat(501) }), "critério > 500 recusado");
  // nota digitada
  igual(["4,5", "4.5", " 3 ", "0", "5"].map(lerNotaLideranca), [4.5, 4.5, 3, 0, 5], "lê a nota digitada (vírgula ou ponto)");
  igual(["", "  ", "abc", "-1", "4,5,6", "1e3"].map(lerNotaLideranca), [null, null, null, null, null, null], "vazio ou lixo = null (nunca zero)");
  // mensagens de erro em português com o nome do campo
  for (const [entrada, trecho] of [[{ lojaId: L, colaboradorId: C, desempenho: 7, potencial: 1 }, 'Confira o campo "desempenho"'], [{ lojaId: L, colaboradorId: C, desempenho: 1 }, 'Confira o campo "potencial"']]) {
    try {
      lerEntrada(nineBoxSchema, entrada);
      assert(false, "devia recusar");
    } catch (e) {
      assert(String(e.message).includes(trecho), `mensagem "${e.message}" cita ${trecho}`);
    }
  }
  try {
    lerEntrada(liderancaSchema, { lojaId: L, colaboradorId: C, mes: "2026-10", nota: 9 });
    assert(false, "devia recusar");
  } catch (e) {
    assert(String(e.message).includes('"nota de liderança"') && String(e.message).includes("0 a 5"), `mensagem da nota: ${e.message}`);
  }
}

/* ================================================================== erros do banco em português */
{
  const e = (code, message) => ({ code, message });
  igual(erroRh(e("23505", 'duplicate key value violates unique constraint "rede_rh_nb_uk"')), "Este colaborador já tem avaliação no Nine Box; atualize a existente.", "nine box duplicado");
  igual(erroRh(e("23505", 'duplicate key value violates unique constraint "rede_rh_lid_uk"')), "Já existe nota de liderança deste gerente neste mês; edite a existente.", "liderança duplicada");
  igual(erroRh(e("23505", 'duplicate key value violates unique constraint "rede_rh_crit_uk"')), "Este cargo já tem critério ajustado; edite o existente.", "critério duplicado");
  igual(erroRh(e("23503", 'violates foreign key constraint "rede_rh_nb_colab_fk"')), "Colaborador não encontrado nesta loja.", "FK do colaborador");
  igual(erroRh(e("23514", 'violates check constraint "rede_rh_lid_nota_chk"')), "A nota de liderança vai de 0 a 5.", "nota fora da faixa");
  igual(erroRh(e("23514", 'violates check constraint "rede_rh_crit_tempo_chk"')), "O tempo mínimo vai de 0 a 120 meses.", "tempo mínimo fora da faixa");
  igual(erroRh(e("23514", "Só colaborador ativo pode ser avaliado no Nine Box.")), null, "mensagem de gatilho passa pela tradução geral");
}

/* ================================================================== menu e permissões */
{
  const rh = MENU_REDE.find((i) => i.href === "/rh");
  assert(rh != null, "item RH no menu");
  const mods = modulosDoItem(rh);
  for (const m of ["rh_quadro", "rh_movimentos", "rh_ocorrencias", "avaliacao_gerentes", "nine_box", "sucessao"]) assert(mods.includes(m), `menu RH cobre ${m}`);
}

console.log(`rede-talentos-tests: ${pass} ok${fail ? `, ${fail} FALHARAM` : ""}`);
process.exit(fail ? 1 : 0);
