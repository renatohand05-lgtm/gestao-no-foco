#!/usr/bin/env node
/**
 * Testes da camada de aplicação do financeiro da rede (CMV, DRE, orçamento/expansão):
 * formatos aceitos nas ações (schemas), mensagens de erro, tradução de erros do banco e
 * leitura de linhas do banco com dados sujos. Sem banco: puro.
 * Node com --experimental-strip-types.
 */
import { lerEntrada, nomeCampo, traduzir } from "../lib/rede/acao-comum.ts";
import {
  CAMPOS_DA_PREMISSA,
  LINHAS_LANCAVEIS,
  cenarioSchema,
  cmvItemSchema,
  cmvSchema,
  configExpansaoSchema,
  lancamentoDreSchema,
  premissasSchema,
  semanaSegundaSchema,
  unidadeSchema,
} from "../lib/rede/schemas-financeiro.ts";
import { mapCenario, mapCmv, mapCmvItem, mapConfigExpansao, mapLancamento, mapPremissa, mapUnidade } from "../lib/rede/mapeadores-financeiro.ts";
import { CHAVE_DRE, DRE_LINHAS } from "../lib/rede/financeiro.ts";

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
const ok = (schema, v) => schema.safeParse(v).success;
function erro(schema, v) {
  const r = schema.safeParse(v);
  return r.success ? null : r.error.issues[0];
}
function lancou(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    return e.message;
  }
}

const L1 = "11111111-1111-4111-8111-111111111111";
const L2 = "22222222-2222-4222-8222-222222222222";

/* ------------------------------------------------------------ semana começa na segunda */
{
  assert(ok(semanaSegundaSchema, "2026-10-26"), "26/10/2026 é segunda");
  assert(ok(semanaSegundaSchema, "2026-11-16"), "16/11/2026 é segunda");
  assert(!ok(semanaSegundaSchema, "2026-10-27"), "terça é recusada");
  assert(!ok(semanaSegundaSchema, "2026-10-25"), "domingo é recusado");
  assert(!ok(semanaSegundaSchema, "2026-02-30"), "data inexistente é recusada");
  assert(!ok(semanaSegundaSchema, "26/10/2026"), "formato brasileiro não é aceito");
  assert(!ok(semanaSegundaSchema, ""), "vazio é recusado");
  const i = erro(semanaSegundaSchema, "2026-10-27");
  assert(/segunda-feira/.test(i.message), "mensagem cita a segunda-feira");
  // virada de ano e ano bissexto
  assert(ok(semanaSegundaSchema, "2024-12-30"), "30/12/2024 é segunda");
  assert(ok(semanaSegundaSchema, "2024-02-26"), "26/02/2024 (bissexto) é segunda");
}

/* ------------------------------------------------------------ contagem de CMV */
const contagem = (extra = {}) => ({
  lojaId: L1,
  semana: "2026-11-09",
  vendas: 100000,
  cmvTeorico: 20,
  estoqueInicial: 30000,
  compras: 25000,
  transferenciasEntrada: 0,
  transferenciasSaida: 0,
  devolucoes: 0,
  estoqueFinal: 32000,
  responsavel: "  Ana ",
  observacoes: "",
  itens: [],
  ...extra,
});
{
  assert(ok(cmvSchema, contagem()), "contagem válida");
  const r = cmvSchema.parse(contagem());
  assert(r.responsavel === "Ana", "responsável sem espaços nas pontas");
  assert(r.observacoes === null, "observação vazia vira nulo");
  assert(ok(cmvSchema, contagem({ vendas: null })), "vendas vazias = usar as lançadas");
  assert(!ok(cmvSchema, contagem({ vendas: 0 })), "vendas zero é recusado (vazio = usar as lançadas)");
  assert(!ok(cmvSchema, contagem({ vendas: -5 })), "vendas negativas");
  assert(!ok(cmvSchema, contagem({ semana: "2026-11-10" })), "semana que não é segunda");
  assert(!ok(cmvSchema, contagem({ lojaId: "abc" })), "loja inválida");
  assert(!ok(cmvSchema, contagem({ cmvTeorico: 101 })), "CMV teórico acima de 100%");
  assert(!ok(cmvSchema, contagem({ cmvTeorico: -1 })), "CMV teórico negativo");
  assert(ok(cmvSchema, contagem({ cmvTeorico: 0 })) && ok(cmvSchema, contagem({ cmvTeorico: 100 })), "limites 0 e 100 aceitos");
  for (const k of ["estoqueInicial", "compras", "transferenciasEntrada", "transferenciasSaida", "devolucoes", "estoqueFinal"]) {
    assert(!ok(cmvSchema, contagem({ [k]: -1 })), `${k} negativo é recusado`);
    assert(!ok(cmvSchema, contagem({ [k]: 100_000_001 })), `${k} acima do limite é recusado`);
    assert(!ok(cmvSchema, contagem({ [k]: "10" })), `${k} em texto é recusado`);
    assert(!ok(cmvSchema, contagem({ [k]: Number.NaN })), `${k} NaN é recusado`);
  }
  assert(!ok(cmvSchema, contagem({ observacoes: "x".repeat(501) })), "observação longa demais");
  assert(!ok(cmvSchema, contagem({ responsavel: "x".repeat(121) })), "responsável longo demais");

  // itens
  const it = (item, t = 10, r = 11) => ({ item, consumoTeorico: t, consumoReal: r });
  assert(ok(cmvSchema, contagem({ itens: [it("Salmão"), it("Arroz")] })), "itens válidos");
  const dup = erro(cmvSchema, contagem({ itens: [it("Salmão"), it("salmão")] }));
  assert(dup && /duas vezes/.test(dup.message) && dup.path.join(".") === "itens.1", "item repetido (sem diferenciar maiúsculas) aponta o segundo");
  assert(!ok(cmvSchema, contagem({ itens: Array.from({ length: 61 }, (_, i) => it(`i${i}`)) })), "mais de 60 itens");
  assert(ok(cmvSchema, contagem({ itens: Array.from({ length: 60 }, (_, i) => it(`i${i}`)) })), "exatamente 60 itens");
  assert(ok(cmvItemSchema, it("Óleo", 30, 0)), "consumo real zero é aceito");
  assert(!ok(cmvItemSchema, it("Óleo", 0, 5)), "consumo teórico zero é recusado (divisão na dispersão)");
  assert(!ok(cmvItemSchema, it("Óleo", 10, -1)), "consumo real negativo");
  assert(!ok(cmvItemSchema, it("   ", 10, 1)), "nome em branco");
  assert(!ok(cmvItemSchema, it("x".repeat(121), 10, 1)), "nome longo demais");
  const sem = cmvSchema.parse({ ...contagem(), itens: undefined });
  igual(sem.itens, [], "itens ausentes = lista vazia");
}

/* ------------------------------------------------------------ lançamento real do DRE */
{
  const lanc = (extra = {}) => ({ lojaId: L1, mes: "2026-10", linha: "cmv", valor: 12345.67, observacao: null, ...extra });
  assert(ok(lancamentoDreSchema, lanc()), "lançamento válido");
  assert(!ok(lancamentoDreSchema, lanc({ mes: "2026-13" })), "mês 13");
  assert(!ok(lancamentoDreSchema, lanc({ mes: "2026-00" })), "mês 00");
  assert(!ok(lancamentoDreSchema, lanc({ mes: "10/2026" })), "formato do mês");
  assert(!ok(lancamentoDreSchema, lanc({ linha: "faturamento" })), "faturamento não se lança (vem das vendas)");
  assert(!ok(lancamentoDreSchema, lanc({ linha: "resultado" })), "resultado não se lança (é calculado)");
  assert(!ok(lancamentoDreSchema, lanc({ valor: -1 })), "valor negativo");
  assert(ok(lancamentoDreSchema, lanc({ valor: 0 })), "valor zero é aceito (zera a estimativa)");
  assert(!ok(lancamentoDreSchema, lanc({ valor: "100" })), "valor em texto");
  for (const l of LINHAS_LANCAVEIS) assert(ok(lancamentoDreSchema, lanc({ linha: l })), `linha ${l} é lançável`);
  // toda linha lançável existe no DRE do painel
  const chaves = new Set(DRE_LINHAS.filter((l) => l.tipo === "neg").map((l) => l.k));
  for (const l of LINHAS_LANCAVEIS) assert(chaves.has(CHAVE_DRE[l]), `linha lançável ${l} corresponde a um custo do DRE (${CHAVE_DRE[l]})`);
  assert(Object.keys(CHAVE_DRE).length === LINHAS_LANCAVEIS.length && Object.keys(CHAVE_DRE).every((k) => LINHAS_LANCAVEIS.includes(k)), "lançáveis = exatamente as linhas mapeadas em CHAVE_DRE");
  assert(!LINHAS_LANCAVEIS.includes("faturamento") && !LINHAS_LANCAVEIS.includes("resultado"), "linhas calculadas não estão entre as lançáveis");
}

/* ------------------------------------------------------------ premissas */
{
  const padrao = { cmv: 21, pessoal: 20, impostos: 10, custoDelivery: 28, baseDelivery: "delivery", manutencao: 1.5, marketing: 7, cto: 12000, agua: 1500, energia: 4500, mixDelivery: 100 };
  assert(CAMPOS_DA_PREMISSA.length === 11, "11 campos de premissa");
  assert(ok(premissasSchema, { lojaId: null, campos: padrao }), "padrão da rede completo");
  const falta = { ...padrao };
  delete falta.energia;
  assert(!ok(premissasSchema, { lojaId: null, campos: falta }), "padrão sem um campo é recusado");
  const nulo = erro(premissasSchema, { lojaId: null, campos: { ...padrao, cmv: null } });
  assert(nulo && /todos os campos/.test(nulo.message), "padrão com campo vazio é recusado com mensagem clara");
  assert(ok(premissasSchema, { lojaId: L1, campos: { custoDelivery: 27 } }), "loja pode ter só uma exceção");
  assert(ok(premissasSchema, { lojaId: L1, campos: {} }), "loja sem exceção (apaga a linha) é aceita");
  assert(ok(premissasSchema, { lojaId: L1, campos: { cmv: null, mixDelivery: 78.5 } }), "campo nulo = usa o padrão");
  assert(!ok(premissasSchema, { lojaId: L1, campos: { cmv: 101 } }), "percentual acima de 100");
  assert(!ok(premissasSchema, { lojaId: L1, campos: { cmv: -1 } }), "percentual negativo");
  assert(!ok(premissasSchema, { lojaId: L1, campos: { baseDelivery: "outra" } }), "base do delivery inválida");
  assert(ok(premissasSchema, { lojaId: L1, campos: { baseDelivery: "total" } }), "base do delivery = total");
  assert(!ok(premissasSchema, { lojaId: L1, campos: { cto: -10 } }), "CTO negativo");
  assert(!ok(premissasSchema, { lojaId: "x", campos: {} }), "loja inválida");
  assert(!ok(premissasSchema, { campos: padrao }), "lojaId ausente não é o mesmo que nulo");
}

/* ------------------------------------------------------------ cenário */
{
  const cen = (extra = {}) => ({
    nome: "Base",
    descricao: "",
    faturamento: 500000,
    mixDelivery: 100,
    cmv: 21,
    folha: 20,
    impostos: 10,
    custoDelivery: 28,
    baseDelivery: "delivery",
    manutencao: 1.5,
    marketing: 7,
    cto: 12000,
    agua: 1500,
    energia: 4500,
    curva: [70, 80, 90, 95, 100, 100],
    ...extra,
  });
  assert(ok(cenarioSchema, cen()), "cenário válido");
  assert(ok(cenarioSchema, cen({ id: L1 })), "cenário existente (com id)");
  assert(!ok(cenarioSchema, cen({ id: "x" })), "id inválido");
  assert(!ok(cenarioSchema, cen({ nome: "  " })), "nome em branco");
  assert(!ok(cenarioSchema, cen({ nome: "x".repeat(81) })), "nome longo");
  assert(!ok(cenarioSchema, cen({ faturamento: 0 })), "faturamento zero");
  assert(!ok(cenarioSchema, cen({ faturamento: -1 })), "faturamento negativo");
  assert(!ok(cenarioSchema, cen({ curva: [] })), "curva vazia");
  assert(ok(cenarioSchema, cen({ curva: [100] })), "curva de 1 mês");
  assert(ok(cenarioSchema, cen({ curva: Array.from({ length: 12 }, () => 100) })), "curva de 12 meses");
  assert(!ok(cenarioSchema, cen({ curva: Array.from({ length: 13 }, () => 100) })), "curva de 13 meses");
  assert(!ok(cenarioSchema, cen({ curva: [70, -1] })), "curva com negativo");
  assert(ok(cenarioSchema, cen({ curva: [70, 300] })) && !ok(cenarioSchema, cen({ curva: [70, 301] })), "curva até 300%");
  assert(!ok(cenarioSchema, cen({ curva: [70, "80"] })), "curva com texto");
  assert(!ok(cenarioSchema, cen({ baseDelivery: "x" })), "base inválida");
  assert(!ok(cenarioSchema, cen({ mixDelivery: 120 })), "mix acima de 100%");
  assert(cenarioSchema.parse(cen({ descricao: "  " })).descricao === null, "descrição em branco vira nulo");
}

/* ------------------------------------------------------------ unidade de expansão */
{
  const un = (extra = {}) => ({ nome: "Loja 6", abertura: "2027-03", status: "planejada", ...extra });
  assert(ok(unidadeSchema, un()), "unidade válida");
  assert(ok(unidadeSchema, un({ abertura: null })) && ok(unidadeSchema, un({ abertura: undefined })), "sem data é aceito");
  assert(!ok(unidadeSchema, un({ abertura: "2027-13" })), "mês inválido");
  assert(!ok(unidadeSchema, un({ abertura: "2027-03-01" })), "só YYYY-MM");
  assert(!ok(unidadeSchema, un({ status: "aberta" })), "situação inválida");
  for (const s of ["planejada", "inaugurada", "cancelada"]) assert(ok(unidadeSchema, un({ status: s })), `situação ${s}`);
  assert(!ok(unidadeSchema, un({ nome: "" })), "nome vazio");
  assert(ok(unidadeSchema, un({ cenarioId: L1, lojaId: L2, faturamentoAlvo: 450000 })), "com cenário, loja e alvo");
  assert(ok(unidadeSchema, un({ cenarioId: null, lojaId: null, faturamentoAlvo: null })), "tudo opcional nulo");
  assert(!ok(unidadeSchema, un({ faturamentoAlvo: 0 })), "alvo zero é recusado (vazio = usa o do cenário)");
  assert(!ok(unidadeSchema, un({ cenarioId: "x" })), "cenário inválido");
}

/* ------------------------------------------------------------ configuração da expansão */
{
  const cfg = (extra = {}) => ({ metaLojas: 10, faturamentoMinimo: 5_000_000, lojasBase: [L1, L2], ...extra });
  assert(ok(configExpansaoSchema, cfg()), "configuração válida");
  igual(configExpansaoSchema.parse(cfg({ lojasBase: [L1, L1, L2, L1] })).lojasBase, [L1, L2], "lojas-base repetidas são unificadas");
  assert(!ok(configExpansaoSchema, cfg({ metaLojas: 0 })) && !ok(configExpansaoSchema, cfg({ metaLojas: 201 })), "meta de lojas entre 1 e 200");
  assert(!ok(configExpansaoSchema, cfg({ metaLojas: 10.5 })), "meta de lojas inteira");
  assert(!ok(configExpansaoSchema, cfg({ faturamentoMinimo: -1 })), "faturamento mínimo negativo");
  assert(!ok(configExpansaoSchema, cfg({ lojasBase: ["x"] })), "loja-base inválida");
  assert(ok(configExpansaoSchema, cfg({ lojasBase: [] })), "sem lojas-base");
}

/* ------------------------------------------------------------ mensagens de erro para o usuário */
{
  igual(lancou(() => lerEntrada(cmvSchema, contagem({ semana: "2026-11-10" }))), 'Confira o campo "semana": A contagem começa sempre na segunda-feira.', "erro de semana legível");
  igual(lancou(() => lerEntrada(cmvSchema, contagem({ estoqueFinal: -5 }))), 'Confira o campo "estoque final": Não pode ser negativo.', "erro de estoque final legível");
  igual(lancou(() => lerEntrada(cmvSchema, contagem({ vendas: 0 }))), 'Confira o campo "vendas da semana": Deve ser maior que zero (ou deixe vazio para usar as vendas lançadas).', "erro de vendas legível");
  igual(lancou(() => lerEntrada(cenarioSchema, { nome: "" })), 'Confira o campo "nome": Informe o nome do cenário.', "primeiro erro do cenário");
  igual(lancou(() => lerEntrada(premissasSchema, { lojaId: L1, campos: { cmv: 150 } })), 'Confira o campo "CMV": No máximo 100%.', "campo aninhado: nome específico (premissas.cmv)");
  igual(lancou(() => lerEntrada(cmvSchema, contagem({ itens: [{ item: "Sal", consumoTeorico: 0, consumoReal: 1 }] }))), 'Confira o campo "consumo teórico": O consumo teórico deve ser maior que zero.', "campo aninhado: item da contagem");
  igual(lancou(() => lerEntrada(cmvSchema, contagem({ itens: [{ item: "A", consumoTeorico: 1, consumoReal: 1 }, { item: "a", consumoTeorico: 1, consumoReal: 1 }] }))), 'Confira o campo "itens da contagem": O item "a" aparece duas vezes.', "item repetido aponta a lista");
  igual(lancou(() => lerEntrada(premissasSchema, { lojaId: null, campos: {} })), 'Confira o campo "premissas": O padrão da rede precisa de todos os campos preenchidos.', "padrão incompleto aponta as premissas");
  assert(lancou(() => lerEntrada(cmvSchema, null)) !== null, "entrada nula é recusada");
  assert(lancou(() => lerEntrada(cmvSchema, "texto")) !== null, "entrada em texto é recusada");
  igual(lerEntrada(lancamentoDreSchema, { lojaId: L1, mes: "2026-10", linha: "cmv", valor: 10 }).observacao, null, "campo opcional ausente = nulo");
  const m = lancou(() => lerEntrada(lancamentoDreSchema, { lojaId: L1, mes: "2026-10", linha: "xyz", valor: 10 }));
  assert(/Confira o campo "linha do DRE"/.test(m) && !/Invalid/.test(m), "linha inválida sem texto em inglês");
  // nenhum nome de campo dos schemas fica sem tradução
  const campos = ["lojaId", "semana", "vendas", "cmvTeorico", "estoqueInicial", "compras", "transferenciasEntrada", "transferenciasSaida", "devolucoes", "estoqueFinal", "responsavel", "observacoes", "itens", "item", "consumoTeorico", "consumoReal", "mes", "linha", "valor", "observacao", "campos", "nome", "descricao", "faturamento", "mixDelivery", "cmv", "folha", "impostos", "custoDelivery", "baseDelivery", "manutencao", "marketing", "cto", "agua", "energia", "curva", "status", "cenarioId", "faturamentoAlvo", "metaLojas", "faturamentoMinimo", "lojasBase"];
  for (const c of campos) assert(typeof nomeCampo[c] === "string" && nomeCampo[c].length > 0, `campo ${c} tem nome em português`);
}

/* ------------------------------------------------------------ tradução de erros do banco */
{
  igual(traduzir({ code: "42501", message: "x" }, "pad"), "Você não tem permissão para esta operação.", "42501 = sem permissão");
  igual(traduzir({ code: "42000", message: 'new row violates row-level security policy for table "rede_cmv_semanal"' }, "pad"), "Você não tem permissão para esta operação.", "RLS = sem permissão");
  igual(traduzir({ code: "23505", message: "duplicate key value violates unique constraint" }, "pad"), "Já existe um registro com esses dados.", "duplicado");
  igual(traduzir({ code: "23503", message: "violates foreign key constraint" }, "pad"), "Registro relacionado não encontrado.", "chave estrangeira");
  igual(traduzir({ code: "23514", message: 'new row for relation "rede_cmv_semanal" violates check constraint "x"' }, "pad"), "Algum valor está fora do permitido.", "check do banco sem vazar SQL");
  igual(traduzir({ code: "23514", message: "A contagem começa sempre na segunda-feira." }, "pad"), "A contagem começa sempre na segunda-feira.", "mensagem própria do banco é mantida");
  igual(traduzir(new Error("Escolha uma loja."), "pad"), "Escolha uma loja.", "erro do app é mantido");
  igual(traduzir({ message: 'select * from "x" where {}' }, "padrão"), "padrão", "SQL nunca vai para a tela");
  igual(traduzir(undefined, "padrão"), "padrão", "erro desconhecido = padrão");
  igual(traduzir({}, "padrão"), "padrão", "objeto vazio = padrão");
}

/* ------------------------------------------------------------ leitura de linhas do banco (dados sujos) */
{
  const c = mapCmv({ id: "a", loja_id: "b", semana: "2026-11-09", vendas: "1000.5", cmv_teorico: "19.4", estoque_inicial: null, compras: undefined, estoque_final: "7", origem: "outra" });
  assert(c.vendas === 1000.5 && c.cmvTeorico === 19.4, "numeric do banco chega como string e vira número");
  assert(c.estoqueInicial === 0 && c.compras === 0 && c.transferenciasEntrada === 0 && c.devolucoes === 0, "nulos viram zero nos valores");
  assert(c.estoqueFinal === 7, "estoque final");
  assert(mapCmv({ id: "a", loja_id: "b", semana: "s", vendas: null }).vendas === null, "vendas nulas continuam nulas (usa o módulo Vendas)");
  assert(c.origem === "manual" && mapCmv({ id: "a", loja_id: "b", semana: "s", origem: "exemplo" }).origem === "exemplo", "origem desconhecida = manual");
  assert(c.responsavel === null && c.observacoes === null, "texto ausente = nulo");

  const it = mapCmvItem({ loja_id: "b", semana: "s", item: "Salmão", consumo_teorico: "8", consumo_real: "9.4" });
  assert(it.consumoTeorico === 8 && it.consumoReal === 9.4 && it.item === "Salmão", "item da contagem");

  const p = mapPremissa({ loja_id: "x", cmv: null, pessoal: "20", custo_delivery: 27, base_delivery: "total", mix_delivery: "78.5", cto: null });
  igual(p, { lojaId: "x", pessoal: 20, custoDelivery: 27, mixDelivery: 78.5, baseDelivery: "total" }, "premissa da loja só com os campos preenchidos");
  igual(mapPremissa({ loja_id: null, cmv: 21, base_delivery: "lixo" }), { lojaId: null, cmv: 21 }, "base inválida é ignorada; padrão tem lojaId nulo");
  assert(mapPremissa({ loja_id: "x", cmv: 0 }).cmv === 0, "zero é valor (não é 'usa o padrão')");

  const l = mapLancamento({ id: "i", loja_id: "b", mes: "2026-10", linha: "marketing", valor: "123.4", observacao: "n", origem: "exemplo" });
  assert(l.linha === "marketing" && l.valor === 123.4 && l.origem === "exemplo", "lançamento");
  assert(mapLancamento({ id: "i", loja_id: "b", mes: "m", linha: "lixo", valor: 1 }).linha === "impostos", "linha desconhecida cai em impostos (não quebra a tela)");

  const cen = mapCenario({ id: "c", nome: "Base", faturamento: "500000", mix_delivery: 100, cmv: 21, folha: 20, impostos: 10, custo_delivery: 28, base_delivery: "x", manutencao: 1.5, marketing: 7, cto: 12000, agua: 1500, energia: 4500, curva: ["70", 80, "90"], padrao: true, origem: "exemplo" });
  igual(cen.curva, [70, 80, 90], "curva em jsonb com textos vira números");
  assert(cen.baseDelivery === "delivery" && cen.padrao === true && cen.origem === "exemplo" && cen.faturamento === 500000, "cenário");
  igual(mapCenario({ id: "c", nome: "n", curva: null }).curva, [], "curva ausente = vazia");
  assert(mapCenario({ id: "c", nome: "n", padrao: null }).padrao === false, "padrao nulo = falso");

  const u = mapUnidade({ id: "u", nome: "Loja 6", abertura_prevista: "2027-03-01", status: "xyz", faturamento_alvo: "450000" });
  assert(u.status === "planejada" && u.aberturaPrevista === "2027-03-01" && u.faturamentoAlvo === 450000, "unidade com situação desconhecida = planejada");
  assert(mapUnidade({ id: "u", nome: "n", status: "cancelada" }).status === "cancelada" && mapUnidade({ id: "u", nome: "n", status: "inaugurada" }).status === "inaugurada", "situações válidas");
  assert(mapUnidade({ id: "u", nome: "n" }).faturamentoAlvo === null && mapUnidade({ id: "u", nome: "n" }).cenarioId === null, "opcionais nulos");

  assert(mapConfigExpansao(null) === null, "sem configuração = nulo");
  igual(mapConfigExpansao({ meta_lojas: "10", faturamento_minimo: "5000000", lojas_base: ["a", 3, null, "b"] }), { metaLojas: 10, faturamentoMinimo: 5000000, lojasBase: ["a", "b"] }, "configuração com lista suja");
  igual(mapConfigExpansao({ meta_lojas: 10, faturamento_minimo: 0, lojas_base: null }).lojasBase, [], "lojas-base ausentes = vazio");
}

console.log(`\nRede (financeiro, aplicação): ${pass} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);
