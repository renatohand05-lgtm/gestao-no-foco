#!/usr/bin/env node
/**
 * Testes do checklist de qualidade e dos planos de ação da rede de lojas (regras puras, sem banco).
 * 1) Paridade com o painel original: as 6 seções e 34 itens (scripts/fixtures/rede-html-qualidade.json, extraído do
 *    HTML) e as contas do HTML (qScores, scCol, barras, CSV) foram transcritas abaixo e rodam sobre centenas de
 *    visitas geradas; o resultado das funções do app precisa bater.
 * 2) Regras do sistema: nota sem contar N/A, desvios, respostas sujas, visitas da rede, planos de ação (situação
 *    derivada "atrasado", filtros, ordem, resumo, pendências por loja, duplicados, histórico, CSV).
 * Node com --experimental-strip-types.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ROTINA_DELIVERY, avaliarRegistro, planosSugeridos, rotuloOrigemDelivery } from "../lib/rede/delivery.ts";
import {
  FILTRO_VAZIO,
  ORIGENS_PLANO,
  SITUACOES_FILTRO,
  aguardaVerificacao,
  contarPorOrigem,
  descreverAlteracao,
  diasDeAtraso,
  estaAberto,
  estaAtrasado,
  filtrarPlanos,
  linhasCsvPlanos,
  normalizarTexto,
  ordenarPlanos,
  pendenciasPorLoja,
  planoDuplicado,
  prazoValido,
  resumirPlanos,
  rotuloSituacao,
  situacaoPlano,
  textoGeracaoPlanos,
  tomDaSituacao,
} from "../lib/rede/planos.ts";
import {
  DIAS_SEM_VISITA,
  META_NOTA_QUALIDADE,
  SECOES_QUALIDADE,
  TOTAL_ITENS_QUALIDADE,
  chaveItem,
  desviosDaVisita,
  formatarNota,
  lerChaveItem,
  limparRespostas,
  linhasCsvVisitas,
  ordenarVisitas,
  resumirRedeQualidade,
  resumirVisita,
  respostasParaBanco,
  rotuloCurtoSecao,
  rotuloOrigemQualidade,
  statusNota,
  textoDoItem,
  ultimaVisitaPorLoja,
} from "../lib/rede/qualidade.ts";

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

const aqui = dirname(fileURLToPath(import.meta.url));
const HTML = JSON.parse(readFileSync(join(aqui, "fixtures", "rede-html-qualidade.json"), "utf8"));

/* ================================================================== paridade: catálogo */
igual(SECOES_QUALIDADE.map((s) => s.titulo), HTML.secoes.map((s) => s.titulo), "6 seções = as do HTML, mesma ordem e texto");
igual(SECOES_QUALIDADE.map((s) => [...s.itens]), HTML.secoes.map((s) => s.itens), "34 itens = os do HTML, mesma ordem e texto");
igual(TOTAL_ITENS_QUALIDADE, 34, "34 itens no total");
igual(SECOES_QUALIDADE.map((s) => s.itens.length), [6, 6, 6, 6, 5, 5], "tamanho de cada seção");
igual(META_NOTA_QUALIDADE, 90, "meta da nota: 90%");

/* ================================================================== paridade: contas do HTML */
// qKey / qScores / scCol (HTML L771–786), transcritos.
const CK_QUAL = HTML.secoes.map((s) => ({ s: s.titulo, i: s.itens }));
const qKey = (si, ii) => si + "-" + ii;
function htmlScores(Q) {
  const per = CK_QUAL.map((sec, si) => {
    let s = 0, n = 0, na = 0;
    sec.i.forEach((_, ii) => {
      const v = (Q[qKey(si, ii)] || {}).v;
      if (v === "sim") s++;
      if (v === "nao") n++;
      if (v === "na") na++;
    });
    return { s, n, na, tot: sec.i.length };
  });
  const S = per.reduce((a, p) => a + p.s, 0);
  const N = per.reduce((a, p) => a + p.n, 0);
  return { per, S, N, score: S + N ? (S / (S + N)) * 100 : null };
}
const htmlClasse = (v) => (v >= 90 ? "ok" : v >= 75 ? "warn" : "bad"); // histórico (L809)

let seed = 20261123;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
function gerarRespostas(pSim, pNao, pNa, pObs) {
  const Q = {};
  SECOES_QUALIDADE.forEach((sec, s) =>
    sec.itens.forEach((_, i) => {
      const x = rnd();
      const v = x < pSim ? "sim" : x < pSim + pNao ? "nao" : x < pSim + pNao + pNa ? "na" : null;
      if (v || rnd() < pObs) Q[qKey(s, i)] = { v, o: rnd() < pObs ? "obs " + s + i : null };
    }),
  );
  return Q;
}
{
  let casos = 0;
  let okTodos = true;
  for (let n = 0; n < 400; n++) {
    const Q = gerarRespostas(0.2 + rnd() * 0.7, rnd() * 0.3, rnd() * 0.2, 0.2);
    const h = htmlScores(Q);
    const r = resumirVisita(Q);
    casos++;
    const certo =
      r.sim === h.S && r.nao === h.N && r.aplicaveis === h.S + h.N && (r.nota === h.score || Math.abs(r.nota - h.score) < 1e-9) &&
      r.secoes.every((s, i) => s.sim === h.per[i].s && s.nao === h.per[i].n && s.na === h.per[i].na && s.total === h.per[i].tot && s.avaliados === h.per[i].s + h.per[i].n + h.per[i].na) &&
      r.secoes.every((s, i) => (s.nota == null) === (h.per[i].s + h.per[i].n === 0) && (s.nota == null || Math.abs(s.nota - (h.per[i].s / (h.per[i].s + h.per[i].n)) * 100) < 1e-9)) &&
      (r.nota == null ? r.status === "neu" : r.status === htmlClasse(r.nota)) &&
      r.secoes.every((s) => (s.nota == null ? statusNota(s.nota) === "neu" : statusNota(s.nota) === htmlClasse(s.nota)));
    if (!certo) {
      okTodos = false;
      console.error("divergiu em", JSON.stringify(Q).slice(0, 200), r.nota, h.score);
      break;
    }
  }
  assert(okTodos, `paridade: ${casos} visitas geradas dão a mesma contagem, nota, nota por seção e cor que o HTML`);
}
igual(SECOES_QUALIDADE.map((_, i) => rotuloCurtoSecao(i)), CK_QUAL.map((s) => s.s.split(",")[0]), "rótulo curto da seção = texto até a primeira vírgula (barras do HTML)");
igual(rotuloCurtoSecao(0), "Produção", "rótulo curto: Produção");
igual(rotuloCurtoSecao(5), "Cumprimento dos padrões operacionais", "rótulo curto sem vírgula = título inteiro");
igual(rotuloCurtoSecao(9), "", "rótulo curto de seção inexistente é vazio");

// Limiares: 90 e 75 (scCol). 26 Sim e 3 Não = 89,655...% (atenção); 27/3 = 90% (ok); 22/7 = 75,86% (atenção); 21/7 = 75% (atenção); 15/5 = 75%; 3/1 = 75%.
igual([100, 90, 89.999, 75, 74.999, 0].map(statusNota), ["ok", "ok", "warn", "warn", "bad", "bad"], "limiares da cor: 90 e 75");
igual([null, undefined, NaN].map(statusNota), ["neu", "neu", "neu"], "sem nota = neutro");

/* ================================================================== nota: regras */
{
  const vazio = resumirVisita({});
  igual([vazio.nota, vazio.status, vazio.sim, vazio.nao, vazio.na, vazio.avaliados, vazio.aplicaveis], [null, "neu", 0, 0, 0, 0, 0], "visita vazia: sem nota");
  const soNa = resumirVisita({ "0-0": { v: "na", o: null } });
  igual([soNa.nota, soNa.avaliados, soNa.aplicaveis], [null, 1, 0], "só N/A: avaliada mas sem nota (N/A não conta)");
  const meio = resumirVisita({ "0-0": { v: "sim", o: null }, "0-1": { v: "nao", o: null }, "0-2": { v: "na", o: null } });
  igual([meio.nota, meio.avaliados, meio.aplicaveis], [50, 3, 2], "1 Sim, 1 Não, 1 N/A = 50%");
  const todos = Object.fromEntries(SECOES_QUALIDADE.flatMap((s, si) => s.itens.map((_, ii) => [chaveItem(si, ii), { v: "sim", o: null }])));
  const t = resumirVisita(todos);
  igual([t.nota, t.sim, t.avaliados, t.status], [100, 34, 34, "ok"], "34 Sim = 100%");
  igual(t.secoes.map((s) => s.nota), [100, 100, 100, 100, 100, 100], "34 Sim: 100% em todas as seções");
  const so26 = { ...todos };
  for (const k of ["0-0", "1-1", "2-2"]) so26[k] = { v: "nao", o: null };
  for (const k of ["3-0", "3-1", "4-0", "4-1", "5-0"]) so26[k] = { v: "na", o: null };
  const r26 = resumirVisita(so26);
  igual([r26.sim, r26.nao, r26.na], [26, 3, 5], "contagem: 34 itens = 26 Sim + 3 Não + 5 N/A");
  assert(Math.abs(r26.nota - (26 / 29) * 100) < 1e-9 && r26.status === "warn", "26 Sim de 29 que contam = 89,66%: ainda em atenção (N/A fora da conta)");
  const r = resumirVisita({ ...todos, ...Object.fromEntries(["0-0", "0-1", "0-2", "0-3", "0-4", "0-5", "1-0", "1-1"].map((k) => [k, { v: "nao", o: null }])) });
  igual(r.nao, 8, "8 Não");
  assert(Math.abs(r.nota - (26 / 34) * 100) < 1e-9, "26 de 34 = 76,47%");
  igual(r.status, "warn", "76,47% = atenção");
  // observação sozinha não é resposta
  const obs = resumirVisita({ "0-0": { v: null, o: "só uma nota" } });
  igual([obs.avaliados, obs.nota], [0, null], "observação sem resposta não conta");
  // chave inexistente não conta
  const fora = resumirVisita({ "6-0": { v: "nao", o: null }, "0-9": { v: "nao", o: null }, "4-5": { v: "nao", o: null } });
  igual([fora.nao, fora.avaliados], [0, 0], "itens fora da lista não entram na conta");
}

/* ================================================================== formatação da nota */
igual([100, 92.4, 90, 0, 75, 76.47].map(formatarNota), ["100%", "92%", "90%", "0%", "75%", "76%"], "nota sem casas decimais, como no HTML");
igual([89.5, 89.655, 89.96].map(formatarNota), ["89,5%", "89,6%", "89,9%"], "89,x% não vira 90% (ainda é atenção): mostra uma casa, truncada");
igual([74.5, 74.9, 74.99].map(formatarNota), ["74,5%", "74,9%", "74,9%"], "74,x% não vira 75%: mostra uma casa");
igual([89.4, 74.4].map(formatarNota), ["89%", "74%"], "abaixo de .5 arredonda para baixo sem enganar");
igual([null, undefined, NaN].map(formatarNota), ["—", "—", "—"], "sem nota = traço");

/* ================================================================== chaves e respostas */
igual([lerChaveItem("0-0"), lerChaveItem("5-4"), lerChaveItem("3-5")], [{ secao: 0, item: 0 }, { secao: 5, item: 4 }, { secao: 3, item: 5 }], "chaves válidas");
igual(["0-6", "4-5", "5-5", "6-0", "-1-0", "0-0 ", "00-0", "a-b", "", "0_0", "0-"].map(lerChaveItem), Array(11).fill(null), "chaves inválidas (fora da lista ou mal formadas)");
igual(textoDoItem("1-2"), HTML.secoes[1].itens[2], "texto do item pela chave");
igual(textoDoItem("9-9"), null, "texto de item inexistente");
{
  const sujo = limparRespostas({
    "0-0": { v: "sim", o: "  ok  " },
    "0-1": { v: "talvez", o: "" },
    "0-2": { v: null, o: "só obs" },
    "0-3": { v: "nao" },
    "9-9": { v: "sim" },
    "1-0": null,
    "1-1": { v: null, o: null },
    "1-2": { v: "na", o: "x".repeat(400) },
  });
  igual(Object.keys(sujo).sort(), ["0-0", "0-2", "0-3", "1-2"], "limpar: fica só o que tem resposta válida ou observação, de itens da lista");
  igual(sujo["0-0"], { v: "sim", o: "ok" }, "limpar: observação aparada");
  igual(sujo["1-2"].o.length, 300, "limpar: observação cortada em 300");
  igual(respostasParaBanco(sujo)["0-2"], { o: "só obs" }, "para o banco: sem campo vazio");
  igual(respostasParaBanco(sujo)["0-3"], { v: "nao" }, "para o banco: só a resposta");
}

/* ================================================================== desvios */
{
  const Q = { "2-1": { v: "nao", o: "  selo rasgado " }, "0-0": { v: "nao", o: null }, "1-4": { v: "sim", o: null }, "3-0": { v: "na", o: null } };
  const d = desviosDaVisita(Q);
  igual(d.map((x) => x.chave), ["0-0", "2-1"], "desvios na ordem da lista (não na ordem em que foram marcados)");
  igual(d[1], { chave: "2-1", secao: 2, item: 1, titulo: HTML.secoes[2].itens[1], secaoTitulo: HTML.secoes[2].titulo, observacao: "selo rasgado" }, "desvio leva o item, a seção e a observação");
  igual(d[0].observacao, null, "sem observação = nulo");
  igual(desviosDaVisita({}), [], "sem desvios");
  igual(rotuloOrigemQualidade("2026-11-18", 2), "Visita de qualidade de 18/11/2026 · seção 3", "rótulo da origem do plano");
}

/* ================================================================== visitas da rede */
const V = (id, lojaId, data, criada, Q) => ({ id, lojaId, data, avaliador: "Ana", gerente: null, respostas: Q, origem: "manual", criadaEm: criada });
const sim = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [chaveItem(0, i), { v: "sim", o: null }]));
{
  const visitas = [
    V("a", "L1", "2026-11-01", "2026-11-01T10:00:00Z", { ...sim(4), "0-4": { v: "nao", o: null } }),
    V("b", "L1", "2026-11-10", "2026-11-10T10:00:00Z", sim(6)),
    V("c", "L1", "2026-11-10", "2026-11-10T15:00:00Z", { ...sim(5), "0-5": { v: "nao", o: null } }),
    V("d", "L2", "2026-09-30", "2026-09-30T10:00:00Z", sim(6)),
    V("e", "L3", "2026-11-17", "2026-11-17T10:00:00Z", { "0-0": { v: "na", o: null } }),
  ];
  igual(ordenarVisitas(visitas).map((v) => v.id), ["e", "c", "b", "a", "d"], "mais recente primeiro; no mesmo dia, a cadastrada depois");
  const ult = ultimaVisitaPorLoja(visitas);
  igual([ult.get("L1").id, ult.get("L2").id, ult.get("L3").id], ["c", "d", "e"], "última visita de cada loja");
  const r = resumirRedeQualidade(visitas, ["L1", "L2", "L3", "L4"], "2026-11-18");
  igual(r.ultimas.map((u) => [u.lojaId, u.nota == null ? null : Math.round(u.nota)]), [["L1", 83], ["L2", 100], ["L3", null]], "última nota por loja (menor primeiro, sem nota por último)");
  assert(Math.abs(r.notaMedia - (((5 / 6) * 100 + 100) / 2)) < 1e-9, "nota média: só lojas com nota (a loja só com N/A fica de fora)");
  igual(r.visitasRecentes, 4, `visitas nos últimos ${DIAS_SEM_VISITA} dias (inclui o dia de hoje e 29 para trás)`);
  igual(r.lojasSemVisita, ["L2", "L4"], "lojas sem visita no período: a que está há mais de 30 dias e a que nunca teve");
  const limite = resumirRedeQualidade([V("x", "L1", "2026-10-20", "z", sim(1))], ["L1"], "2026-11-18");
  igual(limite.visitasRecentes, 1, "29 dias atrás ainda é recente");
  const alem = resumirRedeQualidade([V("x", "L1", "2026-10-19", "z", sim(1))], ["L1"], "2026-11-18");
  igual([alem.visitasRecentes, alem.lojasSemVisita], [0, ["L1"]], "30 dias atrás já não é");
  const filtrado = resumirRedeQualidade(visitas, ["L2"], "2026-11-18");
  igual([filtrado.ultimas.length, filtrado.visitasRecentes], [1, 0], "o resumo só olha as lojas do filtro");
  const vazio = resumirRedeQualidade([], ["L1"], "2026-11-18");
  igual([vazio.notaMedia, vazio.ultimas, vazio.visitasRecentes, vazio.lojasSemVisita], [null, [], 0, ["L1"]], "rede sem visita");
}

/* ================================================================== CSV das visitas (colunas do HTML) */
{
  const P = (over) => ({ id: "p", lojaId: "L1", origemTipo: "qualidade", origemId: "c", origemRef: "0-5", origemRotulo: "r", descricao: "d", acao: null, responsavel: null, prazo: null, prioridade: "media", status: "pendente", dataConclusao: null, evidencia: null, observacoes: null, verificadoEm: null, criadoEm: "2026-11-10T10:00:00Z", ...over });
  const visitas = [
    V("c", "L1", "2026-11-10", "z", { ...sim(5), "0-5": { v: "nao", o: "faltou" } }),
    V("b", "L1", "2026-11-09", "y", sim(6)),
  ];
  const csv = linhasCsvVisitas(visitas, (id) => (id === "c" ? [P({ acao: "Treinar", responsavel: "Bia", prazo: "2026-11-20", status: "em_andamento" })] : []), () => "Brooklyn");
  igual(csv[0], ["Data", "Loja", "Avaliador", "Gerente", "Nota %", "Desvio", "Seção", "Observação", "Ação", "Responsável", "Prazo", "Status"], "colunas do CSV = as do HTML");
  igual(csv[1], ["2026-11-10", "Brooklyn", "Ana", "", 83, HTML.secoes[0].itens[5], HTML.secoes[0].titulo, "faltou", "Treinar", "Bia", "2026-11-20", "Em andamento"], "uma linha por desvio, com a ação do plano");
  igual(csv[2], ["2026-11-09", "Brooklyn", "Ana", "", 100, "", "", "", "", "", "", ""], "visita sem desvio: uma linha com a parte do desvio em branco");
  igual(csv.length, 3, "cabeçalho + 2 linhas");
  const semPlano = linhasCsvVisitas([visitas[0]], () => [], () => "B");
  igual(semPlano[1].slice(8), ["", "", "", ""], "desvio sem plano (perfil que não vê planos): ação em branco");
}

/* ================================================================== planos de ação */
const HOJE = "2026-11-18";
let nPlano = 0;
const P = (over) => ({
  id: "p" + ++nPlano,
  lojaId: "L1",
  origemTipo: "manual",
  origemId: null,
  origemRef: null,
  origemRotulo: "Lançado à mão",
  descricao: "Problema " + nPlano,
  acao: null,
  responsavel: null,
  prazo: null,
  prioridade: "media",
  status: "pendente",
  dataConclusao: null,
  evidencia: null,
  observacoes: null,
  verificadoEm: null,
  criadoEm: "2026-11-01T10:00:00Z",
  ...over,
});
{
  const aberto = P({ prazo: "2026-11-20" });
  const venc = P({ prazo: "2026-11-17", status: "em_andamento", acao: "x" });
  const hojeP = P({ prazo: HOJE });
  const semPrazo = P({});
  const conc = P({ prazo: "2026-11-01", status: "concluido", acao: "x", dataConclusao: "2026-11-05" });
  const canc = P({ prazo: "2026-11-01", status: "cancelado" });
  igual([aberto, venc, hojeP, semPrazo, conc, canc].map((p) => situacaoPlano(p, HOJE)), ["pendente", "atrasado", "pendente", "pendente", "concluido", "cancelado"], "situação derivada: só aberto com prazo vencido é atrasado (hoje ainda vale)");
  igual([aberto, venc, conc, canc].map(estaAberto), [true, true, false, false], "aberto = pendente ou em andamento");
  igual([venc, aberto, conc].map((p) => estaAtrasado(p, HOJE)), [true, false, false], "atrasado");
  igual([venc, aberto, conc].map((p) => diasDeAtraso(p, HOJE)), [1, 0, 0], "dias de atraso");
  igual(diasDeAtraso(P({ prazo: "2026-10-18" }), HOJE), 31, "31 dias de atraso (cruzando o mês)");
  igual(diasDeAtraso(P({ prazo: "2025-12-31" }), "2026-01-01"), 1, "1 dia de atraso (cruzando o ano)");
  igual(["atrasado", "em_andamento", "concluido", "pendente", "cancelado"].map(tomDaSituacao), ["bad", "warn", "ok", "neu", "neu"], "cor da situação");
  igual(["atrasado", "pendente", "em_andamento", "concluido", "cancelado"].map(rotuloSituacao), ["Atrasado", "Pendente", "Em andamento", "Concluído", "Cancelado"], "rótulos das cinco situações do Comando Mestre");
  igual([conc, P({ status: "concluido", acao: "x", verificadoEm: "2026-11-06T10:00:00Z" }), aberto].map(aguardaVerificacao), [true, false, false], "concluído sem verificação aguarda verificação");
  igual([null, "", "2026-11-18", "2026-11-19", "2026-11-17"].map((p) => prazoValido(p, HOJE)), [true, true, true, true, false], "prazo não pode estar no passado (hoje vale; sem prazo vale)");
  igual(ORIGENS_PLANO.map((o) => o.v), ["qualidade", "delivery", "indicador", "manual"], "origens");
}

/* ---- filtros, ordem e resumo */
{
  nPlano = 0;
  const lista = [
    P({ id: "a", lojaId: "L1", prazo: "2026-11-10", prioridade: "alta", descricao: "Câmara fria desregulada", acao: "Chamar técnico", responsavel: "Caio", status: "em_andamento", criadoEm: "2026-11-02T10:00:00Z" }),
    P({ id: "b", lojaId: "L1", prazo: "2026-11-25", prioridade: "baixa", descricao: "Etiquetas sem validade", criadoEm: "2026-11-03T10:00:00Z" }),
    P({ id: "c", lojaId: "L2", prazo: "2026-11-05", prioridade: "media", descricao: "Embalagem sem selo", origemTipo: "qualidade", origemId: "v1", origemRef: "2-1", criadoEm: "2026-11-04T10:00:00Z" }),
    P({ id: "d", lojaId: "L2", status: "concluido", acao: "Trocado", dataConclusao: "2026-11-12", descricao: "Ralo entupido", criadoEm: "2026-11-05T10:00:00Z" }),
    P({ id: "e", lojaId: "L2", status: "concluido", acao: "Revisado", dataConclusao: "2026-11-14", verificadoEm: "2026-11-15T10:00:00Z", descricao: "Cardápio desatualizado", criadoEm: "2026-11-06T10:00:00Z" }),
    P({ id: "f", lojaId: "L3", status: "cancelado", descricao: "Duplicado", criadoEm: "2026-11-07T10:00:00Z" }),
    P({ id: "g", lojaId: "L1", prazo: "2026-11-25", prioridade: "alta", descricao: "Preparo acima da meta", origemTipo: "delivery", origemId: "d1", origemRef: "ind-preparo", criadoEm: "2026-11-08T10:00:00Z" }),
    P({ id: "h", lojaId: "L1", prazo: "2026-11-25", prioridade: "alta", descricao: "Sem prazo vencido", criadoEm: "2026-11-09T10:00:00Z" }),
  ];
  const ids = (f) => filtrarPlanos(lista, { ...FILTRO_VAZIO, ...f }, HOJE, (id) => ({ L1: "Brooklyn", L2: "Perdizes", L3: "Vila Mariana" })[id]).map((p) => p.id).sort();
  igual(ids({}), ["a", "b", "c", "g", "h"], "filtro padrão: em aberto");
  igual(ids({ situacao: "todas" }), ["a", "b", "c", "d", "e", "f", "g", "h"], "todos");
  igual(ids({ situacao: "atrasado" }), ["a", "c"], "atrasados");
  igual(ids({ situacao: "pendente" }), ["b", "c", "g", "h"], "pendentes");
  igual(ids({ situacao: "em_andamento" }), ["a"], "em andamento");
  igual(ids({ situacao: "concluido" }), ["d", "e"], "concluídos");
  igual(ids({ situacao: "verificar" }), ["d"], "aguardando verificação");
  igual(ids({ situacao: "cancelado" }), ["f"], "cancelados");
  igual(ids({ situacao: "todas", loja: "L2" }), ["c", "d", "e"], "por loja");
  igual(ids({ situacao: "todas", origem: "qualidade" }), ["c"], "por origem");
  igual(ids({ situacao: "todas", origem: "delivery" }), ["g"], "por origem: delivery");
  igual(ids({ situacao: "todas", prioridade: "alta" }), ["a", "g", "h"], "por prioridade");
  igual(ids({ situacao: "todas", origemId: "v1" }), ["c"], "só os planos de um registro");
  igual(ids({ situacao: "todas", texto: "camara" }), ["a"], "busca ignora acento e caixa");
  igual(ids({ situacao: "todas", texto: "CAIO" }), ["a"], "busca no responsável");
  igual(ids({ situacao: "todas", texto: "perdizes" }), ["c", "d", "e"], "busca no nome da loja");
  igual(ids({ situacao: "todas", texto: "  " }), ["a", "b", "c", "d", "e", "f", "g", "h"], "busca em branco não filtra");
  igual(ids({ situacao: "atrasado", loja: "L1", prioridade: "alta" }), ["a"], "filtros combinados");
  igual(SITUACOES_FILTRO.map((s) => s.v), ["abertos", "atrasado", "pendente", "em_andamento", "verificar", "concluido", "cancelado", "todas"], "opções de situação do filtro");

  igual(ordenarPlanos(lista, HOJE).map((p) => p.id), ["c", "a", "h", "g", "b", "d", "e", "f"], "ordem: atrasados (prazo mais antigo antes); abertos por prazo, depois prioridade, depois o mais novo; a verificar; verificados; cancelados");
  const antes = lista.map((p) => p.id).join();
  ordenarPlanos(lista, HOJE);
  igual(lista.map((p) => p.id).join(), antes, "ordenar não mexe na lista original");

  const r = resumirPlanos(lista, HOJE);
  igual({ ...r, taxaConclusao: Math.round(r.taxaConclusao * 10) / 10 }, { total: 8, abertos: 5, pendentes: 4, emAndamento: 1, atrasados: 2, concluidos: 2, cancelados: 1, aguardandoVerificacao: 1, verificados: 1, taxaConclusao: 28.6 }, "resumo: cancelados não entram na taxa (2 concluídos de 7)");
  igual(resumirPlanos([], HOJE).taxaConclusao, null, "sem planos: sem taxa");
  igual(resumirPlanos([P({ status: "cancelado" })], HOJE).taxaConclusao, null, "só cancelados: sem taxa");
  igual(resumirPlanos([P({ status: "concluido", acao: "x" })], HOJE).taxaConclusao, 100, "tudo concluído: 100%");

  igual(pendenciasPorLoja(lista, HOJE), [
    { lojaId: "L1", abertos: 4, atrasados: 1, aguardandoVerificacao: 0 },
    { lojaId: "L2", abertos: 1, atrasados: 1, aguardandoVerificacao: 1 },
  ].sort((x, y) => y.atrasados - x.atrasados || y.abertos - x.abertos), "pendências por loja: críticas primeiro; loja só com cancelado não aparece");
  igual(pendenciasPorLoja([], HOJE), [], "sem planos, sem pendências");

  const c = contarPorOrigem(lista);
  igual([...c.entries()], [["v1", { total: 1, abertos: 1 }], ["d1", { total: 1, abertos: 1 }]], "planos por registro de origem (os manuais não entram)");
}

/* ---- duplicados */
{
  nPlano = 0;
  const lista = [
    P({ id: "a", lojaId: "L1", descricao: "Câmara fria desregulada" }),
    P({ id: "b", lojaId: "L1", descricao: "Piso quebrado", status: "concluido", acao: "x" }),
    P({ id: "c", lojaId: "L2", descricao: "Piso quebrado" }),
  ];
  igual(planoDuplicado(lista, { lojaId: "L1", descricao: "  camara  FRIA   desregulada " }), "a", "duplicado: mesma loja, mesma descrição (sem acento, caixa ou espaços repetidos)");
  igual(planoDuplicado(lista, { lojaId: "L2", descricao: "Câmara fria desregulada" }), null, "outra loja não é duplicado");
  igual(planoDuplicado(lista, { lojaId: "L1", descricao: "Piso quebrado" }), null, "plano concluído não conta (o problema pode voltar)");
  igual(planoDuplicado(lista, { lojaId: "L1", descricao: "Câmara fria desregulada" }, "a"), null, "editar o próprio plano não é duplicado");
  igual(planoDuplicado([], { lojaId: "L1", descricao: "x" }), null, "sem planos, sem duplicado");
  igual(normalizarTexto("  Ação   Corretiva\tÉ  "), "acao corretiva e", "normalizar texto");
}

/* ---- histórico de alterações */
{
  igual(descreverAlteracao("insert", null, { status: "pendente" }), ["Plano criado"], "histórico: criação");
  igual(descreverAlteracao("delete", { status: "pendente" }, null), ["Plano excluído"], "histórico: exclusão");
  const a = { status: "pendente", acao: null, prazo: null, prioridade: "media", responsavel: "Ana", verificado_em: null, origem_id: "v1", descricao: "d" };
  igual(descreverAlteracao("update", a, { ...a, status: "em_andamento", acao: "Chamar técnico", prazo: "2026-11-20" }), ["Situação: Pendente → Em andamento", "Ação: — → Chamar técnico", "Prazo: — → 20/11/2026"], "histórico: o que mudou, campo a campo");
  igual(descreverAlteracao("update", a, { ...a, verificado_em: "2026-11-18T10:00:00Z" }), ["Verificação: sem verificação → verificado"], "histórico: verificação");
  igual(descreverAlteracao("update", a, { ...a, origem_id: null }), ["Vínculo com o registro de origem: mantido → desfeito"], "histórico: vínculo desfeito ao excluir a origem");
  igual(descreverAlteracao("update", a, { ...a }), [], "histórico: nada mudou");
  const longo = descreverAlteracao("update", a, { ...a, acao: "x".repeat(200) })[0];
  assert(longo.length < 120 && longo.includes("…"), "histórico: texto longo é encurtado");
}

/* ---- CSV dos planos */
{
  nPlano = 0;
  const csv = linhasCsvPlanos(
    [P({ lojaId: "L1", origemTipo: "qualidade", origemRotulo: "Visita de qualidade de 10/11/2026 · seção 1", descricao: "Fichas técnicas", acao: "Treinar", responsavel: "Bia", prazo: "2026-11-10", prioridade: "alta", status: "em_andamento" }), P({ lojaId: "L2", status: "concluido", acao: "x", dataConclusao: "2026-11-12", verificadoEm: "2026-11-13T09:00:00Z", evidencia: "foto" })],
    (id) => ({ L1: "Brooklyn", L2: "Perdizes" })[id],
    HOJE,
  );
  igual(csv[0], ["Loja", "Origem", "Referência da origem", "Descrição", "Ação", "Responsável", "Prazo", "Prioridade", "Situação", "Dias de atraso", "Concluído em", "Evidência", "Verificado em", "Observações"], "colunas do CSV dos planos");
  igual(csv[1].slice(0, 10), ["Brooklyn", "Checklist de qualidade", "Visita de qualidade de 10/11/2026 · seção 1", "Fichas técnicas", "Treinar", "Bia", "2026-11-10", "Alta", "Atrasado", 8], "linha de plano atrasado");
  igual(csv[2].slice(8), ["Concluído", "", "2026-11-12", "foto", "2026-11-13", ""], "linha de plano concluído e verificado");
}

/* ---- geração a partir do delivery */
{
  igual(textoGeracaoPlanos({ criados: 2, existentes: 1, retirados: 0, cancelados: 0 }), "2 planos criados; 1 desvio já tinha plano.", "texto: criados e existentes");
  igual(textoGeracaoPlanos({ criados: 1, existentes: 0, retirados: 1, cancelados: 2 }), "1 plano criado; 1 plano retirado (o desvio deixou de existir); 2 planos cancelados (o desvio deixou de existir, mas já tinha ação).", "texto: retirados e cancelados");
  igual(textoGeracaoPlanos({ criados: 0, existentes: 0, retirados: 0, cancelados: 0 }), "Este checklist não tem desvios: nenhum plano a gerar.", "texto: nada a gerar");

  const reg = { lojaId: "L1", data: "2026-11-16", periodo: "diario", preparo: 22, cancelamentos: 1, notaIfood: 4.2, tempoOnline: 99, rupturas: null, rotina: { 0: "sim", 2: "nao", 5: "nao", 6: "na" } };
  const av = avaliarRegistro(reg, []);
  igual(av.desvios.map((d) => d.ref), ["ind-preparo", "ind-ifood", "rotina-2", "rotina-5"], "cada desvio tem uma referência estável (indicador ou item da rotina)");
  assert(new Set(av.desvios.map((d) => d.ref)).size === av.desvios.length, "referências não se repetem");
  const sug = planosSugeridos(av.desvios);
  igual(sug.map((s) => s.ref), ["ind-preparo", "ind-ifood", "rotina-2", "rotina-5"], "um plano sugerido por desvio");
  igual(sug.map((s) => s.prioridade), av.desvios.map((d) => (d.tipo === "indicador" && d.status === "bad" ? "alta" : "media")), "prioridade: indicador crítico = alta; o resto = média");
  igual(sug[2].descricao, "Rotina de delivery não cumprida: " + ROTINA_DELIVERY[2], "texto do plano de rotina");
  assert(sug[0].descricao.startsWith("Tempo médio de preparo fora da meta: "), "texto do plano de indicador");
  assert(sug.every((s) => s.descricao.length <= 500), "descrição cabe no limite do banco");
  const de = avaliarRegistro({ ...reg, preparo: 10, notaIfood: 4.9, rotina: {} }, []);
  igual(planosSugeridos(de.desvios), [], "sem desvio, sem plano");
  igual(rotuloOrigemDelivery({ data: "2026-11-16", periodo: "diario" }), "Checklist de delivery de 16/11/2026", "rótulo da origem: diário");
  igual(rotuloOrigemDelivery({ data: "2026-11-16", periodo: "semanal" }), "Checklist de delivery da semana de 16/11/2026", "rótulo da origem: semanal");
}

/* ---- determinismo */
{
  const Q = gerarRespostas(0.7, 0.2, 0.05, 0.3);
  igual(resumirVisita(Q), resumirVisita(JSON.parse(JSON.stringify(Q))), "mesmos dados, mesmo resultado");
}

console.log(`rede-qual-tests: ${pass} verificações ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
