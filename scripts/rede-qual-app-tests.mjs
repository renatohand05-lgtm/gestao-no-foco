#!/usr/bin/env node
/**
 * Testes da camada de aplicação do checklist de qualidade e dos planos de ação: formatos aceitos nas ações
 * (schemas), mensagens de erro, leitura de linhas do banco com dados sujos, menu e permissões. Sem banco: puro.
 * Node com --experimental-strip-types.
 */
import { lerEntrada } from "../lib/rede/acao-comum.ts";
import { MENU_REDE, modulosDoItem } from "../lib/rede/menu.ts";
import { mapPlano, mapRespostas, mapVisita } from "../lib/rede/mapeadores-qualidade.ts";
import { lerPerfil, podeEditar, podeVer, podeVerAlgum } from "../lib/rede/permissoes.ts";
import { acaoDesvioSchema, planoEdicaoSchema, planoNovoSchema, visitaSchema } from "../lib/rede/schemas-qualidade.ts";

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

/* ------------------------------------------------------------ visita */
{
  const base = { lojaId: L1, data: "2026-11-10", avaliador: "Ana Souza", gerente: "Beto", respostas: { "0-0": { v: "sim", o: null }, "0-1": { v: "nao", o: "sem etiqueta" } }, acoes: { "0-1": { acao: "Etiquetar", responsavel: "Caio", prazo: "2026-11-20", prioridade: "alta", status: "em_andamento" } } };
  assert(ok(visitaSchema, base), "visita válida");
  assert(ok(visitaSchema, { ...base, gerente: null, acoes: undefined }) && ok(visitaSchema, { ...base, gerente: undefined }), "gerente e ações são opcionais");
  igual(visitaSchema.parse({ ...base, gerente: "  " }).gerente, null, "gerente em branco vira nulo");
  igual(visitaSchema.parse({ ...base, acoes: undefined }).acoes, {}, "sem ações = objeto vazio");
  igual(visitaSchema.parse({ ...base, avaliador: "  Ana  " }).avaliador, "Ana", "avaliador é aparado");
  assert(!ok(visitaSchema, { ...base, avaliador: "   " }), "avaliador em branco é recusado");
  assert(!ok(visitaSchema, { ...base, avaliador: "x".repeat(121) }) && ok(visitaSchema, { ...base, avaliador: "x".repeat(120) }), "avaliador: no máximo 120 caracteres");
  assert(!ok(visitaSchema, { ...base, gerente: "x".repeat(121) }), "gerente com mais de 120 caracteres é recusado");
  assert(!ok(visitaSchema, { ...base, lojaId: "abc" }), "loja inválida é recusada");
  assert(!ok(visitaSchema, { ...base, data: "2026-02-30" }) && !ok(visitaSchema, { ...base, data: "10/11/2026" }), "data inexistente ou em outro formato é recusada");
  for (const k of ["6-0", "0-6", "4-5", "x", "0-0-0", ""]) assert(!ok(visitaSchema, { ...base, respostas: { [k]: { v: "sim" } } }), `item "${k}" fora da lista é recusado nas respostas`);
  assert(!ok(visitaSchema, { ...base, acoes: { "9-9": { acao: "x" } } }), "ação de item fora da lista é recusada");
  assert(!ok(visitaSchema, { ...base, respostas: { "0-0": { v: "talvez" } } }), "resposta inválida é recusada");
  assert(ok(visitaSchema, { ...base, respostas: { "0-0": { v: "na" }, "0-1": { v: null, o: "só obs" }, "0-2": null } }), "N/A, só observação e item nulo são aceitos");
  assert(!ok(visitaSchema, { ...base, respostas: { "0-0": { v: "sim", o: "x".repeat(301) } } }) && ok(visitaSchema, { ...base, respostas: { "0-0": { v: "sim", o: "x".repeat(300) } } }), "observação: no máximo 300 caracteres");
  assert(!ok(visitaSchema, { ...base, respostas: [] }) && !ok(visitaSchema, { ...base, respostas: "x" }), "respostas que não são objeto são recusadas");

  const a = acaoDesvioSchema.parse({});
  igual(a, { acao: null, responsavel: null, prazo: null, prioridade: "media", status: "pendente" }, "ação do desvio: padrão pendente, média, sem prazo");
  igual(acaoDesvioSchema.parse({ prazo: "" }).prazo, null, "prazo vazio vira nulo");
  igual(acaoDesvioSchema.parse({ acao: "  Trocar  " }).acao, "Trocar", "ação é aparada");
  assert(!ok(acaoDesvioSchema, { prazo: "2026-13-01" }) && !ok(acaoDesvioSchema, { prazo: "amanhã" }), "prazo inválido é recusado");
  assert(!ok(acaoDesvioSchema, { acao: "x".repeat(601) }) && ok(acaoDesvioSchema, { acao: "x".repeat(600) }), "ação: no máximo 600 caracteres");
  assert(!ok(acaoDesvioSchema, { responsavel: "x".repeat(121) }), "responsável: no máximo 120 caracteres");
  assert(!ok(acaoDesvioSchema, { prioridade: "urgente" }) && !ok(acaoDesvioSchema, { status: "atrasado" }), "prioridade e situação fora da lista são recusadas ('atrasado' não é gravado)");
  for (const s of ["pendente", "em_andamento", "concluido", "cancelado"]) assert(ok(acaoDesvioSchema, { status: s }), `situação "${s}" é aceita`);

  assert(lancou(() => lerEntrada(visitaSchema, { ...base, avaliador: "" })) === 'Confira o campo "avaliador": Informe o nome de quem visitou.', "mensagem: avaliador vazio");
  assert(lancou(() => lerEntrada(visitaSchema, { ...base, respostas: { "9-9": { v: "sim" } } })) === 'Confira o campo "respostas da visita": Item da visita inexistente.', "mensagem: item inexistente");
  assert(lancou(() => lerEntrada(visitaSchema, { ...base, respostas: { "0-0": { v: "talvez" } } })) === 'Confira o campo "resposta do item": Responda Sim, Não ou N/A.', "mensagem: resposta inválida");
  assert(lancou(() => lerEntrada(visitaSchema, { ...base, respostas: { "0-0": { v: "sim", o: "x".repeat(301) } } })) === 'Confira o campo "observação do item": No máximo 300 caracteres.', "mensagem: observação longa");
  assert(lancou(() => lerEntrada(visitaSchema, { ...base, acoes: { "0-1": { prioridade: "urgente" } } })) === 'Confira o campo "prioridade": Escolha a prioridade.', "mensagem: prioridade inválida");
  assert(lancou(() => lerEntrada(visitaSchema, { ...base, acoes: { "0-1": { prazo: "xx" } } })) === 'Confira o campo "prazo": Data inválida.', "mensagem: prazo inválido");
  assert(lancou(() => lerEntrada(visitaSchema, { ...base, data: "2026-02-30" })) === 'Confira o campo "data": Data inválida.', "mensagem: data inválida");
}

/* ------------------------------------------------------------ plano novo e edição */
{
  const base = { lojaId: L1, origemTipo: "manual", descricao: "Câmara fria desregulada", acao: "Chamar técnico", responsavel: "Caio", prazo: "2026-11-20", prioridade: "alta", status: "pendente", observacoes: null };
  assert(ok(planoNovoSchema, base), "plano novo válido");
  assert(ok(planoNovoSchema, { lojaId: L1, descricao: "x", origemTipo: "indicador" }), "só loja, origem e descrição bastam");
  igual(planoNovoSchema.parse({ lojaId: L1, descricao: "x", origemTipo: "manual" }), { lojaId: L1, origemTipo: "manual", origemRotulo: null, descricao: "x", acao: null, responsavel: null, prazo: null, prioridade: "media", status: "pendente", observacoes: null }, "padrões do plano novo");
  assert(!ok(planoNovoSchema, { ...base, origemTipo: "qualidade" }) && !ok(planoNovoSchema, { ...base, origemTipo: "delivery" }), "origem 'qualidade' e 'delivery' só nascem dos checklists");
  assert(!ok(planoNovoSchema, { ...base, descricao: "   " }) && !ok(planoNovoSchema, { ...base, descricao: "x".repeat(501) }) && ok(planoNovoSchema, { ...base, descricao: "x".repeat(500) }), "descrição: obrigatória, até 500");
  assert(!ok(planoNovoSchema, { ...base, status: "concluido" }) && !ok(planoNovoSchema, { ...base, status: "cancelado" }), "plano novo só nasce pendente ou em andamento");
  assert(!ok(planoNovoSchema, { ...base, observacoes: "x".repeat(1001) }) && !ok(planoNovoSchema, { ...base, origemRotulo: "x".repeat(201) }), "observações até 1000; origem até 200");
  assert(!ok(planoNovoSchema, { ...base, lojaId: "x" }), "loja inválida");
  assert(lancou(() => lerEntrada(planoNovoSchema, { ...base, descricao: "" })) === 'Confira o campo "descrição": Descreva o problema.', "mensagem: descrição vazia");
  assert(lancou(() => lerEntrada(planoNovoSchema, { ...base, origemTipo: "x" })) === 'Confira o campo "origem": Escolha a origem.', "mensagem: origem inválida");

  const ed = { acao: "Trocar", responsavel: null, prazo: null, prioridade: "baixa", status: "concluido", evidencia: "foto", observacoes: null };
  assert(ok(planoEdicaoSchema, ed) && ok(planoEdicaoSchema, { ...ed, descricao: "Nova descrição" }), "edição válida, com ou sem descrição");
  assert(!ok(planoEdicaoSchema, { ...ed, descricao: " " }), "descrição em branco na edição é recusada");
  assert(!ok(planoEdicaoSchema, { ...ed, status: "atrasado" }) && !ok(planoEdicaoSchema, { ...ed, status: undefined }) && !ok(planoEdicaoSchema, { ...ed, prioridade: undefined }), "situação e prioridade são obrigatórias e válidas");
  assert(!ok(planoEdicaoSchema, { ...ed, evidencia: "x".repeat(601) }), "evidência: até 600");
  assert(lancou(() => lerEntrada(planoEdicaoSchema, { ...ed, evidencia: "x".repeat(601) })) === 'Confira o campo "evidência": No máximo 600 caracteres.', "mensagem: evidência longa");
}

/* ------------------------------------------------------------ leitura do banco (dados sujos) */
{
  igual(mapRespostas(null), {}, "respostas nulas");
  igual(mapRespostas([]), {}, "respostas em lista");
  igual(mapRespostas("x"), {}, "respostas em texto");
  igual(mapRespostas({ "0-0": { v: "sim" }, "0-1": { v: "nao", o: "obs" }, "0-2": { o: "só obs" }, "0-3": { v: "xx" }, "9-9": { v: "sim" }, "1-0": null, "1-1": "x", "1-2": { v: "na", o: "  " } }), { "0-0": { v: "sim", o: null }, "0-1": { v: "nao", o: "obs" }, "0-2": { v: null, o: "só obs" }, "1-2": { v: "na", o: null } }, "respostas: ignora o que não é item da lista ou resposta válida");

  const v = mapVisita({ id: "v1", loja_id: L1, data: "2026-11-10T00:00:00Z", avaliador: null, gerente: "  ", respostas: { "0-0": { v: "sim" } }, origem: "x", created_at: "2026-11-10T12:00:00Z" });
  igual(v, { id: "v1", lojaId: L1, data: "2026-11-10", avaliador: "", gerente: null, respostas: { "0-0": { v: "sim", o: null } }, origem: "manual", criadaEm: "2026-11-10T12:00:00Z" }, "visita: dados sujos viram valores seguros");
  igual(mapVisita({ id: "v2", loja_id: L1, data: "2026-11-10", avaliador: "A", origem: "exemplo", respostas: {} }).origem, "exemplo", "visita de exemplo continua marcada");

  const p = mapPlano({ id: "p1", loja_id: L1, origem_tipo: "qualidade", origem_id: "v1", origem_ref: "0-1", origem_rotulo: "r", descricao: "d", acao: "  ", responsavel: "Ana", prazo: "2026-11-20", prioridade: "alta", status: "em_andamento", data_conclusao: null, evidencia: null, observacoes: null, verificado_em: null, created_at: "2026-11-10T12:00:00Z" });
  igual(p, { id: "p1", lojaId: L1, origemTipo: "qualidade", origemId: "v1", origemRef: "0-1", origemRotulo: "r", descricao: "d", acao: null, responsavel: "Ana", prazo: "2026-11-20", prioridade: "alta", status: "em_andamento", dataConclusao: null, evidencia: null, observacoes: null, verificadoEm: null, criadoEm: "2026-11-10T12:00:00Z" }, "plano: leitura normal (ação em branco vira nulo)");
  const sujo = mapPlano({ id: "p2", loja_id: L1, origem_tipo: "outra", origem_id: 5, prioridade: "urgente", status: "atrasado", prazo: "amanhã", data_conclusao: "2026-11-12T00:00:00Z", verificado_em: "2026-11-13T09:00:00Z" });
  igual([sujo.origemTipo, sujo.origemId, sujo.prioridade, sujo.status, sujo.prazo, sujo.dataConclusao, sujo.verificadoEm, sujo.origemRotulo, sujo.descricao], ["manual", null, "media", "pendente", null, "2026-11-12", "2026-11-13T09:00:00Z", "", ""], "plano: dados sujos viram valores seguros");
}

/* ------------------------------------------------------------ menu e permissões */
{
  const rotulos = MENU_REDE.map((m) => m.label);
  assert(rotulos.indexOf("Checklist de qualidade") === rotulos.indexOf("Cozinha central") + 1, "Checklist de qualidade logo depois da Cozinha central");
  assert(rotulos.indexOf("Checklist de delivery") === rotulos.indexOf("Checklist de qualidade") + 1, "Checklist de delivery logo depois do de qualidade");
  assert(rotulos.indexOf("Planos de ação") === rotulos.indexOf("Checklist de delivery") + 1, "Planos de ação logo depois dos checklists");
  const q = MENU_REDE.find((m) => m.href === "/qualidade");
  const pl = MENU_REDE.find((m) => m.href === "/planos");
  igual([modulosDoItem(q), modulosDoItem(pl)], [["qualidade"], ["planos_acao"]], "cada aba abre com o seu módulo");
  assert(new Set(MENU_REDE.map((m) => m.href)).size === MENU_REDE.length, "sem abas repetidas");
  assert(MENU_REDE[0].href === "" && MENU_REDE[MENU_REDE.length - 1].href === "/lojas", "Visão geral primeiro, Lojas e acessos por último");

  const perfil = (papel, modulos) => lerPerfil({ papel, todas_lojas: false, loja_ids: [L1], modulos });
  const gerente = perfil("gerente_loja", { qualidade: { ver: true, editar: true }, planos_acao: { ver: true, editar: true } });
  const diretoria = perfil("diretoria", { qualidade: { ver: true, editar: false }, planos_acao: { ver: true, editar: false } });
  const soQualidade = perfil("colaborador", { qualidade: { ver: true, editar: true } });
  assert(podeVer(gerente, "qualidade") && podeEditar(gerente, "qualidade") && podeEditar(gerente, "planos_acao"), "gerente de loja vê e edita qualidade e planos");
  assert(podeVer(diretoria, "planos_acao") && !podeEditar(diretoria, "planos_acao") && !podeEditar(diretoria, "qualidade"), "diretoria só consulta");
  assert(podeVerAlgum(soQualidade, modulosDoItem(q)) && !podeVerAlgum(soQualidade, modulosDoItem(pl)), "quem só tem qualidade não vê a aba de planos");
  assert(!podeVerAlgum(null, modulosDoItem(q)) && !podeVerAlgum(undefined, modulosDoItem(pl)), "sem perfil não vê nada");
}

console.log(`rede-qual-app-tests: ${pass} verificações ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
