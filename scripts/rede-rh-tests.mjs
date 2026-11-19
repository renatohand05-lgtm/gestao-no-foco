#!/usr/bin/env node
/**
 * Testes de RH da rede de lojas (regras puras, sem banco): quadro de pessoal, turnover, absenteísmo, ocorrências.
 * 1) Paridade com o painel original: os dados do HTML (scripts/fixtures/rede-html-rh.json — 82 pessoas, quadro,
 *    24 lançamentos mensais) e as contas do HTML (turnOf, absOf, linha "Rede", semáforo, KPIs do quadro, mesesCasa,
 *    alertas de ocorrências) foram transcritas abaixo e rodam sobre os mesmos dados; o app precisa bater.
 *    As divergências deliberadas estão testadas como divergências (e documentadas no relatório).
 * 2) Regras do sistema: fórmulas sem divisão por zero, "Rede" soma contagens antes de calcular, tempo de casa,
 *    sugestão do lançamento mensal, janela de 6 meses, importação por lista, validações, mapeadores com dado sujo.
 * Node com --experimental-strip-types.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { lerEntrada } from "../lib/rede/acao-comum.ts";
import { MENU_REDE, modulosDoItem } from "../lib/rede/menu.ts";
import { lerPerfil, podeVerAlgum } from "../lib/rede/permissoes.ts";
import { mapColaborador, mapMes, mapOcorrencia, mapPrevisto } from "../lib/rede/mapeadores-rh.ts";
import {
  CARGOS_RH,
  DIAS_PREVISTOS_POR_PESSOA,
  LIMITE_IMPORTACAO_RH,
  LIMITES_ABSENTEISMO,
  LIMITES_TURNOVER,
  STATUS_OCORRENCIA,
  TIPOS_OCORRENCIA,
  absenteismoPct,
  alertasDePessoas,
  erroRh,
  inicioDaJanela,
  indicadoresRh,
  kpisOcorrencias,
  lerCargo,
  lerImportacaoColaboradores,
  linhasCsvMovimentos,
  linhasCsvOcorrencias,
  linhasCsvQuadro,
  matrizMensal,
  mesesDeCasa,
  montarQuadro,
  ocorrenciasRecentes,
  ordenarOcorrencias,
  resumoPorLojaTipo,
  rotuloCargo,
  rotuloStatusOcorrencia,
  rotuloTipo,
  semaforo,
  somarMeses,
  statusQuadro,
  sugerirMes,
  tempoDeCasaPorCargo,
  tempoMedioDeCasa,
  textoTempoDeCasa,
  tomDoTipo,
  turnoverPct,
  ultimoMesRh,
} from "../lib/rede/rh.ts";
import { colaboradorSchema, desligamentoSchema, importacaoRhSchema, mesRhSchema, ocorrenciaSchema, previstoSchema } from "../lib/rede/schemas-rh.ts";

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
function lanca(fn, trecho, msg) {
  try {
    fn();
    assert(false, `${msg} — não lançou erro`);
  } catch (e) {
    assert(String(e?.message ?? e).includes(trecho), `${msg} — mensagem "${e?.message}" não contém "${trecho}"`);
  }
}

const aqui = dirname(fileURLToPath(import.meta.url));
const HTML = JSON.parse(readFileSync(join(aqui, "fixtures", "rede-html-rh.json"), "utf8"));
const LOJAS_HTML = Object.keys(HTML.quadro);
const NOMES_CARGO_HTML = Object.keys(HTML.cargos);

/* ================================================================== paridade: catálogos */
igual(CARGOS_RH.map((c) => c.nome), NOMES_CARGO_HTML, "5 cargos = os do HTML, mesma ordem e texto");
igual(CARGOS_RH.map((c) => c.k), NOMES_CARGO_HTML.map((n) => HTML.cargos[n]), "chaves dos cargos");
igual(TIPOS_OCORRENCIA.map((t) => t.nome), ["Advertência verbal", "Advertência escrita", "Suspensão", "Falta injustificada", "Atraso", "Atestado médico", "Feedback", "Elogio", "Treinamento", "Desligamento"], "10 tipos de ocorrência = os do HTML");
const OC_COR = { "Advertência verbal": "warn", "Advertência escrita": "bad", "Suspensão": "bad", "Falta injustificada": "bad", "Atraso": "warn", "Atestado médico": "neu", "Feedback": "neu", "Elogio": "ok", "Treinamento": "ok", "Desligamento": "bad" };
igual(TIPOS_OCORRENCIA.map((t) => t.tom), TIPOS_OCORRENCIA.map((t) => OC_COR[t.nome]), "cor de cada tipo = OC_COR do HTML");
igual(STATUS_OCORRENCIA.map((s) => s.nome), ["Registrada", "Aguardando assinatura", "Assinada", "Recusou assinar", "Concluída"], "status das ocorrências (o HTML acrescenta '(com testemunhas)' — as testemunhas vão na observação)");
igual([LIMITES_TURNOVER, LIMITES_ABSENTEISMO, DIAS_PREVISTOS_POR_PESSOA], [[4, 7], [2.5, 4], 26], "limites do semáforo e dias por pessoa = HTML");
igual([rotuloCargo("chefe_cozinha"), rotuloTipo("falta_injustificada"), rotuloStatusOcorrencia("aguardando_assinatura"), tomDoTipo("elogio")], ["Chefe de cozinha", "Falta injustificada", "Aguardando assinatura", "ok"], "rótulos e tom");

/* ================================================================== paridade: lançamentos mensais */
// turnOf / absOf / rede / tbl (HTML L1085–1100), transcritos.
const turnOf = (r) => (r.admissoes + r.desligamentos) / 2 / r.headcount * 100;
const absOf = (r) => r.faltas / r.diasPrevistos * 100;
const MES_RH = HTML.registros.map((r, i) => ({ id: `m${i}`, lojaId: r.loja, mes: `${r.mes}-01`, headcount: r.headcount, admissoes: r.admissoes, desligamentos: r.desligamentos, faltas: r.faltas, diasPrevistos: r.diasPrevistos, origem: "exemplo" }));
igual(MES_RH.length, 24, "24 lançamentos mensais no HTML");

for (const r of MES_RH) {
  const h = { headcount: r.headcount, admissoes: r.admissoes, desligamentos: r.desligamentos, faltas: r.faltas, diasPrevistos: r.diasPrevistos };
  assert(perto(turnoverPct(r), turnOf(h)), `turnover ${r.lojaId} ${r.mes} = fórmula do HTML`);
  assert(perto(absenteismoPct(r), absOf(h)), `absenteísmo ${r.lojaId} ${r.mes} = fórmula do HTML`);
}

{
  // Matriz do HTML: lojas com lançamento (ids), meses ordenados, linha "Rede" somando as contagens, média simples.
  const reg = HTML.registros;
  const meses = [...new Set(reg.map((r) => r.mes))].sort();
  const cell = (id, m, f) => {
    const r = reg.find((x) => x.loja === id && x.mes === m);
    return r ? f(r) : null;
  };
  const rede = (m, f) => {
    const rs = reg.filter((x) => x.mes === m && LOJAS_HTML.includes(x.loja));
    if (!rs.length) return null;
    const s = (k) => rs.reduce((a, r) => a + r[k], 0);
    return f({ headcount: s("headcount"), admissoes: s("admissoes"), desligamentos: s("desligamentos"), faltas: s("faltas"), diasPrevistos: s("diasPrevistos") });
  };
  const media = (v) => {
    const ok = v.filter((x) => x != null);
    return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
  };
  const comDado = LOJAS_HTML.filter((id) => reg.some((r) => r.loja === id));
  for (const [nome, f, g] of [["turnover", turnOf, turnoverPct], ["absenteísmo", absOf, absenteismoPct]]) {
    const m = matrizMensal(MES_RH, LOJAS_HTML, g);
    igual(m.meses.map((x) => x.slice(0, 7)), meses, `${nome}: meses da matriz = HTML`);
    igual(m.linhas.map((l) => l.lojaId), [...comDado, null], `${nome}: lojas com lançamento + Rede`);
    for (const l of m.linhas) {
      const esperado = meses.map((mm) => (l.lojaId == null ? rede(mm, f) : cell(l.lojaId, mm, f)));
      assert(l.valores.every((v, i) => (v == null && esperado[i] == null) || perto(v, esperado[i])), `${nome}: valores de ${l.lojaId ?? "Rede"} = HTML`);
      assert(perto(l.media, media(esperado)), `${nome}: média de ${l.lojaId ?? "Rede"} = HTML`);
    }
  }
  // O semáforo do HTML: v<=lim[0] ok · v<=lim[1] warn · senão bad.
  for (const r of MES_RH) {
    const t = turnOf({ headcount: r.headcount, admissoes: r.admissoes, desligamentos: r.desligamentos });
    const a = absOf({ faltas: r.faltas, diasPrevistos: r.diasPrevistos });
    const sem = (v, lim) => (v <= lim[0] ? "ok" : v <= lim[1] ? "warn" : "bad");
    igual(semaforo(t, LIMITES_TURNOVER), sem(t, [4, 7]), `semáforo do turnover ${r.lojaId} ${r.mes}`);
    igual(semaforo(a, LIMITES_ABSENTEISMO), sem(a, [2.5, 4]), `semáforo do absenteísmo ${r.lojaId} ${r.mes}`);
  }
  // Último mês, como no KPI do quadro (HTML L986–990).
  const ult = ultimoMesRh(MES_RH, LOJAS_HTML);
  const lm = [...new Set(reg.map((r) => r.mes))].sort().at(-1);
  const lr = reg.filter((r) => r.mes === lm);
  const sm = (k) => lr.reduce((a, r) => a + r[k], 0);
  igual(ult.mes.slice(0, 7), lm, "último mês com lançamento");
  assert(perto(ult.turnover, (sm("admissoes") + sm("desligamentos")) / 2 / sm("headcount") * 100), "KPI turnover = HTML");
  assert(perto(ult.absenteismo, sm("faltas") / sm("diasPrevistos") * 100), "KPI absenteísmo = HTML");
  igual(ult.lojas, lr.length, "lojas no último mês");
  // Seleção de uma loja só: o KPI usa só aquela loja.
  const so = ultimoMesRh(MES_RH, ["brooklyn"]);
  const lb = reg.filter((r) => r.loja === "brooklyn").at(-1);
  assert(perto(so.turnover, turnOf(lb)) && perto(so.absenteismo, absOf(lb)), "KPI de uma loja só");
  igual(ultimoMesRh(MES_RH, []), null, "sem lojas, sem último mês");
  igual(ultimoMesRh([], LOJAS_HTML), null, "sem lançamentos, sem último mês");
}

/* ================================================================== paridade: quadro e tempo de casa */
const COLABS = HTML.pessoas.map((p) => ({ id: String(p.id), lojaId: p.loja, nome: p.nome, cargo: HTML.cargos[p.cargo], dataAdmissao: p.admissao, status: "ativo", dataDesligamento: null, motivoDesligamento: null, observacoes: null, origem: "exemplo" }));
const PREVISTOS = LOJAS_HTML.flatMap((l) => NOMES_CARGO_HTML.map((c) => ({ lojaId: l, cargo: HTML.cargos[c], previsto: HTML.quadro[l][c].previsto, origem: "exemplo" })));
igual(COLABS.length, 82, "82 pessoas no HTML");

{
  const q = montarQuadro(COLABS, PREVISTOS, LOJAS_HTML);
  let prev = 0, at = 0;
  LOJAS_HTML.forEach((id) => NOMES_CARGO_HTML.forEach((c) => { prev += HTML.quadro[id][c].previsto; at += HTML.quadro[id][c].ativo; }));
  igual([q.total.ativo, q.total.previsto], [at, prev], "KPIs do quadro: ativos e previstos = HTML");
  igual(q.vagas, prev - at, "vagas abertas = previstos − ativos (HTML)");
  igual(q.excedente, 0, "sem excedente nos dados do HTML");
  for (const l of q.lojas) {
    for (const c of NOMES_CARGO_HTML) {
      const k = HTML.cargos[c];
      igual([l.porCargo[k].ativo, l.porCargo[k].previsto], [HTML.quadro[l.lojaId][c].ativo, HTML.quadro[l.lojaId][c].previsto], `quadro ${l.lojaId}/${c}: ativos (do cadastro) e previstos = HTML`);
      const { ativo: a, previsto: p } = HTML.quadro[l.lojaId][c];
      igual(statusQuadro(a, p), a >= p ? "ok" : a >= p * 0.8 ? "warn" : "bad", `semáforo do quadro ${l.lojaId}/${c}`);
    }
  }
  // O total por cargo da tabela (coluna "Total").
  for (const c of NOMES_CARGO_HTML) {
    let ta = 0, tp = 0;
    LOJAS_HTML.forEach((id) => { ta += HTML.quadro[id][c].ativo; tp += HTML.quadro[id][c].previsto; });
    igual([q.total.porCargo[HTML.cargos[c]].ativo, q.total.porCargo[HTML.cargos[c]].previsto], [ta, tp], `total do cargo ${c}`);
  }
  // Seleção de uma loja só.
  const um = montarQuadro(COLABS, PREVISTOS, ["tatuape"]);
  igual([um.total.ativo, um.total.previsto, um.vagas], [10, 13, 3], "quadro de uma loja só (Tatuapé: 10 de 13, 3 vagas)");
  // Excedente e desligado não contam como ativo.
  const mais = montarQuadro([...COLABS, { ...COLABS[0], id: "x1", nome: "Extra" }, { ...COLABS[0], id: "x2", nome: "Saiu", status: "desligado", dataDesligamento: "2026-11-01" }], PREVISTOS, ["brooklyn"]);
  igual([mais.total.ativo, mais.excedente], [25, 1], "ativo acima do previsto = excedente; desligado não conta");
  igual(statusQuadro(0, 0), "ok", "quadro 0/0 é verde");
}

// mesesCasa / casaTxt do HTML (L961–962), com "hoje" fixo; o app conta meses completos.
{
  const HOJE = "2026-11-19";
  const htmlMeses = (adm, hoje) => {
    const a = new Date(adm + "T12:00"), h = new Date(hoje + "T12:00");
    return Math.max(0, (h.getFullYear() - a.getFullYear()) * 12 + h.getMonth() - a.getMonth());
  };
  let difere = 0;
  for (const p of HTML.pessoas) {
    const hm = htmlMeses(p.admissao, HOJE);
    const m = mesesDeCasa(p.admissao, HOJE);
    const diaAdm = Number(p.admissao.slice(8, 10));
    const esperado = diaAdm > 19 ? hm - 1 : hm;
    assert(m === Math.max(0, esperado), `tempo de casa de ${p.nome}: meses completos (${m}) vs diferença de meses do HTML (${hm})`);
    if (m !== hm) difere++;
  }
  assert(difere > 0, "a divergência (meses completos) aparece em algum caso real do HTML");
  const ativos = COLABS;
  const media = tempoMedioDeCasa(ativos, HOJE);
  assert(perto(media, ativos.reduce((a, p) => a + mesesDeCasa(p.dataAdmissao, HOJE), 0) / ativos.length), "tempo médio de casa = média dos meses completos");
  igual(tempoMedioDeCasa([], HOJE), null, "sem ativos, sem média");
  const grupos = tempoDeCasaPorCargo(ativos, HOJE);
  igual(grupos.map((g) => g.cargo), CARGOS_RH.map((c) => c.k), "tempo de casa: só cargos com gente, na ordem do HTML");
  for (const g of grupos) {
    const m = ativos.filter((p) => p.cargo === g.cargo).map((p) => mesesDeCasa(p.dataAdmissao, HOJE));
    igual([g.pessoas, g.ate6, g.de6a12, g.mais12], [m.length, m.filter((x) => x < 6).length, m.filter((x) => x >= 6 && x < 12).length, m.filter((x) => x >= 12).length], `faixas de tempo de casa ${g.cargo}`);
    assert(g.ate6 + g.de6a12 + g.mais12 === g.pessoas, `faixas somam as pessoas (${g.cargo})`);
    igual(g.mediaMeses, Math.round(m.reduce((a, b) => a + b, 0) / m.length), `média de casa ${g.cargo}`);
  }
  igual(tempoDeCasaPorCargo([], HOJE), [], "sem ativos, sem linhas");
}

// casaTxt do HTML.
{
  const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const casaTxt = (m) => (m < 12 ? `${m} ${m === 1 ? "mês" : "meses"}` : `${nf1.format(m / 12).replace(",0", "")} ${m < 24 ? "ano" : "anos"}`);
  for (let m = 0; m <= 120; m++) igual(textoTempoDeCasa(m), casaTxt(m), `texto de tempo de casa para ${m} meses`);
  igual([textoTempoDeCasa(0), textoTempoDeCasa(1), textoTempoDeCasa(12), textoTempoDeCasa(18), textoTempoDeCasa(24), textoTempoDeCasa(38)], ["0 meses", "1 mês", "1 ano", "1,5 ano", "2 anos", "3,2 anos"], "exemplos do texto de tempo de casa");
}

/* ================================================================== regras: fórmulas e "Rede" */
igual([turnoverPct({ headcount: 0, admissoes: 3, desligamentos: 3 }), absenteismoPct({ faltas: 4, diasPrevistos: 0 })], [null, null], "sem headcount/dias previstos: null (nunca divisão por zero)");
igual(turnoverPct({ headcount: 20, admissoes: 2, desligamentos: 0 }), 5, "turnover = ((2+0)/2)/20 = 5%");
igual(absenteismoPct({ faltas: 13, diasPrevistos: 650 }), 2, "absenteísmo = 13/650 = 2%");
igual([semaforo(4, LIMITES_TURNOVER), semaforo(4.0000000001, LIMITES_TURNOVER), semaforo(4.01, LIMITES_TURNOVER), semaforo(7, LIMITES_TURNOVER), semaforo(7.01, LIMITES_TURNOVER)], ["ok", "ok", "warn", "warn", "bad"], "semáforo nas bordas (4 e 7 inclusivos, tolerância de ponto flutuante)");
igual([semaforo(2.5, LIMITES_ABSENTEISMO), semaforo(2.51, LIMITES_ABSENTEISMO), semaforo(4, LIMITES_ABSENTEISMO), semaforo(4.1, LIMITES_ABSENTEISMO)], ["ok", "warn", "warn", "bad"], "semáforo do absenteísmo nas bordas");
{
  const a = { id: "1", lojaId: "a", mes: "2026-01-01", headcount: 10, admissoes: 1, desligamentos: 1, faltas: 5, diasPrevistos: 260, origem: "manual" };
  const b = { id: "2", lojaId: "b", mes: "2026-01-01", headcount: 30, admissoes: 0, desligamentos: 0, faltas: 0, diasPrevistos: 780, origem: "manual" };
  const b2 = { id: "3", lojaId: "b", mes: "2026-02-01", headcount: 30, admissoes: 3, desligamentos: 3, faltas: 39, diasPrevistos: 780, origem: "manual" };
  igual(somarMeses([a, b]), { headcount: 40, admissoes: 1, desligamentos: 1, faltas: 5, diasPrevistos: 1040 }, "somar meses soma as contagens");
  const m = matrizMensal([a, b, b2], ["a", "b", "c"], turnoverPct);
  igual(m.meses, ["2026-01-01", "2026-02-01"], "meses ordenados");
  igual(m.linhas.map((l) => l.lojaId), ["a", "b", null], "loja sem lançamento (c) fica de fora; Rede por último");
  igual(m.linhas[0].valores, [10, null], "loja a: só janeiro");
  igual(m.linhas[1].valores, [0, 10], "loja b: 0% e 10%");
  igual(m.linhas[2].valores, [2.5, 10], "Rede de janeiro = soma das contagens (2,5%), não a média dos percentuais (5%)");
  igual([m.linhas[0].media, m.linhas[1].media, m.linhas[2].media], [10, 5, 6.25], "médias simples dos meses com valor");
  igual(matrizMensal([a, b, b2], ["a"], turnoverPct).linhas.map((l) => l.lojaId), ["a"], "uma loja só: sem linha Rede");
  igual(matrizMensal([], ["a", "b"], turnoverPct), { meses: [], linhas: [] }, "sem lançamentos: matriz vazia");
  igual(matrizMensal([a], ["b"], turnoverPct), { meses: [], linhas: [] }, "lançamentos de outra loja não entram");
  const ind = indicadoresRh([a, { ...b, headcount: 0.0001, diasPrevistos: 1 }]);
  igual(ind.map((i) => [i.lojaId, i.indicador, i.origem]), [["a", "turnover", "calculado"], ["a", "absent", "calculado"], ["b", "turnover", "calculado"], ["b", "absent", "calculado"]], "indicadoresRh: turnover e absenteísmo 'calculado' por loja e mês");
  igual(ind[0], { lojaId: "a", mes: "2026-01-01", indicador: "turnover", valor: 10, origem: "calculado" }, "indicador calculado: formato");
  igual(indicadoresRh([{ ...a, headcount: 0 }]).map((i) => i.indicador), ["absent"], "sem headcount não há turnover calculado");
}

/* ================================================================== tempo de casa: casos de borda */
igual([mesesDeCasa("2026-01-30", "2026-02-27"), mesesDeCasa("2026-01-31", "2026-02-28"), mesesDeCasa("2026-11-19", "2026-11-19"), mesesDeCasa("2025-11-19", "2026-11-19"), mesesDeCasa("2025-11-20", "2026-11-19"), mesesDeCasa("2026-12-01", "2026-11-19"), mesesDeCasa("2024-02-29", "2026-02-28")], [0, 1, 0, 12, 11, 0, 24], "meses completos: dia limitado ao fim do mês (27/02 ainda não, 28/02 sim), mesmo dia, futuro, ano bissexto");

/* ================================================================== sugestão do lançamento mensal */
{
  const c = (id, lojaId, adm, des = null) => ({ id, lojaId, nome: id, cargo: "atendente", dataAdmissao: adm, status: des ? "desligado" : "ativo", dataDesligamento: des, motivoDesligamento: null, observacoes: null, origem: "manual" });
  const gente = [c("A", "L", "2025-01-10"), c("B", "L", "2026-11-05"), c("C", "L", "2024-03-01", "2026-11-20"), c("D", "L", "2020-01-01", "2026-10-31"), c("E", "OUTRA", "2025-01-01")];
  igual(sugerirMes(gente, "L", "2026-11"), { headcount: 2, admissoes: 1, desligamentos: 1, diasPrevistos: 52 }, "sugestão: início 2 (A, C), fim 2 (A, B), 1 admissão, 1 desligamento, dias = 2 × 26");
  igual(sugerirMes([...gente, c("F", "L", "2025-06-01", "2026-11-10")], "L", "2026-11"), { headcount: 2.5, admissoes: 1, desligamentos: 2, diasPrevistos: 65 }, "sugestão com meio colaborador: 2,5 → 65 dias");
  igual(sugerirMes(gente, "L", "2019-12"), null, "sem ninguém na loja no mês: sem sugestão");
  igual(sugerirMes([], "L", "2026-11"), null, "sem cadastro: sem sugestão");
  igual(sugerirMes(gente, "L", "2026-10")?.desligamentos, 1, "desligamento em 31/10 conta em outubro (D)");
  igual(sugerirMes(gente, "L", "2026-02")?.admissoes, 0, "mês sem admissão");
}

/* ================================================================== ocorrências */
{
  igual([inicioDaJanela("2026-11-19"), inicioDaJanela("2026-08-31"), inicioDaJanela("2026-03-31"), inicioDaJanela("2026-01-15")], ["2026-05-19", "2026-02-28", "2025-09-30", "2025-07-15"], "janela de 6 meses: dia limitado ao fim do mês de destino");
  const o = (id, tipo, data, colab = "p1", loja = "L1") => ({ id, lojaId: loja, colaboradorId: colab, tipo, data, status: "registrada", motivo: "m", responsavel: null, observacoes: null, origem: "manual" });
  const lista = [o("1", "advertencia_verbal", "2026-11-19"), o("2", "advertencia_escrita", "2026-05-19"), o("3", "suspensao", "2026-05-18"), o("4", "atraso", "2026-11-20"), o("5", "falta_injustificada", "2026-09-01"), o("6", "elogio", "2026-10-01"), o("7", "treinamento", "2026-10-02"), o("8", "atestado_medico", "2026-06-01")];
  igual(ocorrenciasRecentes(lista, "2026-11-19").map((x) => x.id), ["1", "2", "5", "6", "7", "8"], "recentes: de 19/05 a hoje, inclusive; antes (18/05) e futuro (20/11) ficam de fora");
  igual(kpisOcorrencias(ocorrenciasRecentes(lista, "2026-11-19")), { advertencias: 2, suspensoes: 0, faltas: 1, atrasos: 0, atestados: 1, elogiosTreinamentos: 2 }, "KPIs de 6 meses");
  igual(ordenarOcorrencias([o("a", "atraso", "2026-01-01"), o("b", "atraso", "2026-02-01"), o("c", "atraso", "2026-02-01")]).map((x) => x.id), ["c", "b", "a"], "mais recente primeiro; empate: o de id maior primeiro");
  const por = resumoPorLojaTipo([o("1", "atraso", "2026-01-01", "p1", "L1"), o("2", "atraso", "2026-01-02", "p2", "L2"), o("3", "elogio", "2026-01-03", "p1", "L1"), o("4", "atraso", "2026-01-04", "p9", "FORA")], ["L1", "L2", "L3"]);
  igual(por.tiposUsados, ["atraso", "elogio"], "só os tipos que aparecem, na ordem do catálogo");
  igual(por.linhas, [{ lojaId: "L1", porTipo: { atraso: 1, elogio: 1 }, total: 2 }, { lojaId: "L2", porTipo: { atraso: 1 }, total: 1 }, { lojaId: "L3", porTipo: {}, total: 0 }], "resumo por loja e tipo (loja fora da seleção não entra)");
}

// Alertas: regras do HTML (L1008–1013) transcritas; o app só difere em suspensão sozinha (alerta) e em desligados (sem alerta).
{
  const htmlAlerta = (os) => {
    const adv = os.filter((x) => /advertencia/.test(x.tipo)).length, sus = os.filter((x) => x.tipo === "suspensao").length, fal = os.filter((x) => x.tipo === "falta_injustificada").length;
    if (sus >= 1 && adv + fal >= 1) return "bad";
    if (adv >= 2) return "bad";
    if (fal >= 2) return "warn";
    if (adv === 1) return "warn";
    return null;
  };
  let semente = 12345;
  const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const tipos = ["advertencia_verbal", "advertencia_escrita", "suspensao", "falta_injustificada", "atraso", "elogio", "feedback"];
  let casos = 0;
  for (let t = 0; t < 400; t++) {
    const n = Math.floor(rnd() * 6);
    const os = Array.from({ length: n }, (_, i) => ({ id: `o${t}-${i}`, lojaId: "L", colaboradorId: "p", tipo: tipos[Math.floor(rnd() * tipos.length)], data: "2026-10-01", status: "registrada", motivo: "m", responsavel: null, observacoes: null, origem: "manual" }));
    const ativo = [{ id: "p", lojaId: "L", nome: "P", cargo: "atendente", dataAdmissao: "2025-01-01", status: "ativo", dataDesligamento: null, motivoDesligamento: null, observacoes: null, origem: "manual" }];
    const app = alertasDePessoas(os, ativo);
    const esperado = htmlAlerta(os);
    const susSozinha = esperado === null && os.some((x) => x.tipo === "suspensao");
    if (susSozinha) {
      igual(app.map((a) => a.nivel), ["warn"], "divergência deliberada: suspensão sozinha entra como atenção");
    } else {
      igual(app.map((a) => a.nivel), esperado ? [esperado] : [], `alerta = HTML (${os.map((x) => x.tipo).join(",") || "sem ocorrências"})`);
    }
    casos++;
    const desligado = [{ ...ativo[0], status: "desligado", dataDesligamento: "2026-10-15" }];
    igual(alertasDePessoas(os, desligado), [], "desligado não gera alerta");
  }
  assert(casos === 400, "400 combinações de ocorrências conferidas contra o HTML");
  const pessoas = ["p1", "p2", "p3"].map((id, i) => ({ id, lojaId: "L", nome: ["Zeca", "Ana", "Bia"][i], cargo: "atendente", dataAdmissao: "2025-01-01", status: "ativo", dataDesligamento: null, motivoDesligamento: null, observacoes: null, origem: "manual" }));
  const oc = (colab, tipo, i) => ({ id: `${colab}${i}`, lojaId: "L", colaboradorId: colab, tipo, data: "2026-10-01", status: "registrada", motivo: "m", responsavel: null, observacoes: null, origem: "manual" });
  const r = alertasDePessoas([oc("p1", "advertencia_verbal", 1), oc("p2", "advertencia_verbal", 1), oc("p2", "advertencia_escrita", 2), oc("p3", "suspensao", 1), oc("p3", "atraso", 2)], pessoas);
  igual(r.map((a) => [a.colaboradorId, a.nivel]), [["p2", "bad"], ["p3", "warn"], ["p1", "warn"]], "ordem: crítico primeiro, depois atenção (por nome)");
  igual(r[0].texto, "2 advertências — próximo passo previsto: suspensão.", "texto: duas advertências");
  igual(alertasDePessoas([oc("p3", "suspensao", 1), oc("p3", "falta_injustificada", 2)], pessoas)[0].texto, "1 suspensão e 1 outra ocorrência — avaliar desligamento com o jurídico/RH.", "texto: singular correto");
  igual(alertasDePessoas([oc("p3", "suspensao", 1), oc("p3", "suspensao", 2), oc("p3", "atraso", 3), oc("p3", "falta_injustificada", 4)], pessoas)[0].texto, "2 suspensões e 1 outra ocorrência — avaliar desligamento com o jurídico/RH.", "texto: plural correto");
  igual(alertasDePessoas([oc("zz", "advertencia_escrita", 1)], pessoas), [], "ocorrência de quem não está no cadastro ativo não gera alerta");
}

/* ================================================================== exportação */
{
  const nomeLoja = (id) => ({ L1: "Brooklyn", L2: "Perdizes" })[id] ?? "?";
  const colabs = [
    { id: "p1", lojaId: "L1", nome: "Ana", cargo: "atendente", dataAdmissao: "2025-11-20", status: "ativo", dataDesligamento: null, motivoDesligamento: null, observacoes: null, origem: "manual" },
    { id: "p2", lojaId: "L1", nome: "Bia", cargo: "gerente_loja", dataAdmissao: "2020-01-02", status: "desligado", dataDesligamento: "2026-06-30", motivoDesligamento: "Pedido de demissão", observacoes: null, origem: "manual" },
  ];
  igual(linhasCsvQuadro(colabs, nomeLoja, "2026-11-19"), [
    ["Nome", "Cargo", "Loja", "Admissão", "Tempo de casa", "Situação", "Desligamento", "Motivo do desligamento"],
    ["Bia", "Gerente de loja", "Brooklyn", "02/01/2020", "", "Desligado", "30/06/2026", "Pedido de demissão"],
    ["Ana", "Atendente", "Brooklyn", "20/11/2025", "11 meses", "Ativo", "", ""],
  ], "CSV do quadro: gerente antes de atendente; desligado sem tempo de casa");
  igual(linhasCsvMovimentos([{ id: "1", lojaId: "L1", mes: "2026-10-01", headcount: 24.5, admissoes: 1, desligamentos: 2, faltas: 13, diasPrevistos: 637, origem: "manual" }, { id: "2", lojaId: "L2", mes: "2026-11-01", headcount: 10, admissoes: 0, desligamentos: 0, faltas: 0, diasPrevistos: 260, origem: "manual" }], nomeLoja), [
    ["Mês", "Loja", "Headcount médio", "Admissões", "Desligamentos", "Dias de falta", "Dias previstos", "Turnover (%)", "Absenteísmo (%)"],
    ["11/2026", "Perdizes", "10,0", 0, 0, 0, 260, "0,0", "0,0"],
    ["10/2026", "Brooklyn", "24,5", 1, 2, 13, 637, "6,1", "2,0"],
  ], "CSV dos lançamentos: mais recente primeiro, vírgula decimal");
  const oc = [{ id: "o1", lojaId: "L1", colaboradorId: "p1", tipo: "atraso", data: "2026-11-10", status: "aguardando_assinatura", motivo: "Chegou 30 min depois", responsavel: "Gerente", observacoes: null, origem: "manual" }];
  igual(linhasCsvOcorrencias(oc, nomeLoja, colabs), [
    ["Data", "Colaborador", "Cargo", "Loja", "Tipo", "Motivo", "Responsável", "Status", "Observação"],
    ["10/11/2026", "Ana", "Atendente", "Brooklyn", "Atraso", "Chegou 30 min depois", "Gerente", "Aguardando assinatura", ""],
  ], "CSV das ocorrências (cabeçalho do HTML)");
  igual(linhasCsvOcorrencias(oc, nomeLoja, [])[1].slice(1, 3), ["", ""], "sem cadastro visível, nome e cargo ficam vazios (sem quebrar)");
}

/* ================================================================== importação (colar lista) */
{
  const HOJE = "2026-11-19";
  const ok = lerImportacaoColaboradores("Nome;Cargo;Admissão\nMaria Souza;Atendente;12/03/2026\nJoão Lima;auxiliar de cozinha;2025-05-02\n", HOJE);
  igual(ok.erros, [], "lista válida sem erros");
  igual(ok.linhas, [{ nome: "Maria Souza", cargo: "atendente", dataAdmissao: "2026-03-12" }, { nome: "João Lima", cargo: "auxiliar_cozinha", dataAdmissao: "2025-05-02" }], "linhas lidas (cabeçalho ignorado)");
  igual(ok.total, 2, "total conta só as pessoas");
  igual(lerImportacaoColaboradores("Ana\tGerente\t01/01/2024", HOJE).linhas, [{ nome: "Ana", cargo: "gerente_loja", dataAdmissao: "2024-01-01" }], "colado do Excel (tabulação) e cargo abreviado");
  igual(lerImportacaoColaboradores('﻿"Ana Paula";"Líder";"01/01/2024"\r\n\r\nCarlos;Chefe;05/05/2023\r\n', HOJE).linhas.map((l) => [l.nome, l.cargo]), [["Ana Paula", "lider_delivery"], ["Carlos", "chefe_cozinha"]], "BOM, aspas, CRLF e linha em branco");
  igual(lerImportacaoColaboradores("Maria;Atendente;12/03/2026", HOJE).linhas.length, 1, "sem cabeçalho também vale");
  const erro = (txt, nomes = []) => lerImportacaoColaboradores(txt, HOJE, nomes).erros.map((e) => `${e.linha}:${e.mensagem}`);
  assert(erro("A;Atendente;12/03/2026")[0].includes("Nome"), "nome curto demais");
  assert(erro("Maria;Cozinheira;12/03/2026")[0].includes('Cargo "Cozinheira" não reconhecido'), "cargo desconhecido");
  assert(erro("Maria;Atendente;31/02/2026")[0].includes("inválida"), "data inexistente");
  assert(erro("Maria;Atendente;25/11/2026")[0].includes("futura"), "admissão futura");
  assert(erro("Maria;Atendente;01/01/1980")[0].includes("1990"), "admissão antes de 1990");
  assert(erro("Maria;Atendente")[0].includes("três colunas"), "faltam colunas");
  assert(erro("Ana;Atendente;01/01/2024\nana ;Atendente;02/01/2024")[0].startsWith("2:") && erro("Ana;Atendente;01/01/2024\nana ;Atendente;02/01/2024")[0].includes("mais de uma vez"), "nome repetido na própria lista (sem diferenciar caixa)");
  assert(erro("Joao Lima;Atendente;01/01/2024", ["JOÃO LIMA"])[0].includes("já está ativo"), "nome já ativo na loja (sem diferenciar caixa e acento)");
  igual(erro("Maria;Atendente;12/03/2026\nX;Atendente;12/03/2026\nBia;Atendente;12/03/2026").map((e) => e.split(":")[0]), ["2"], "só a linha com erro é apontada, com o número da linha do texto");
  igual(lerImportacaoColaboradores("Nome;Cargo;Admissão\nX;Atendente;12/03/2026", HOJE).erros[0].linha, 2, "número da linha conta o cabeçalho");
  const grande = Array.from({ length: LIMITE_IMPORTACAO_RH + 5 }, (_, i) => `Pessoa ${i + 1};Atendente;01/01/2024`).join("\n");
  const g = lerImportacaoColaboradores(grande, HOJE);
  igual(g.erros.length, 1, "acima do limite: um único erro");
  assert(g.erros[0].mensagem.includes(String(LIMITE_IMPORTACAO_RH)), "o erro cita o limite");
  igual(g.total, LIMITE_IMPORTACAO_RH + 5, "total conta tudo");
  igual(lerCargo("  AUXILIAR de Cozinha "), "auxiliar_cozinha", "cargo sem diferenciar caixa/espaços");
  igual([lerCargo("Líder de delivery"), lerCargo("atendimento"), lerCargo("xyz")], ["lider_delivery", "atendente", null], "sinônimos de cargo");
}

/* ================================================================== erros do banco em português */
{
  const e = (code, message) => erroRh({ code, message });
  assert(e("23505", 'duplicate key value violates unique constraint "rede_rh_colab_nome_uk"').includes("mesmo nome") || e("23505", 'duplicate key value violates unique constraint "rede_rh_colab_nome_uk"').includes("com esse nome"), "nome duplicado");
  assert(e("23505", 'duplicate key value violates unique constraint "rede_rh_m_uk"').includes("lançamento deste mês"), "mês duplicado");
  assert(e("23503", 'insert or update on table "rede_rh_colaboradores" violates foreign key constraint "rede_rh_oco_colab_fk"').includes("Desligar"), "colaborador com ocorrências: orienta a desligar");
  assert(e("23514", 'new row for relation "rede_rh_mensal" violates check constraint "rede_rh_m_falta_chk"').includes("dias de falta"), "faltas acima dos dias previstos");
  assert(e("23514", 'violates check constraint "rede_rh_colab_deslig_data_chk"').includes("anterior à admissão"), "desligamento antes da admissão");
  igual([e("23505", "outra"), e("23514", "A data da ocorrência é anterior à admissão do colaborador (10/01/2026)."), e("42501", "x"), erroRh(null), erroRh("texto"), erroRh(undefined)], [null, null, null, null, null, null], "erros desconhecidos passam para a tradução geral");
}

/* ================================================================== mapeadores com dado sujo */
{
  const c = mapColaborador({ id: 7, loja_id: "L", nome: "Ana", cargo: "cozinheiro", data_admissao: "2025-01-02T00:00:00", status: "x", data_desligamento: null, motivo_desligamento: "", observacoes: "  ", origem: "qualquer" });
  igual([c.id, c.cargo, c.dataAdmissao, c.status, c.motivoDesligamento, c.observacoes, c.origem], ["7", "atendente", "2025-01-02", "ativo", null, null, "manual"], "colaborador: cargo/status/origem desconhecidos viram valores seguros, textos vazios viram null");
  igual(mapColaborador({ id: "a", loja_id: "L", nome: null, cargo: "gerente_loja", data_admissao: null, status: "desligado", data_desligamento: "2026-05-01", origem: "exemplo" }).dataAdmissao, "", "admissão ausente vira vazio (não quebra a tela)");
  igual(mapPrevisto({ loja_id: "L", cargo: "chefe_cozinha", previsto: "3", origem: "exemplo" }), { lojaId: "L", cargo: "chefe_cozinha", previsto: 3, origem: "exemplo" }, "previsto: numeric como texto");
  igual(mapMes({ id: "m", loja_id: "L", mes: "2026-05-01", headcount_medio: "24.5", admissoes: "1", desligamentos: 0, dias_falta: "12", dias_previstos: 637, origem: "manual" }), { id: "m", lojaId: "L", mes: "2026-05-01", headcount: 24.5, admissoes: 1, desligamentos: 0, faltas: 12, diasPrevistos: 637, origem: "manual" }, "mês: numeric(7,1) chega como texto e vira número");
  igual(mapMes({ id: "m", loja_id: "L", mes: "2026-05-17", headcount_medio: "abc" }).mes, "2026-05-01", "mês sempre no dia 1");
  const o = mapOcorrencia({ id: 1, loja_id: "L", colaborador_id: "c", tipo: "x", data: "2026-01-02", status: "y", motivo: null, responsavel: "", observacoes: "obs", origem: "exemplo" });
  igual([o.tipo, o.status, o.motivo, o.responsavel, o.observacoes, o.origem], ["feedback", "registrada", "", null, "obs", "exemplo"], "ocorrência: tipo/status desconhecidos viram valores seguros");
}

/* ================================================================== validações (as mesmas das ações) */
{
  const L = "11111111-1111-4111-8111-111111111111";
  const C = "22222222-2222-4222-8222-222222222222";
  const base = { lojaId: L, nome: "Maria Souza", cargo: "atendente", dataAdmissao: "2026-03-12", observacoes: null };
  igual(lerEntrada(colaboradorSchema, { ...base, nome: "  Maria Souza  ", observacoes: "  " }), { ...base, observacoes: null }, "colaborador: apara espaços; observação vazia vira null");
  lanca(() => lerEntrada(colaboradorSchema, { ...base, nome: "A" }), 'Confira o campo "nome"', "nome curto");
  lanca(() => lerEntrada(colaboradorSchema, { ...base, cargo: "diretor" }), 'Confira o campo "cargo"', "cargo inválido");
  lanca(() => lerEntrada(colaboradorSchema, { ...base, dataAdmissao: "2026-02-31" }), 'Confira o campo "data de admissão"', "admissão impossível");
  lanca(() => lerEntrada(colaboradorSchema, { ...base, observacoes: "x".repeat(501) }), 'Confira o campo "observações"', "observação longa");
  lanca(() => lerEntrada(colaboradorSchema, { ...base, lojaId: "abc" }), 'Confira o campo "loja"', "loja inválida");
  igual(lerEntrada(desligamentoSchema, { data: "2026-11-01", motivo: "" }), { data: "2026-11-01", motivo: null }, "desligamento: motivo vazio vira null");
  lanca(() => lerEntrada(desligamentoSchema, { data: "ontem", motivo: null }), 'Confira o campo "data"', "desligamento: data inválida");

  const mes = { lojaId: L, mes: "2026-11", headcount: 24.5, admissoes: 1, desligamentos: 2, faltas: 13, diasPrevistos: 637 };
  igual(lerEntrada(mesRhSchema, mes), mes, "mês válido");
  lanca(() => lerEntrada(mesRhSchema, { ...mes, faltas: 700 }), 'Confira o campo "dias de falta": Os dias de falta não podem passar dos dias previstos', "faltas acima dos dias previstos");
  lanca(() => lerEntrada(mesRhSchema, { ...mes, headcount: 0 }), 'Confira o campo "headcount médio"', "headcount zero");
  lanca(() => lerEntrada(mesRhSchema, { ...mes, headcount: 12.55 }), "uma casa decimal", "duas casas decimais no headcount");
  lanca(() => lerEntrada(mesRhSchema, { ...mes, headcount: 5001 }), "No máximo 5000", "headcount acima do limite");
  lanca(() => lerEntrada(mesRhSchema, { ...mes, admissoes: -1 }), 'Confira o campo "admissões"', "admissões negativas");
  lanca(() => lerEntrada(mesRhSchema, { ...mes, desligamentos: 1.5 }), 'Confira o campo "desligamentos"', "desligamentos fracionados");
  lanca(() => lerEntrada(mesRhSchema, { ...mes, diasPrevistos: 0 }), 'Confira o campo "dias previstos"', "dias previstos zero");
  lanca(() => lerEntrada(mesRhSchema, { ...mes, mes: "2026-13" }), 'Confira o campo "mês"', "mês inválido");
  lanca(() => lerEntrada(mesRhSchema, { ...mes, headcount: "24" }), 'Confira o campo "headcount médio"', "headcount como texto");

  const prev = { lojaId: L, previstos: { gerente_loja: 1, chefe_cozinha: 1, lider_delivery: 2, auxiliar_cozinha: 13, atendente: 8 } };
  igual(lerEntrada(previstoSchema, prev), prev, "quadro previsto válido");
  lanca(() => lerEntrada(previstoSchema, { ...prev, previstos: { ...prev.previstos, atendente: 100 } }), 'Confira o campo "atendente"', "previsto acima de 99");
  lanca(() => lerEntrada(previstoSchema, { ...prev, previstos: { ...prev.previstos, atendente: -1 } }), 'Confira o campo "atendente"', "previsto negativo");
  lanca(() => lerEntrada(previstoSchema, { ...prev, previstos: { ...prev.previstos, chefe_cozinha: 1.5 } }), 'Confira o campo "chefe de cozinha"', "previsto fracionado");
  lanca(() => lerEntrada(previstoSchema, { ...prev, previstos: { gerente_loja: 1 } }), 'Confira o campo', "previsto: faltam cargos");

  const oc = { lojaId: L, colaboradorId: C, tipo: "atraso", data: "2026-11-10", status: "registrada", motivo: " Chegou tarde ", responsavel: "", observacoes: null };
  igual(lerEntrada(ocorrenciaSchema, oc), { ...oc, motivo: "Chegou tarde", responsavel: null }, "ocorrência válida (motivo aparado)");
  lanca(() => lerEntrada(ocorrenciaSchema, { ...oc, motivo: "   " }), 'Confira o campo "motivo"', "motivo vazio");
  lanca(() => lerEntrada(ocorrenciaSchema, { ...oc, motivo: "x".repeat(301) }), 'Confira o campo "motivo"', "motivo longo");
  lanca(() => lerEntrada(ocorrenciaSchema, { ...oc, tipo: "demissao" }), 'Confira o campo "tipo"', "tipo inválido");
  lanca(() => lerEntrada(ocorrenciaSchema, { ...oc, status: "feita" }), 'Confira o campo "situação"', "status inválido");
  lanca(() => lerEntrada(ocorrenciaSchema, { ...oc, colaboradorId: "x" }), 'Confira o campo "colaborador"', "colaborador inválido");
  lanca(() => lerEntrada(ocorrenciaSchema, { ...oc, observacoes: "x".repeat(1001) }), 'Confira o campo "observações"', "observação longa");
  igual(lerEntrada(importacaoRhSchema, { lojaId: L, texto: "a;b;c" }).texto, "a;b;c", "importação válida");
  lanca(() => lerEntrada(importacaoRhSchema, { lojaId: L, texto: "x".repeat(60001) }), 'Confira o campo "lista"', "lista grande demais");
}

/* ------------------------------------------------------------------ menu e permissões */
{
  const rh = MENU_REDE.find((i) => i.href === "/rh");
  assert(rh != null && rh.label === "RH", "o menu da rede tem o item RH");
  igual(rh ? modulosDoItem(rh) : [], ["rh_quadro", "rh_movimentos", "rh_ocorrencias", "avaliacao_gerentes", "nine_box", "sucessao"], "RH abre com qualquer um dos 6 módulos (3 da rodada 18 + gerentes, nine box e sucessão)");
  const mod = (ver) => ({ ver, editar: false });
  const so = (k) => lerPerfil({ papel: "x", todas_lojas: true, loja_ids: [], modulos: { [k]: mod(true) } });
  assert(podeVerAlgum(so("rh_ocorrencias"), modulosDoItem(rh)), "quem só vê ocorrências enxerga o item RH");
  assert(podeVerAlgum(so("rh_movimentos"), modulosDoItem(rh)), "quem só vê movimentos enxerga o item RH");
  assert(podeVerAlgum(so("rh_quadro"), modulosDoItem(rh)), "quem só vê o quadro enxerga o item RH");
  assert(!podeVerAlgum(so("vendas"), modulosDoItem(rh)), "quem não tem módulo de RH não enxerga o item RH");
  assert(!podeVerAlgum(null, modulosDoItem(rh)), "sem perfil não enxerga o item RH");
}

console.log(`rede-rh-tests: ${pass} verificações ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
