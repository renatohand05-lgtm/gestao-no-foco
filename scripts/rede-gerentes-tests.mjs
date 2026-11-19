#!/usr/bin/env node
/**
 * Testes da avaliação de gerentes ponta a ponta (sem banco): vendas, indicadores, qualidade, RH e liderança de
 * lojas fabricadas entram em `avaliarGerentesDoMes` — a mesma função que a tela usa — e o score sai conferido
 * à mão. Cobre: critério sem dado (peso redistribuído, nunca nota inventada), mês sem dados, loja em inauguração,
 * loja sem gerente, troca de gerente no mês, fonte que o perfil não enxerga, ranking, evolução e resumo.
 * Node com --experimental-strip-types.
 */
import { avaliarGerentesDoMes, evolucaoDosGerentes, mesesDaEvolucao, mesesDoSeletor, resumirGerentes } from "../lib/rede/gerentes.ts";
import { chaveItem, SECOES_QUALIDADE } from "../lib/rede/qualidade.ts";

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
const perto = (a, b, eps = 1e-6) => a != null && b != null && Math.abs(a - b) <= eps;

/* ------------------------------------------------------------------ dados fabricados */
const HOJE = "2026-11-18";
const loja = (id, nome, status, ordem) => ({ id, slug: id, nome, status, canais: { salao: true, delivery: true }, dataInauguracao: status === "operando" ? "2024-01-01" : null, inauguracaoPrevista: null, ordem });
const LA = loja("A", "Loja A", "operando", 1);
const LB = loja("B", "Loja B", "operando", 2);
const LC = loja("C", "Loja C", "inauguracao", 3);
const LD = loja("D", "Loja D", "operando", 4);
const LOJAS = [LA, LB, LC, LD];
const CONFIG = { ambiente: "real", pisoLoja: 0, pesosDiaSemana: { seg: 1, ter: 1, qua: 1, qui: 1, sex: 1, sab: 1, dom: 1 }, toleranciaCmv: 0, toleranciaSemaforoPct: 0 };
const REDE = (indicador, meta, direcao) => ({ id: `m-${indicador}`, lojaId: null, indicador, meta, direcao, validoDe: "2020-01-01", validoAte: null });
// Direção "min" = maior é melhor (meta mínima); "max" = menor é melhor (limite máximo).
const METAS = [REDE("pctMeta", 100, "min"), REDE("cmv", 30, "max"), REDE("turnover", 5, "max"), REDE("absent", 3, "max")];
const colab = (id, lojaId, nome, adm, extra = {}) => ({ id, lojaId, nome, cargo: "gerente_loja", dataAdmissao: adm, status: "ativo", dataDesligamento: null, motivoDesligamento: null, observacoes: null, origem: "manual", ...extra });
const COLABS = [colab("ga", "A", "Ana", "2024-01-10"), colab("gb", "B", "Beto", "2025-06-01"), colab("gc", "C", "Cris", "2026-10-20"), { ...colab("fa", "A", "Fabi", "2025-01-01"), cargo: "chefe_cozinha" }];
const dias = (mes, n) => Array.from({ length: n }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`);
const venda = (lojaId, data, salao) => ({ lojaId, data, salao, delivery: 0, pedidosSalao: 10, pedidosDelivery: 0 });
// Loja A: 31 dias de outubro somando exatamente a meta (100 mil); loja B: 60% da meta.
const VENDAS = [...dias("2026-10", 31).map((d) => venda("A", d, 100000 / 31)), ...dias("2026-10", 31).map((d) => venda("B", d, 60000 / 31))];
const METAS_FAT = [{ lojaId: "A", mes: "2026-10-01", valor: 100000 }, { lojaId: "B", mes: "2026-10-01", valor: 100000 }];
const ind = (lojaId, indicador, valor) => ({ lojaId, mes: "2026-10-01", indicador, valor, origem: "calculado" });
const INDICADORES = [ind("A", "cmv", 28), ind("A", "turnover", 3), ind("A", "absent", 2), ind("B", "cmv", 40), ind("B", "turnover", 10), ind("B", "absent", 6)];
const respostasTodasSim = {};
SECOES_QUALIDADE.forEach((s, si) => s.itens.forEach((_, ii) => (respostasTodasSim[chaveItem(si, ii)] = { v: "sim" })));
const VISITAS = [{ id: "v1", lojaId: "A", data: "2026-10-20", avaliador: "X", gerente: null, respostas: respostasTodasSim, origem: "manual", criadaEm: "2026-10-20T10:00:00Z" }];
const lid = (id, colaboradorId, lojaId, mes, nota) => ({ id, colaboradorId, lojaId, mes, nota, observacoes: null, origem: "manual" });
const LIDERANCA = [lid("l1", "ga", "A", "2026-10-01", 5), lid("l0", "gb", "B", "2026-09-01", 4)];
const NINEBOX = [{ id: "n1", lojaId: "A", colaboradorId: "ga", desempenho: 3, potencial: 3, observacoes: null, origem: "manual" }, { id: "n2", lojaId: "B", colaboradorId: "gb", desempenho: 1, potencial: 2, observacoes: null, origem: "manual" }];
const ENTRADA = { lojas: LOJAS, config: CONFIG, metas: METAS, metasFat: METAS_FAT, indicadores: INDICADORES, vendas: VENDAS, visitas: VISITAS, colaboradores: COLABS, lideranca: LIDERANCA, ninebox: NINEBOX, hoje: HOJE, fontes: { vendas: true, metas: true, qualidade: true } };
const porLoja = (linhas, id) => linhas.find((l) => l.lojaId === id);

/* ------------------------------------------------------------------ outubro: tudo conferido à mão */
{
  const L = avaliarGerentesDoMes(ENTRADA, "2026-10");
  igual(L.map((l) => l.lojaId), ["A", "B", "C", "D"], "ranking: A (1º), B (2º), depois quem não tem score na ordem da loja");
  const a = porLoja(L, "A");
  igual(a.situacao, "avaliada", "A avaliada");
  igual(a.gerente?.nome, "Ana", "gerente de A");
  assert(perto(a.pctMeta, 100), `A: vendas ${a.pctMeta} = 100% da meta`);
  igual([a.indOk, a.indAvaliados], [4, 4], "A: 4 de 4 indicadores na meta (pctMeta, cmv, turnover, absent)");
  igual(a.qualidade, 100, "A: visita 100%");
  igual(a.qualidadeData, "2026-10-20", "A: data da visita");
  igual([a.turnover, a.absenteismo, a.lideranca, a.potencial], [3, 2, 5, 3], "A: turnover, absenteísmo, liderança e potencial");
  igual([a.comp.vendas, a.comp.indicadores, a.comp.qualidade, a.comp.pessoas, a.comp.lideranca], [100, 100, 100, 100, 100], "A: todos os critérios em 100");
  igual([a.score, a.pesoUsado, a.criterios, a.ausentes], [100, 100, 5, []], "A: score 100 com os 5 critérios");
  igual(a.rec.rotulo, "Pronto para promoção", "A: score 100 + potencial alto");
  igual(a.posicao, 1, "A: 1º");
  igual(a.quadranteNineBox, "Talento", "A: quadrante");
  igual(a.registroLideranca, { id: "l1", observacoes: null, origem: "manual" }, "A: registro da nota de liderança (para editar)");
  igual(a.casaMeses, 33, "A: 33 meses de casa no fim de outubro (adm. 10/01/2024)");

  const b = porLoja(L, "B");
  assert(perto(b.pctMeta, 60), `B: vendas ${b.pctMeta} = 60%`);
  igual([b.indOk, b.indAvaliados], [0, 4], "B: 0 de 4 indicadores na meta");
  igual(b.qualidade, null, "B: sem visita = sem nota (não zero)");
  igual(b.lideranca, null, "B: a nota de liderança é de setembro — não vale para outubro");
  assert(perto(b.comp.vendas, 60) && b.comp.indicadores === 0 && b.comp.qualidade === null && b.comp.pessoas === 0 && b.comp.lideranca === null, `B: componentes (qualidade e liderança ausentes): ${JSON.stringify(b.comp)}`);
  igual([b.pesoUsado, b.criterios, b.ausentes], [70, 3, ["qualidade", "lideranca"]], "B: 70% do peso, 3 critérios");
  assert(perto(b.score, (30 * 60 + 25 * 0 + 15 * 0) / 70), `B: score ${b.score} = 25,7 (peso redistribuído entre os 3 critérios)`);
  igual(b.rec.rotulo, "Plano de melhoria", "B: plano de melhoria");
  igual(b.posicao, 2, "B: 2º");

  const c = porLoja(L, "C");
  igual([c.situacao, c.score, c.rec, c.posicao], ["inauguracao", null, null, null], "C em inauguração: sem score, sem recomendação, sem posição");
  const d = porLoja(L, "D");
  igual([d.situacao, d.gerente, d.score, d.rec, d.posicao], ["sem_gerente", null, null, null, null], "D sem gerente: nada a avaliar");

  const r = resumirGerentes(L);
  igual([r.avaliados, r.semScore, r.prontosParaPromocao, r.emMelhoria], [2, 0, 1, 1], "resumo: 2 avaliados, 1 pronto, 1 em melhoria");
  assert(perto(r.scoreMedio, (100 + (30 * 60) / 70) / 2), `resumo: score médio ${r.scoreMedio}`);
}

/* ------------------------------------------------------------------ mês sem dados: nunca zero */
{
  const L = avaliarGerentesDoMes(ENTRADA, "2026-09");
  const a = porLoja(L, "A");
  igual(a.situacao, "avaliada", "setembro: A tem gerente no cargo");
  igual([a.pctMeta, a.indAvaliados, a.qualidade, a.turnover, a.absenteismo, a.lideranca], [null, 0, null, null, null, null], "setembro: nenhuma fonte tem dado");
  igual([a.score, a.rec, a.posicao, a.criterios], [null, null, null, 0], "setembro: sem score (e não 'zero' nem 'Plano de melhoria')");
  const b = porLoja(L, "B");
  igual(b.lideranca, 4, "setembro: B tem a nota de liderança do mês");
  igual([b.score, b.criterios, b.pesoUsado], [null, 1, 15], "setembro: só a liderança (15% do peso) — pouco para virar score");
  const r = resumirGerentes(L);
  igual([r.avaliados, r.semScore, r.scoreMedio], [0, 2, null], "resumo de setembro: 0 avaliados, 2 sem dados suficientes, sem média");
}

/* ------------------------------------------------------------------ visita posterior ao mês não vale */
{
  const L = avaliarGerentesDoMes(ENTRADA, "2026-10");
  igual(porLoja(L, "A").qualidade, 100, "visita de 20/10 vale para outubro");
  const L2 = avaliarGerentesDoMes({ ...ENTRADA, visitas: [{ ...VISITAS[0], data: "2026-11-02" }] }, "2026-10");
  igual(porLoja(L2, "A").qualidade, null, "visita de novembro não vale para outubro");
  // a visita mais recente até o fim do mês é a que vale
  const respNao = {};
  SECOES_QUALIDADE.forEach((s, si) => s.itens.forEach((_, ii) => (respNao[chaveItem(si, ii)] = { v: ii % 2 === 0 ? "sim" : "nao" })));
  const L3 = avaliarGerentesDoMes({ ...ENTRADA, visitas: [...VISITAS, { ...VISITAS[0], id: "v2", data: "2026-10-28", respostas: respNao, criadaEm: "2026-10-28T10:00:00Z" }] }, "2026-10");
  assert(porLoja(L3, "A").qualidade < 100 && porLoja(L3, "A").qualidadeData === "2026-10-28", "a visita mais recente do mês substitui a anterior");
  const L4 = avaliarGerentesDoMes({ ...ENTRADA, visitas: [...VISITAS, { ...VISITAS[0], id: "v2", data: "2026-10-28", respostas: respNao, criadaEm: "2026-10-28T10:00:00Z" }] }, "2026-10".replace("10", "10"));
  assert(L4.length === 4, "4 lojas");
}

/* ------------------------------------------------------------------ fontes que o perfil não enxerga */
{
  const sem = (fontes) => porLoja(avaliarGerentesDoMes({ ...ENTRADA, fontes }, "2026-10"), "A");
  const sq = sem({ vendas: true, metas: true, qualidade: false });
  igual([sq.qualidade, sq.qualidadeData, sq.ausentes.includes("qualidade")], [null, null, true], "sem acesso à qualidade: critério ausente, sem vazar a nota");
  const sv = sem({ vendas: false, metas: true, qualidade: true });
  igual([sv.pctMeta, sv.comp.vendas], [null, null], "sem acesso a vendas: critério ausente");
  const sm = sem({ vendas: true, metas: false, qualidade: true });
  igual([sm.indAvaliados, sm.comp.indicadores, sm.turnover, sm.absenteismo, sm.comp.pessoas, sm.pctMeta], [0, null, null, null, null, null], "sem acesso a metas e indicadores: indicadores, pessoas e vendas x meta ausentes");
  const nada = sem({ vendas: false, metas: false, qualidade: false });
  igual([nada.criterios, nada.score], [1, null], "sem acesso a nada: só a liderança (lançada nesta tela) — sem score");
}

/* ------------------------------------------------------------------ troca de gerente no mês */
{
  const novo = colab("ga2", "A", "Ágata", "2026-10-15");
  const antigo = { ...COLABS[0], status: "desligado", dataDesligamento: "2026-10-14" };
  const colabs = [antigo, novo, COLABS[1], COLABS[2], COLABS[3]];
  const a = porLoja(avaliarGerentesDoMes({ ...ENTRADA, colaboradores: colabs }, "2026-10"), "A");
  igual(a.gerente.id, "ga", "troca no mês: a nota de liderança lançada é de Ana, então Ana é a avaliada (preferência a quem tem nota)");
  const sem = porLoja(avaliarGerentesDoMes({ ...ENTRADA, colaboradores: colabs, lideranca: [] }, "2026-10"), "A");
  igual(sem.gerente.id, "ga2", "troca no mês, sem nota: o admitido por último");
  const nov = porLoja(avaliarGerentesDoMes({ ...ENTRADA, colaboradores: colabs }, "2026-11"), "A");
  igual(nov.gerente.id, "ga2", "novembro: só Ágata está no cargo");
  igual(nov.lideranca, null, "novembro: a nota de outubro de Ana não vale");
  igual(nov.potencial, null, "Ágata ainda não tem Nine Box: sem potencial (não 'médio')");
  const ago = porLoja(avaliarGerentesDoMes({ ...ENTRADA, colaboradores: colabs }, "2026-08"), "A");
  igual(ago.gerente.id, "ga", "agosto: Ana");
}

/* ------------------------------------------------------------------ nine box do gerente decide a promoção */
{
  const sem = porLoja(avaliarGerentesDoMes({ ...ENTRADA, ninebox: [] }, "2026-10"), "A");
  igual([sem.score, sem.potencial, sem.rec.rotulo, sem.quadranteNineBox], [100, null, "Desenvolver (PDI)", null], "score 100 sem Nine Box não promove");
  const medio = porLoja(avaliarGerentesDoMes({ ...ENTRADA, ninebox: [{ ...NINEBOX[0], potencial: 2 }] }, "2026-10"), "A");
  igual(medio.rec.rotulo, "Desenvolver (PDI)", "score 100 com potencial médio não promove");
}

/* ------------------------------------------------------------------ meses */
{
  igual(mesesDaEvolucao("2026-10"), ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"], "evolução: 6 meses até outubro");
  igual(mesesDaEvolucao("2026-02", 3), ["2025-12", "2026-01", "2026-02"], "evolução atravessa o ano");
  const sel = mesesDoSeletor(HOJE);
  igual([sel.length, sel[0], sel.at(-1)], [12, "2026-11", "2025-12"], "seletor: do mês atual até 11 meses antes");
  igual(mesesDoSeletor("2026-01-05", 3), ["2026-01", "2025-12", "2025-11"], "seletor atravessa o ano");
}

/* ------------------------------------------------------------------ evolução */
{
  const ev = evolucaoDosGerentes(ENTRADA, mesesDaEvolucao("2026-10"));
  igual(ev.length, 6, "6 pontos");
  igual(ev.map((p) => p.mes).at(-1), "2026-10", "termina no mês avaliado");
  const out = ev.at(-1);
  assert(perto(out.scores.find((s) => s.lojaId === "A").score, 100), "outubro: A = 100");
  assert(perto(out.media, (100 + (30 * 60) / 70) / 2), "outubro: média só de quem tem score");
  igual(ev.slice(0, 4).every((p) => p.media === null && p.scores.every((s) => s.score === null)), true, "meses sem dado: sem score e sem média (não zero)");
}

/* ------------------------------------------------------------------ lojas inativas não aparecem; lista vazia */
{
  igual(avaliarGerentesDoMes({ ...ENTRADA, lojas: [] }, "2026-10"), [], "sem lojas: lista vazia");
  const so = avaliarGerentesDoMes({ ...ENTRADA, lojas: [LA] }, "2026-10");
  igual(so.map((l) => [l.lojaId, l.posicao]), [["A", 1]], "uma loja: só ela no ranking");
}

console.log(`rede-gerentes-tests: ${pass} ok${fail ? `, ${fail} FALHARAM` : ""}`);
process.exit(fail ? 1 : 0);
