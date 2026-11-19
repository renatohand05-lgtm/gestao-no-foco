#!/usr/bin/env node
/**
 * Testes da camada de aplicação da cozinha central e do delivery: formatos aceitos nas ações (schemas),
 * mensagens de erro, leitura de linhas do banco com dados sujos, menu e permissões. Sem banco: puro.
 * Node com --experimental-strip-types.
 */
import { lerEntrada } from "../lib/rede/acao-comum.ts";
import { MENU_REDE, modulosDoItem } from "../lib/rede/menu.ts";
import { mapProduto, mapRegistroDelivery, mapRotina, mapRuptura } from "../lib/rede/mapeadores-cozinha.ts";
import { lerPerfil, podeVer, podeVerAlgum } from "../lib/rede/permissoes.ts";
import { ajusteEstoqueSchema, deliverySchema, produtoSchema, rupturaSchema } from "../lib/rede/schemas-cozinha.ts";
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
function igual(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg} — obtido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`);
}
const ok = (schema, v) => schema.safeParse(v).success;
function lancou(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    return e.message;
  }
}

const L1 = "11111111-1111-4111-8111-111111111111";
const P1 = "33333333-3333-4333-8333-333333333333";

/* ------------------------------------------------------------ ruptura */
{
  const base = { lojaId: L1, data: "2026-11-10", item: "Salmão", motivo: "Falta na cozinha central", horas: 2, acao: "Reposição urgente" };
  assert(ok(rupturaSchema, base), "ruptura válida");
  for (const m of MOTIVOS_RUPTURA) assert(ok(rupturaSchema, { ...base, motivo: m }), `motivo "${m}" é aceito`);
  assert(!ok(rupturaSchema, { ...base, motivo: "Outro motivo" }), "motivo fora da lista é recusado");
  assert(!ok(rupturaSchema, { ...base, item: "   " }), "item em branco é recusado");
  assert(!ok(rupturaSchema, { ...base, item: "x".repeat(121) }), "item com mais de 120 caracteres é recusado");
  assert(!ok(rupturaSchema, { ...base, horas: -1 }), "horas negativas são recusadas");
  assert(!ok(rupturaSchema, { ...base, horas: 721 }), "mais de 720 horas é recusado");
  assert(ok(rupturaSchema, { ...base, horas: 0 }) && ok(rupturaSchema, { ...base, horas: 720 }), "0 e 720 horas são aceitos");
  assert(!ok(rupturaSchema, { ...base, horas: "2" }), "horas em texto são recusadas (o formulário converte antes)");
  assert(!ok(rupturaSchema, { ...base, data: "2026-02-30" }), "data inexistente é recusada");
  assert(!ok(rupturaSchema, { ...base, lojaId: "abc" }), "loja inválida é recusada");
  assert(!ok(rupturaSchema, { ...base, acao: "x".repeat(301) }), "ação com mais de 300 caracteres é recusada");
  igual(rupturaSchema.parse({ ...base, acao: "  " }).acao, null, "ação em branco vira nulo");
  igual(rupturaSchema.parse({ ...base, item: "  Salmão  " }).item, "Salmão", "item é aparado");
  assert(lancou(() => lerEntrada(rupturaSchema, { ...base, horas: -1 })) === 'Confira o campo "horas de indisponibilidade": Não pode ser negativo.', "mensagem de horas negativas");
  assert(lancou(() => lerEntrada(rupturaSchema, { ...base, motivo: "x" })) === 'Confira o campo "motivo": Escolha um dos motivos da lista.', "mensagem de motivo inválido");
  assert(lancou(() => lerEntrada(rupturaSchema, { ...base, item: "" })) === 'Confira o campo "item": Informe o item em falta.', "mensagem de item vazio");
}

/* ------------------------------------------------------------ estoque */
{
  const base = { item: "Arroz japonês", unidade: "kg", atual: 320, minimo: 180, consumoDia: 62, custo: 8.9 };
  assert(ok(produtoSchema, base) && ok(produtoSchema, { ...base, id: P1 }), "item de estoque válido (novo e existente)");
  assert(!ok(produtoSchema, { ...base, item: "" }), "nome vazio é recusado");
  assert(!ok(produtoSchema, { ...base, unidade: "" }), "unidade vazia é recusada");
  assert(!ok(produtoSchema, { ...base, unidade: "caixas de 12 unidades" }), "unidade longa demais é recusada");
  for (const campo of ["atual", "minimo", "consumoDia", "custo"]) assert(!ok(produtoSchema, { ...base, [campo]: -0.01 }), `${campo} negativo é recusado`);
  assert(ok(produtoSchema, { ...base, atual: 0, minimo: 0, consumoDia: 0, custo: 0 }), "tudo zero é aceito");
  assert(!ok(produtoSchema, { ...base, atual: 1e12 }), "quantidade acima do limite é recusada");
  assert(/consumo/i.test(lancou(() => lerEntrada(produtoSchema, { ...base, consumoDia: -1 })) ?? ""), "mensagem cita o consumo");

  assert(ok(ajusteEstoqueSchema, { id: P1, atual: 10 }), "ajuste só do estoque atual");
  assert(ok(ajusteEstoqueSchema, { id: P1, minimo: 5, consumoDia: 1.5 }), "ajuste de mínimo e consumo");
  assert(!ok(ajusteEstoqueSchema, { id: P1 }), "ajuste sem nenhum número é recusado");
  assert(!ok(ajusteEstoqueSchema, { id: P1, atual: -1 }), "ajuste negativo é recusado");
  assert(!ok(ajusteEstoqueSchema, { id: "x", atual: 1 }), "identificador inválido é recusado");
}

/* ------------------------------------------------------------ delivery */
{
  const base = { lojaId: L1, data: "2026-11-10", periodo: "diario", preparo: 14, rotina: {} };
  assert(ok(deliverySchema, base), "checklist válido com um indicador");
  assert(!ok(deliverySchema, { ...base, preparo: null }), "sem nenhum indicador com meta é recusado");
  assert(!ok(deliverySchema, { lojaId: L1, data: "2026-11-10", periodo: "diario" }), "sem indicadores (campos ausentes) é recusado");
  for (const campo of ["preparo", "cancelamentos", "notaIfood", "tempoOnline", "rupturas"]) {
    assert(ok(deliverySchema, { lojaId: L1, data: "2026-11-10", periodo: "semanal", [campo]: 1 }), `só ${campo} preenchido basta`);
  }
  assert(lancou(() => lerEntrada(deliverySchema, { lojaId: L1, data: "2026-11-10", periodo: "diario" })) === 'Confira o campo "indicadores com meta": Preencha pelo menos um.', "mensagem de nenhum indicador");
  assert(!ok(deliverySchema, { ...base, periodo: "mensal" }), "período só diário ou semanal");
  assert(!ok(deliverySchema, { ...base, preparo: -1 }) && !ok(deliverySchema, { ...base, preparo: 601 }), "preparo entre 0 e 600 minutos");
  assert(!ok(deliverySchema, { ...base, cancelamentos: 101 }) && !ok(deliverySchema, { ...base, tempoOnline: -1 }), "percentuais entre 0 e 100");
  assert(!ok(deliverySchema, { ...base, notaIfood: 5.1 }) && ok(deliverySchema, { ...base, notaIfood: 5 }) && ok(deliverySchema, { ...base, notaIfood: 0 }), "nota iFood entre 0 e 5");
  assert(!ok(deliverySchema, { ...base, rupturas: 2.5 }) && !ok(deliverySchema, { ...base, pedidos: 1.5 }), "rupturas e pedidos são inteiros");
  assert(!ok(deliverySchema, { ...base, ticketMedio: -1 }) && ok(deliverySchema, { ...base, ticketMedio: 55.9 }), "ticket médio não negativo");
  assert(ok(deliverySchema, { ...base, rotina: { 0: "sim", 3: "nao", 6: "na" } }), "rotina com respostas Sim/Não/N/A");
  assert(!ok(deliverySchema, { ...base, rotina: { 7: "sim" } }), "item 7 da rotina não existe (são 0 a 6)");
  assert(!ok(deliverySchema, { ...base, rotina: { 0: "talvez" } }), "resposta fora de Sim/Não/N/A é recusada");
  assert(!ok(deliverySchema, { ...base, observacoes: "x".repeat(1001) }), "observações até 1000 caracteres");
  const lido = deliverySchema.parse(base);
  assert(lido.cancelamentos === null && lido.pedidos === null && lido.responsavel === null && lido.observacoes === null, "campos opcionais ausentes viram nulo");
  igual(deliverySchema.parse({ ...base, responsavel: "  Ana  " }).responsavel, "Ana", "responsável é aparado");
}

/* ------------------------------------------------------------ leitura do banco com dados sujos */
{
  const r = mapRuptura({ id: 1, loja_id: "a", data: "2026-10-10T00:00:00Z", item: null, motivo: "inexistente", horas: "3.5", acao: "  ", origem: "x" });
  assert(r.id === "1" && r.data === "2026-10-10" && r.item === "" && r.horas === 3.5 && r.acao === null && r.origem === "manual", "ruptura suja é lida sem quebrar");
  assert(r.motivo === MOTIVOS_RUPTURA[0], "motivo desconhecido cai no primeiro (não quebra a tela)");
  assert(mapRuptura({ id: "1", loja_id: "a", data: "2026-10-10", motivo: "Atraso na entrega", horas: "abc", origem: "exemplo" }).horas === 0, "horas ilegíveis viram zero");
  assert(mapRuptura({ id: "1", loja_id: "a", data: "2026-10-10", motivo: "Atraso na entrega", origem: "exemplo" }).origem === "exemplo", "origem exemplo é preservada");

  const p = mapProduto({ id: "p", item: "Sal", unidade: null, atual: "2.50", minimo: null, consumo_dia: "x", custo_unitario: "1.2345", origem: "exemplo" });
  assert(p.unidade === "un" && p.atual === 2.5 && p.minimo === 0 && p.consumoDia === 0 && p.custo === 1.2345 && p.origem === "exemplo", "item de estoque sujo é lido");

  igual(mapRotina({ 0: "sim", "1": "nao", "2": "na", "7": "sim", "-1": "sim", "3": "talvez", x: "sim" }), { 0: "sim", 1: "nao", 2: "na" }, "rotina ignora itens e respostas inválidos");
  igual(mapRotina(null), {}, "rotina nula = vazia");
  igual(mapRotina([1, 2]), {}, "rotina em lista = vazia");
  igual(mapRotina("sim"), {}, "rotina em texto = vazia");

  const d = mapRegistroDelivery({ id: "d", loja_id: "a", data: "2026-11-02", periodo: "outro", responsavel: "", preparo: "14.5", cancelamentos: null, nota_ifood: "4.80", tempo_online: "", rupturas: 3, pedidos: "120", rotina: { 0: "sim" }, observacoes: null, origem: "manual" });
  assert(d.periodo === "diario" && d.responsavel === null && d.preparo === 14.5 && d.cancelamentos === null && d.notaIfood === 4.8 && d.tempoOnline === null && d.rupturas === 3 && d.pedidos === 120, "registro de delivery sujo é lido");
  assert(mapRegistroDelivery({ id: "d", loja_id: "a", data: "2026-11-02", periodo: "semanal" }).periodo === "semanal", "período semanal é preservado");
}

/* ------------------------------------------------------------ menu e permissões */
{
  const itemCozinha = MENU_REDE.find((m) => m.href === "/cozinha");
  const itemDelivery = MENU_REDE.find((m) => m.href === "/delivery");
  assert(itemCozinha && itemDelivery, "abas Cozinha central e Checklist de delivery no menu");
  igual(modulosDoItem(itemCozinha), ["rupturas", "estoque_cc"], "Cozinha central abre com rupturas ou estoque da central");
  igual(modulosDoItem(itemDelivery), ["delivery"], "Checklist de delivery abre com o módulo delivery");
  assert(new Set(MENU_REDE.map((m) => m.href)).size === MENU_REDE.length, "sem abas repetidas");
  assert(MENU_REDE[0].href === "" && MENU_REDE[MENU_REDE.length - 1].href === "/lojas", "Visão geral primeiro, Lojas e acessos por último");

  const perfil = (modulos) => lerPerfil({ papel: "gerente_loja", todas_lojas: false, loja_ids: [], modulos });
  const so = (k) => perfil({ [k]: { ver: true, editar: false } });
  assert(podeVerAlgum(so("rupturas"), modulosDoItem(itemCozinha)), "quem vê só rupturas vê a aba Cozinha central");
  assert(podeVerAlgum(so("estoque_cc"), modulosDoItem(itemCozinha)), "quem vê só o estoque vê a aba Cozinha central");
  assert(!podeVerAlgum(so("delivery"), modulosDoItem(itemCozinha)), "quem vê só delivery não vê a Cozinha central");
  assert(!podeVerAlgum(so("rupturas"), modulosDoItem(itemDelivery)), "quem vê só rupturas não vê o delivery");
  assert(!podeVerAlgum(null, modulosDoItem(itemCozinha)) && !podeVerAlgum(undefined, ["rupturas"]), "sem perfil não vê nada");
  assert(!podeVerAlgum(so("rupturas"), []), "lista vazia de módulos: nada");
  assert(podeVer(so("rupturas"), "rupturas") && !podeVer(so("rupturas"), "estoque_cc"), "cada módulo é checado separadamente");
}

console.log(`\nRede (cozinha e delivery, aplicação): ${pass} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);
