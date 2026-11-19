#!/usr/bin/env node
/**
 * Testes da cozinha central (rupturas e estoque) e do checklist de delivery da rede de lojas.
 * 1) Paridade com o painel original: as contas do HTML (ccRup, estStatus, ccEst, status, rotina) foram
 *    transcritas abaixo, linha a linha, e rodam sobre os mesmos dados (scripts/fixtures/rede-html-cozinha.json:
 *    105 rupturas e 20 itens de estoque). O resultado das funções do app precisa bater.
 * 2) Regras do sistema: régua da meta por loja, semanas, indicador mensal de rupturas (sem dupla contagem),
 *    médias do delivery, avaliação do checklist, dados vazios e sujos, determinismo.
 * Node com --experimental-strip-types.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  META_RUPTURAS_SEMANA,
  SEMANAS_NA_RUPTURA,
  coberturaDias,
  indicadoresRupturas,
  reposicaoSugerida,
  resumirEstoque,
  resumirRupturas,
  rupturasPorProduto,
  statusEstoque,
  statusRupturasSemana,
} from "../lib/rede/cozinha.ts";
import {
  ACOMPANHAMENTOS_DELIVERY,
  FONTE_CALCULADA,
  METAS_DELIVERY,
  ROTINA_DELIVERY,
  avaliarRegistro,
  dataDoRegistro,
  indicadoresDelivery,
  linhasCsvDelivery,
  linhasCsvEstoque,
  linhasCsvRupturas,
  metaDoDelivery,
  resumirRotina,
  textoMetaDelivery,
} from "../lib/rede/delivery.ts";
import { mesclarIndicadores } from "../lib/rede/financeiro.ts";
import { MOTIVOS_RUPTURA } from "../lib/rede/tipos.ts";

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    console.error("FALHOU:", msg);
  }
}
const perto = (a, b, tol = 1e-9) => a != null && b != null && Math.abs(a - b) <= tol;
function igual(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg} — obtido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`);
}

const aqui = dirname(fileURLToPath(import.meta.url));
const G = JSON.parse(readFileSync(join(aqui, "fixtures", "rede-html-cozinha.json"), "utf8"));

/* ================================================================== paridade: transcrição do HTML */

// HTML L1213
const semanaDeHtml = (iso) => {
  const d = new Date(iso + "T12:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};
// HTML L1211
const RUP_MOT = ["Falta na cozinha central", "Atraso na entrega", "Erro no pedido da loja", "Problema de qualidade", "Demanda acima do previsto"];
igual([...MOTIVOS_RUPTURA], RUP_MOT, "5 motivos de ruptura = os do HTML, na mesma ordem");

const LOJAS = ["brooklyn", "perdizes", "vilamariana", "tatuape"];
const rupturas = G.rupturas.map((r, i) => ({ id: `r${i}`, lojaId: r.loja, data: r.data, item: r.item, motivo: r.motivo, horas: r.horas || 0, acao: r.acao || null, origem: "exemplo" }));
assert(rupturas.length === 105, "gabarito: 105 rupturas");
assert(G.estoque.length === 20, "gabarito: 20 itens de estoque");

// ccRup (HTML L1219–1236), transcrito
{
  const rs = G.rupturas;
  const sems = [...new Set(rs.map((r) => semanaDeHtml(r.data)))].sort().slice(-6);
  const lojas = LOJAS.filter((id) => rs.some((r) => r.loja === id));
  const cnt = (id, s) => rs.filter((r) => r.loja === id && semanaDeHtml(r.data) === s).length;
  const lastS = sems.at(-1);
  const lastRs = rs.filter((r) => semanaDeHtml(r.data) === lastS);
  const ccRs = rs.filter((r) => sems.includes(semanaDeHtml(r.data)));
  const horas = ccRs.reduce((a, r) => a + (+r.horas || 0), 0);
  const pctCC = ccRs.length ? (ccRs.filter((r) => r.motivo === "Falta na cozinha central" || r.motivo === "Atraso na entrega").length / ccRs.length) * 100 : 0;
  const byItem = {};
  ccRs.forEach((r) => (byItem[r.item] = (byItem[r.item] || 0) + 1));
  const top = Object.entries(byItem).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const byMot = RUP_MOT.map((m) => ccRs.filter((r) => r.motivo === m).length);

  const r = resumirRupturas({ rupturas, lojasOrdem: LOJAS });
  igual(r.semanas, sems, "paridade: últimas 6 semanas com ruptura");
  assert(r.semanas.length > 0 && r.semanas.length <= SEMANAS_NA_RUPTURA, "no máximo 6 semanas na tela");
  igual(r.semanas, ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"], "o gabarito tem 4 semanas com ruptura (05/10 a 26/10)");
  igual(r.ultimaSemana, lastS, "paridade: última semana");
  assert(r.naUltimaSemana === lastRs.length, `paridade: rupturas na última semana (${r.naUltimaSemana} × ${lastRs.length})`);
  assert(r.lojasAcima === lojas.filter((id) => cnt(id, lastS) > 5).length, "paridade: lojas acima da meta (mais de 5 na semana)");
  assert(r.horas === horas, `paridade: horas indisponível (${r.horas} × ${horas})`);
  assert(perto(r.pctCentral, pctCC), `paridade: % causadas pela cozinha central (${r.pctCentral} × ${pctCC})`);
  assert(r.totalNaTela === ccRs.length, "paridade: total de rupturas nas semanas da tela");
  igual(r.motivos.map((m) => m.total), byMot, "paridade: rupturas por motivo");
  igual(r.motivos.map((m) => m.motivo), RUP_MOT, "paridade: motivos na ordem do HTML");

  igual(r.porLoja.map((l) => l.lojaId), lojas, "paridade: só entram lojas com ruptura, na ordem do HTML");
  for (const l of r.porLoja) {
    const v = sems.map((s) => cnt(l.lojaId, s));
    igual(l.contagens, v, `paridade: contagem por semana de ${l.lojaId}`);
    assert(perto(l.media, v.reduce((a, b) => a + b, 0) / v.length), `paridade: média de ${l.lojaId}`);
    igual(l.status, v.map((x) => (x <= 5 ? "ok" : x <= 6 ? "warn" : "bad")), `paridade: cor da célula de ${l.lojaId} (até 5 ok, 6 atenção, mais crítico)`);
  }

  // ranking de itens: mesma sequência de totais e mesmos itens acima do corte (empates podem trocar de ordem)
  igual(r.itens.map((i) => i.total), top.map((t) => t[1]), "paridade: totais do ranking de itens");
  const corte = top[top.length - 1][1];
  igual(
    r.itens.filter((i) => i.total > corte).map((i) => i.item).sort(),
    top.filter((t) => t[1] > corte).map((t) => t[0]).sort(),
    "paridade: itens do ranking acima do corte",
  );
  assert(r.itens.length === 8, "ranking tem 8 itens");
  for (const i of r.itens) assert(byItem[i.item] === i.total, `paridade: total do item ${i.item}`);
}

// estStatus / ccEst (HTML L1241–1258), transcrito
{
  const estStatusHtml = (i) => {
    const cob = i.consumoDia ? i.atual / i.consumoDia : Infinity;
    return i.atual < i.minimo ? ["Crítico", "bad"] : i.atual < i.minimo * 1.5 || cob < 3 ? ["Atenção", "warn"] : ["OK", "ok"];
  };
  const es = G.estoque;
  const produtos = es.map((e, i) => ({ id: `p${i}`, item: e.item, unidade: e.un, atual: e.atual, minimo: e.minimo, consumoDia: e.consumoDia, custo: e.custo, origem: "exemplo" }));
  const resumo = resumirEstoque(produtos);
  const crit = es.filter((i) => estStatusHtml(i)[1] === "bad").length;
  const at = es.filter((i) => estStatusHtml(i)[1] === "warn").length;
  const val = es.reduce((a, i) => a + i.atual * i.custo, 0);
  const cobs = es.filter((i) => i.consumoDia > 0).map((i) => i.atual / i.consumoDia);

  assert(resumo.itens === es.length, "paridade: número de itens");
  assert(resumo.criticos === crit, `paridade: itens críticos (${resumo.criticos} × ${crit})`);
  assert(resumo.atencao === at, `paridade: itens em atenção (${resumo.atencao} × ${at})`);
  assert(perto(resumo.valor, val, 1e-6), `paridade: valor em estoque (${resumo.valor} × ${val})`);
  assert(perto(resumo.coberturaMedia, cobs.reduce((a, b) => a + b, 0) / cobs.length), "paridade: cobertura média");
  assert(at >= 1 && crit === 0, "o gabarito tem 1 item em atenção e nenhum crítico (o crítico é exercitado nos casos de limite abaixo)");

  for (const p of produtos) {
    const html = estStatusHtml(p);
    const s = statusEstoque(p);
    assert(s.rotulo === html[0] && s.tom === html[1], `paridade: status de ${p.item} (${s.rotulo} × ${html[0]})`);
    const rep = Math.max(0, Math.ceil(p.minimo + p.consumoDia * 7 - p.atual));
    assert(reposicaoSugerida(p) === rep, `paridade: reposição de ${p.item} (${reposicaoSugerida(p)} × ${rep})`);
    const cob = p.consumoDia ? p.atual / p.consumoDia : null;
    assert(coberturaDias(p) === cob, `paridade: cobertura de ${p.item}`);
  }

  // ordem da tabela: crítico, atenção, OK; dentro do grupo, alfabética
  const grupos = resumo.linhas.map((l) => l.status.tom);
  const ordem = { bad: 0, warn: 1, ok: 2 };
  assert(grupos.every((t, i) => i === 0 || ordem[grupos[i - 1]] <= ordem[t]), "paridade: itens mais urgentes primeiro");
  for (const tom of ["bad", "warn", "ok"]) {
    const nomes = resumo.linhas.filter((l) => l.status.tom === tom).map((l) => l.produto.item);
    igual(nomes, [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR")), `ordem alfabética dentro do grupo ${tom}`);
  }
}

// CSV de rupturas: mesmo cabeçalho e colunas do HTML (L1290)
{
  const csv = linhasCsvRupturas(rupturas.slice(0, 2), (id) => id.toUpperCase());
  igual(csv[0], ["Data", "Loja", "Item", "Motivo", "Horas", "Ação"], "CSV de rupturas: cabeçalho do HTML");
  assert(csv.length === 3 && csv[1][1] === "BROOKLYN", "CSV de rupturas: uma linha por ruptura, com o nome da loja");
}

// delivery: textos e metas do HTML (L579–592)
{
  igual(
    [...ROTINA_DELIVERY],
    [
      "Cardápio sem itens indisponíveis ativos",
      "Itens em falta pausados nas plataformas",
      "Avaliações e reclamações respondidas",
      "Campanhas e combos ativos revisados",
      "Raio de entrega e taxa revisados",
      "Conferência e embalagem auditadas no pico",
      "Motivos de cancelamento analisados",
    ],
    "7 itens da rotina de delivery com os textos do HTML",
  );
  const metasHtml = [
    { k: "preparo", n: "Tempo médio de preparo", meta: 15, t: "max", txt: "meta: até 15 min" },
    { k: "cancel", n: "Cancelamentos", meta: 2, t: "max", txt: "meta: até 2%" },
    { k: "ifood", n: "Nota iFood", meta: 4.7, t: "min", txt: "meta: pelo menos 4,7" },
    { k: "online", n: "Tempo online", meta: 97, t: "min", txt: "meta: pelo menos 97%" },
    { k: "rupturas", n: "Rupturas na semana", meta: 5, t: "max", txt: "meta: até 5 por semana" },
  ];
  assert(METAS_DELIVERY.length === 5, "5 indicadores com meta no delivery");
  metasHtml.forEach((h, i) => {
    const d = METAS_DELIVERY[i];
    assert(d.k === h.k && d.nome === h.n && d.metaPadrao === h.meta && d.direcao === h.t, `delivery: definição de ${h.k}`);
    igual(textoMetaDelivery(d, d.metaPadrao, d.direcao), h.txt, `delivery: texto da meta de ${h.k}`);
  });
  igual(
    ACOMPANHAMENTOS_DELIVERY.map((a) => a.nome),
    ["Pedidos", "Ticket médio", "Conversão", "Atrasos", "Comissões e taxas", "Frete subsidiado", "Promoções e descontos", "Custo de delivery por pedido"],
    "8 itens de acompanhamento, na ordem do HTML",
  );

  // status() do HTML (L611): meta/valor, tolerância de 10%
  const statusHtml = (m, v) => {
    if (m.meta == null || v == null || isNaN(v)) return "neu";
    const ok = m.t === "min" ? v >= m.meta : v <= m.meta;
    if (ok) return "ok";
    const off = m.t === "min" ? (m.meta - v) / m.meta : (v - m.meta) / m.meta;
    return off <= 0.1 ? "warn" : "bad";
  };
  const casos = {
    preparo: [10, 15, 15.1, 16.5, 16.6, 30, 0],
    cancel: [0, 2, 2.1, 2.15, 2.3, 8],
    ifood: [5, 4.7, 4.69, 4.23, 4.22, 3, 0],
    online: [100, 97, 96.9, 90, 87.2, 50],
    rupturas: [0, 5, 6, 5.5, 5.6, 9],
  };
  for (const h of metasHtml) {
    const def = METAS_DELIVERY.find((d) => d.k === h.k);
    for (const v of casos[h.k]) {
      const reg = { lojaId: "x", data: "2026-10-26", periodo: "semanal", preparo: null, cancelamentos: null, notaIfood: null, tempoOnline: null, rupturas: null, rotina: {} };
      reg[def.campo] = v;
      const av = avaliarRegistro(reg, [], 10).metas.find((m) => m.k === h.k);
      assert(av.status === statusHtml(h, v), `paridade status(${h.k}, ${v}): ${av.status} × ${statusHtml(h, v)}`);
    }
    // vazio = neutro
    const vazio = avaliarRegistro({ lojaId: "x", data: "2026-10-26", periodo: "semanal", preparo: null, cancelamentos: null, notaIfood: null, tempoOnline: null, rupturas: null, rotina: {} }, [], 10);
    assert(vazio.metas.every((m) => m.status === "neu") && vazio.preenchidos === 0, "registro sem valores: tudo neutro, 0 preenchidos");
  }

  // pontuação do HTML: "X de N preenchidos na meta" e "X de Y itens ok"
  const reg = { lojaId: "x", data: "2026-10-26", periodo: "semanal", preparo: 14, cancelamentos: 3, notaIfood: 4.8, tempoOnline: null, rupturas: 5, rotina: { 0: "sim", 1: "sim", 2: "nao", 3: "na" } };
  const av = avaliarRegistro(reg, [], 10);
  assert(av.preenchidos === 4 && av.naMeta === 3, `preenchidos/na meta (${av.preenchidos}/${av.naMeta})`);
  assert(av.rotina.sim === 2 && av.rotina.nao === 1 && av.rotina.na === 1 && av.rotina.aplicaveis === 3 && av.rotina.respondidos === 4, "rotina: 2 sim, 1 não, 1 N/A");
  assert(perto(av.rotina.pct, (2 / 3) * 100), "rotina: % = sim ÷ (sim + não)");
  assert(av.desvios.some((d) => d.tipo === "indicador" && d.titulo === "Cancelamentos"), "desvio: cancelamentos fora da meta");
  assert(av.desvios.some((d) => d.tipo === "rotina" && d.titulo === ROTINA_DELIVERY[2]), "desvio: item da rotina marcado Não");
  assert(!av.desvios.some((d) => d.titulo === ROTINA_DELIVERY[3]), "N/A não é desvio");
  assert(resumirRotina({}).pct === null, "rotina sem respostas: sem percentual");

  // CSV de delivery: colunas do HTML (L1293)
  const csv = linhasCsvDelivery(
    [{ id: "d1", lojaId: "b", data: "2026-10-26", periodo: "semanal", responsavel: "Ana", preparo: 14, cancelamentos: null, notaIfood: 4.8, tempoOnline: 98, rupturas: 3, pedidos: 100, ticketMedio: 55.5, conversao: null, atrasos: null, comissoes: null, freteSubsidiado: null, promocoes: null, custoPedido: null, rotina: { 0: "sim", 2: "nao", 3: "na" }, observacoes: "ok", origem: "manual" }],
    () => "Brooklyn",
  );
  igual(
    csv[0],
    ["Data", "Loja", "Período", "Responsável", ...metasHtml.map((m) => m.n), ...ACOMPANHAMENTOS_DELIVERY.map((a) => a.nome), ...ROTINA_DELIVERY, "Observações"],
    "CSV de delivery: cabeçalho do HTML",
  );
  igual(csv[1].slice(0, 4), ["2026-10-26", "Brooklyn", "Semanal", "Ana"], "CSV de delivery: identificação");
  igual(csv[1].slice(csv[1].length - 8, csv[1].length - 1), ["Sim", "", "Não", "N/A", "", "", ""], "CSV de delivery: rotina Sim/Não/N/A, vazio quando sem resposta");
}

/* ================================================================== regras do sistema */

// régua da tabela de rupturas
assert(statusRupturasSemana(0, 5) === "ok" && statusRupturasSemana(5, 5) === "ok", "até a meta = ok");
assert(statusRupturasSemana(6, 5) === "warn", "meta + 1 = atenção");
assert(statusRupturasSemana(7, 5) === "bad", "acima = crítico");
assert(statusRupturasSemana(3, 3) === "ok" && statusRupturasSemana(4, 3) === "warn" && statusRupturasSemana(5, 3) === "bad", "régua acompanha a meta da loja");
assert(META_RUPTURAS_SEMANA === 5, "meta padrão do HTML: 5 por semana");

const R = (lojaId, data, extra = {}) => ({ id: `x${Math.random()}`, lojaId, data, item: "Arroz", motivo: "Falta na cozinha central", horas: 1, acao: null, origem: "manual", ...extra });

// meta por loja e meta padrão
{
  const rs = [...Array.from({ length: 5 }, () => R("a", "2026-10-27")), ...Array.from({ length: 5 }, () => R("b", "2026-10-27"))];
  const r = resumirRupturas({ rupturas: rs, lojasOrdem: ["a", "b"], metaPadrao: 5, metas: { a: 3, b: null } });
  igual(r.porLoja.map((l) => l.status[0]), ["bad", "ok"], "meta da loja (3) vale sobre a padrão; sem meta da loja, vale a padrão (5)");
  assert(r.lojasAcima === 1, "lojas acima da meta usa a meta de cada loja");
}

// vazio, sujo e determinismo
{
  const v = resumirRupturas({ rupturas: [], lojasOrdem: ["a"] });
  assert(v.semanas.length === 0 && v.ultimaSemana === null && v.naUltimaSemana === 0 && v.horas === 0 && v.pctCentral === 0 && v.porLoja.length === 0, "sem rupturas: zeros, sem NaN");
  const sujo = resumirRupturas({ rupturas: [R("a", "2026-10-27", { horas: Number.NaN })], lojasOrdem: ["a"] });
  assert(sujo.horas === 0, "horas inválidas contam como zero");
  const ordenadas = rupturas.slice();
  const embaralhadas = rupturas.slice().reverse();
  igual(resumirRupturas({ rupturas: ordenadas, lojasOrdem: LOJAS }), resumirRupturas({ rupturas: embaralhadas, lojasOrdem: LOJAS }), "resultado não depende da ordem das rupturas (determinístico, inclusive nos empates do ranking)");
  const sem7 = resumirRupturas({ rupturas: Array.from({ length: 8 }, (_, i) => R("a", `2026-0${i + 1}-05`)), lojasOrdem: ["a"] });
  assert(sem7.semanas.length === 6, "mostra no máximo 6 semanas");
}

// semana começa na segunda: domingo fica na semana anterior
{
  const r = resumirRupturas({ rupturas: [R("a", "2026-11-01"), R("a", "2026-11-02")], lojasOrdem: ["a"] });
  igual(r.semanas, ["2026-10-26", "2026-11-02"], "domingo 01/11 é da semana de 26/10; segunda 02/11 abre outra");
}

// rupturas por produto: ignora acento e caixa; só semanas mostradas
{
  const prods = [
    { id: "p1", item: "Salmão", unidade: "kg", atual: 1, minimo: 1, consumoDia: 1, custo: 1, origem: "manual" },
    { id: "p2", item: "Alga nori", unidade: "un", atual: 1, minimo: 1, consumoDia: 1, custo: 1, origem: "manual" },
  ];
  const rs = [R("a", "2026-10-27", { item: "salmao" }), R("a", "2026-10-28", { item: " SALMÃO " }), R("a", "2026-09-01", { item: "Salmão" })];
  const m = rupturasPorProduto(rs, prods, ["2026-10-26"]);
  assert(m.get("p1") === 2 && m.get("p2") === 0, "conta rupturas do produto sem diferenciar acento/caixa e só nas semanas pedidas");
}

// indicador mensal de rupturas
{
  const hoje = "2026-11-18";
  const rs = [
    R("a", "2026-10-27"), R("a", "2026-10-28"), R("a", "2026-11-02"), R("a", "2026-11-03"), R("a", "2026-11-03"),
    R("b", "2026-11-12"),
    R("a", "2026-11-25"), // semana futura: não conta
  ];
  const ind = indicadoresRupturas(rs, hoje);
  const a10 = ind.find((i) => i.lojaId === "a" && i.mes === "2026-10-01");
  const a11 = ind.find((i) => i.lojaId === "a" && i.mes === "2026-11-01");
  const b11 = ind.find((i) => i.lojaId === "b" && i.mes === "2026-11-01");
  // outubro: semanas que começam em outubro = 05, 12, 19, 26 → 2 rupturas em 4 semanas
  assert(a10 && perto(a10.valor, 2 / 4), `a/out = 2 ÷ 4 semanas (${a10?.valor})`);
  // novembro até 18/11: semanas que começam em novembro e já começaram = 02, 09, 16 → 3 rupturas em 3 semanas
  assert(a11 && perto(a11.valor, 3 / 3), `a/nov = 3 ÷ 3 semanas já iniciadas (${a11?.valor})`);
  assert(b11 && perto(b11.valor, 1 / 3), `b/nov: semanas sem registro contam zero (${b11?.valor})`);
  assert(!ind.some((i) => i.lojaId === "b" && i.mes === "2026-10-01"), "loja sem nenhuma ruptura no mês não gera valor (fica o lançado à mão)");
  assert(ind.every((i) => i.indicador === "rupturas" && i.origem === "calculado"), "origem calculado, indicador rupturas");
  const ordenado = [...ind].sort((x, y) => x.mes.localeCompare(y.mes) || x.lojaId.localeCompare(y.lojaId));
  igual(ind, ordenado, "saída ordenada por mês e loja");
  igual(indicadoresRupturas([...rs].reverse(), hoje), ind, "independe da ordem da entrada");
  igual(indicadoresRupturas([], hoje), [], "sem rupturas: nada");
  // sem dupla contagem: o valor calculado substitui o lançado à mão
  const lancado = [{ lojaId: "a", mes: "2026-11-01", indicador: "rupturas", valor: 99, origem: "manual" }, { lojaId: "b", mes: "2026-10-01", indicador: "rupturas", valor: 7, origem: "manual" }];
  const mesclado = mesclarIndicadores(lancado, ind);
  assert(mesclado.find((i) => i.lojaId === "a" && i.mes === "2026-11-01").valor === 1, "calculado substitui o lançado (a/nov)");
  assert(mesclado.find((i) => i.lojaId === "b" && i.mes === "2026-10-01").valor === 7, "sem cálculo, vale o lançado à mão (b/out)");
  assert(mesclado.filter((i) => i.lojaId === "a" && i.mes === "2026-11-01").length === 1, "um valor por loja/mês/indicador");
}

// estoque: limites das réguas
{
  const P = (atual, minimo, consumoDia = 0) => ({ atual, minimo, consumoDia });
  assert(statusEstoque(P(9, 10)).rotulo === "Crítico", "abaixo do mínimo = crítico");
  assert(statusEstoque(P(10, 10, 1)).rotulo === "Atenção", "no mínimo (10 < 15) = atenção, não crítico");
  assert(statusEstoque(P(14.9, 10, 1)).rotulo === "Atenção", "abaixo de 1,5× o mínimo = atenção");
  assert(statusEstoque(P(15, 10, 1)).rotulo === "OK", "1,5× o mínimo, 15 dias de cobertura = OK");
  assert(statusEstoque(P(20, 10, 10)).rotulo === "Atenção", "menos de 3 dias de cobertura = atenção");
  assert(statusEstoque(P(30, 10, 10)).rotulo === "OK", "exatamente 3 dias de cobertura = OK");
  assert(statusEstoque(P(30, 10, 0)).rotulo === "OK" && coberturaDias(P(30, 10, 0)) === null, "sem consumo informado: cobertura indefinida, não vira atenção");
  assert(reposicaoSugerida(P(0, 0, 0.1)) === 1, "reposição arredonda para cima (0,7 → 1)");
  assert(reposicaoSugerida(P(100, 10, 1)) === 0, "estoque sobrando: reposição zero, nunca negativa");
  assert(reposicaoSugerida(P(0, 0.1, 0.1)) === 1, "0,1 + 0,1×7 = 0,8 → 1 (sem erro de ponto flutuante)");
  assert(reposicaoSugerida(P(0, 0.3, 0.1)) === 1, "0,3 + 0,7 = 1 exato → 1, não 2 (guarda de ponto flutuante)");
  const vazio = resumirEstoque([]);
  assert(vazio.itens === 0 && vazio.valor === 0 && vazio.criticos === 0 && vazio.coberturaMedia === null, "estoque vazio: zeros, cobertura sem NaN");
  const csv = linhasCsvEstoque(resumirEstoque([{ id: "1", item: "Sal", unidade: "kg", atual: 2, minimo: 5, consumoDia: 1, custo: 3, origem: "manual" }]).linhas);
  igual(csv[0].slice(0, 3), ["Item", "Unidade", "Estoque atual"], "CSV do estoque: cabeçalho");
  assert(csv[1][6] === "Crítico" && csv[1][7] === 10, "CSV do estoque: status e reposição (5 + 1×7 − 2 = 10)");
}

/* ------------------------------------------------------------------ delivery: regras do sistema */

// data do registro semanal = segunda-feira
igual(dataDoRegistro("semanal", "2026-11-04"), "2026-11-02", "semanal vai para a segunda-feira");
igual(dataDoRegistro("semanal", "2026-11-08"), "2026-11-02", "domingo fica na semana anterior");
igual(dataDoRegistro("diario", "2026-11-04"), "2026-11-04", "diário mantém o dia");

// meta: a cadastrada vale sobre a padrão do HTML; direção cadastrada acompanha
{
  const def = METAS_DELIVERY.find((d) => d.k === "preparo");
  igual(metaDoDelivery(def, [], "a", "2026-11-04"), { meta: 15, direcao: "max" }, "sem meta cadastrada: padrão do HTML");
  const metas = [
    { id: "m1", lojaId: null, indicador: "preparo", meta: 12, direcao: "max", validoDe: "2026-01-01", validoAte: null },
    { id: "m2", lojaId: "a", indicador: "preparo", meta: 10, direcao: "max", validoDe: "2026-01-01", validoAte: null },
  ];
  igual(metaDoDelivery(def, metas, "b", "2026-11-04"), { meta: 12, direcao: "max" }, "meta da rede vale para a loja sem meta própria");
  igual(metaDoDelivery(def, metas, "a", "2026-11-04"), { meta: 10, direcao: "max" }, "meta da loja vale sobre a da rede");
  const av = avaliarRegistro({ lojaId: "a", data: "2026-11-04", periodo: "diario", preparo: 11, cancelamentos: null, notaIfood: null, tempoOnline: null, rupturas: null, rotina: {} }, metas, 10);
  assert(av.metas[0].status === "warn", "11 min contra meta 10 (10% de folga) = atenção");
}

// rupturas num registro diário não são comparadas com a meta semanal
{
  const base = { lojaId: "a", data: "2026-11-04", preparo: null, cancelamentos: null, notaIfood: null, tempoOnline: null, rupturas: 12, rotina: {} };
  assert(avaliarRegistro({ ...base, periodo: "diario" }, [], 10).metas.find((m) => m.k === "rupturas").status === "neu", "diário: rupturas sem comparação");
  assert(avaliarRegistro({ ...base, periodo: "semanal" }, [], 10).metas.find((m) => m.k === "rupturas").status === "bad", "semanal: 12 contra 5 = crítico");
}

// limite exato de 10%: o HTML decide pelo ponto flutuante ((2,2−2)/2 = 0,10000000000000009 → "fora"); o app trata
// exatamente 10% como atenção (divergência documentada, a mesma da régua do CMV e dos indicadores)
{
  const reg = (extra) => ({ lojaId: "a", data: "2026-11-04", periodo: "diario", preparo: null, cancelamentos: null, notaIfood: null, tempoOnline: null, rupturas: null, rotina: {}, ...extra });
  assert(avaliarRegistro(reg({ cancelamentos: 2.2 }), [], 10).metas[1].status === "warn", "cancelamentos 2,2 contra 2 = exatamente 10% → atenção");
  assert(avaliarRegistro(reg({ tempoOnline: 87.3 }), [], 10).metas[3].status === "warn", "tempo online 87,3 contra 97 = 10% → atenção");
  assert(avaliarRegistro(reg({ cancelamentos: 2.21 }), [], 10).metas[1].status === "bad", "logo acima do limite = fora");
}

// tolerância configurável
{
  const reg = { lojaId: "a", data: "2026-11-04", periodo: "diario", preparo: 17, cancelamentos: null, notaIfood: null, tempoOnline: null, rupturas: null, rotina: {} };
  assert(avaliarRegistro(reg, [], 10).metas[0].status === "bad", "17 contra 15: 13% de desvio com tolerância 10% = fora");
  assert(avaliarRegistro(reg, [], 15).metas[0].status === "warn", "mesmo valor com tolerância 15% = atenção");
}

// médias do mês (alimentam Metas e painel)
{
  const reg = (lojaId, data, extra) => ({ lojaId, data, preparo: null, cancelamentos: null, notaIfood: null, tempoOnline: null, ...extra });
  const ind = indicadoresDelivery([
    reg("a", "2026-10-26", { preparo: 14, notaIfood: 4.8 }),
    reg("a", "2026-10-27", { preparo: 16, cancelamentos: 2 }),
    reg("a", "2026-11-02", { preparo: 20 }),
    reg("b", "2026-10-27", { tempoOnline: 98 }),
    reg("b", "2026-10-28", { tempoOnline: Number.NaN }),
  ]);
  const v = (loja, mes, k) => ind.find((i) => i.lojaId === loja && i.mes === mes && i.indicador === k)?.valor;
  assert(perto(v("a", "2026-10-01", "preparo"), 15), "média de preparo de a em outubro = (14+16)/2");
  assert(perto(v("a", "2026-11-01", "preparo"), 20), "novembro separado de outubro");
  assert(perto(v("a", "2026-10-01", "ifood"), 4.8) && perto(v("a", "2026-10-01", "cancel"), 2), "só entram os checklists que informaram o campo");
  assert(v("a", "2026-10-01", "online") === undefined, "indicador que ninguém informou não vira zero");
  assert(perto(v("b", "2026-10-01", "online"), 98), "valor inválido (NaN) é ignorado");
  assert(ind.every((i) => i.origem === "calculado" && i.indicador !== "rupturas"), "origem calculado; rupturas do delivery não entram (evita contar duas vezes)");
  igual(indicadoresDelivery([]), [], "sem checklists: nada");
  for (const k of ["cmv", "rupturas", "preparo", "cancel", "ifood", "online"]) assert(typeof FONTE_CALCULADA[k] === "string", `Metas explica a origem de ${k}`);
}

console.log(`\nCozinha central e delivery: ${pass} verificações ok, ${fail} falhas.`);
if (fail > 0) process.exit(1);
