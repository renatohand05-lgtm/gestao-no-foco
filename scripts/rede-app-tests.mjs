#!/usr/bin/env node
/**
 * Testes da camada de aplicação da rede de lojas: permissões por perfil,
 * filtros de período/loja, importação e exportação de CSV.
 * Node com --experimental-strip-types.
 */
import { dataValida, lerFiltros, mesDeReferencia, paraQuery, rotuloPeriodo } from "../lib/rede/filtros.ts";
import { gerarCsv, lerData, lerNumero, lerVendasCsv } from "../lib/rede/csv.ts";
import { ehGestaoDaRede, lerPerfil, lojasDoPerfil, podeEditar, podeVer } from "../lib/rede/permissoes.ts";

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

/* ------------------------------------------------------------ permissões */
{
  const raw = {
    papel: "gerente_loja",
    todas_lojas: false,
    loja_ids: ["l1"],
    modulos: { vendas: { ver: true, editar: true }, dre: { ver: false, editar: false }, metas: { ver: true, editar: false } },
  };
  const p = lerPerfil(raw);
  assert(p.papel === "gerente_loja" && p.todasLojas === false, "perfil lido");
  assert(podeVer(p, "vendas") && podeEditar(p, "vendas"), "gerente de loja lança vendas");
  assert(podeVer(p, "metas") && !podeEditar(p, "metas"), "gerente de loja só lê metas");
  assert(!podeVer(p, "dre"), "gerente de loja não vê DRE");
  assert(!podeVer(p, "config") && !podeEditar(p, "config"), "módulo ausente = sem acesso");
  assert(!podeVer(null, "vendas") && !podeEditar(undefined, "vendas"), "sem perfil = sem acesso");
  assert(lerPerfil(null) === null && lerPerfil("x") === null && lerPerfil({}) === null, "perfil inválido = null");
  const lojas = [{ id: "l1" }, { id: "l2" }, { id: "l3" }];
  igual(lojasDoPerfil(p, lojas), [{ id: "l1" }], "gerente de loja enxerga só a sua loja");
  igual(lojasDoPerfil({ ...p, todasLojas: true }, lojas).length, 3, "todas as lojas");
  igual(lojasDoPerfil(null, lojas), [], "sem perfil não vê loja nenhuma");
  assert(ehGestaoDaRede({ papel: "consultor", todasLojas: true, lojaIds: [], modulos: {} }) && !ehGestaoDaRede(p), "gestão da rede = administrador ou consultor");
  const sujo = lerPerfil({ papel: "diretoria", todas_lojas: "sim", loja_ids: [1, "a"], modulos: { dre: { ver: "true" } } });
  assert(sujo.todasLojas === false && sujo.lojaIds.length === 1 && sujo.modulos.dre.ver === false, "valores fora do tipo não concedem acesso");
}

/* ------------------------------------------------------------ filtros */
{
  const f = lerFiltros({}, "2026-10");
  igual([f.modo, f.mes, f.de, f.ate, f.loja], ["mes", "2026-10", "2026-10-01", "2026-10-31", null], "padrão: mês do último lançamento");
  igual(lerFiltros({ mes: "2026-02" }, "2026-10").ate, "2026-02-28", "mês informado");
  igual(lerFiltros({ mes: "2026-13" }, "2026-10").mes, "2026-10", "mês inválido volta ao padrão");
  igual(lerFiltros({ mes: "abc" }, "2026-10").mes, "2026-10", "lixo volta ao padrão");
  const a = lerFiltros({ periodo: "ano", ano: "2026" }, "2026-10");
  igual([a.de, a.ate], ["2026-01-01", "2026-12-31"], "ano inteiro");
  igual(lerFiltros({ periodo: "ano", ano: "1850" }, "2026-10").ano, "2026", "ano absurdo volta ao padrão");
  const i = lerFiltros({ periodo: "intervalo", de: "2026-10-05", ate: "2026-10-20" }, "2026-10");
  igual([i.de, i.ate], ["2026-10-05", "2026-10-20"], "intervalo");
  const inv = lerFiltros({ periodo: "intervalo", de: "2026-10-20", ate: "2026-10-05" }, "2026-10");
  igual([inv.de, inv.ate], ["2026-10-05", "2026-10-20"], "intervalo invertido é corrigido");
  const longo = lerFiltros({ periodo: "intervalo", de: "2020-01-01", ate: "2040-01-01" }, "2026-10");
  igual(longo.ate, "2025-01-01", "intervalo recortado em 5 anos");
  igual(lerFiltros({ periodo: "intervalo", de: "2026-02-31", ate: "x" }, "2026-10").de, "2026-10-01", "data impossível cai no padrão");
  igual(lerFiltros({ loja: "brooklyn" }, "2026-10").loja, "brooklyn", "loja por slug");
  igual(lerFiltros({ loja: "Brooklyn; drop table" }, "2026-10").loja, null, "slug com caracteres perigosos é ignorado");
  igual(lerFiltros({ mes: ["2026-05", "2026-06"] }, "2026-10").mes, "2026-05", "parâmetro repetido usa o primeiro");
  assert(dataValida("2028-02-29") && !dataValida("2026-02-29") && !dataValida("2026-1-1"), "validação de data");
  igual(rotuloPeriodo({ modo: "mes", mes: "2026-10", ano: "2026", de: "", ate: "" }), "out/2026", "rótulo do mês");
  igual(rotuloPeriodo({ modo: "ano", mes: "", ano: "2026", de: "", ate: "" }), "2026", "rótulo do ano");
  igual(rotuloPeriodo({ modo: "intervalo", mes: "", ano: "", de: "2026-10-05", ate: "2026-10-20" }), "05/10/2026 a 20/10/2026", "rótulo do intervalo");
  igual(paraQuery({ modo: "mes", mes: "2026-10", loja: "tatuape" }), "?mes=2026-10&loja=tatuape", "query do mês");
  igual(paraQuery({ modo: "ano", ano: "2026" }), "?periodo=ano&ano=2026", "query do ano");
  igual(paraQuery({ modo: "intervalo", de: "2026-10-01", ate: "2026-10-09" }), "?periodo=intervalo&de=2026-10-01&ate=2026-10-09", "query do intervalo");
  // Mês de referência
  igual(mesDeReferencia("2026-01-01", "2026-12-31", "2026-11-18", ["2026-10-31", "2026-10-02"]), "2026-10", "ano: último mês com vendas");
  igual(mesDeReferencia("2026-01-01", "2026-12-31", "2026-11-18", []), "2026-11", "ano sem vendas: mês corrente");
  igual(mesDeReferencia("2026-12-01", "2026-12-31", "2026-11-18", []), "2026-12", "só meses futuros: o primeiro do período");
  igual(mesDeReferencia("2026-10-01", "2026-10-31", "2026-11-18", ["2026-09-30"]), "2026-10", "vendas fora do período não contam");
}

/* ------------------------------------------------------------ números e datas */
{
  igual(lerNumero("R$ 1.234,56"), 1234.56, "moeda brasileira");
  igual(lerNumero("1234.56"), 1234.56, "ponto decimal");
  igual(lerNumero("1.234"), 1234, "ponto de milhar");
  igual(lerNumero("12,5"), 12.5, "vírgula decimal");
  igual(lerNumero("1,234.56"), 1234.56, "formato americano");
  igual(lerNumero("0"), 0, "zero");
  igual(lerNumero("-5"), -5, "negativo é lido (a validação rejeita depois)");
  igual(lerNumero(""), null, "vazio");
  igual(lerNumero("abc"), null, "texto");
  igual(lerNumero("1,2,3"), null, "vírgulas demais");
  igual(lerNumero("1e5"), null, "notação científica não é aceita");
  igual(lerData("2026-10-31"), "2026-10-31", "ISO");
  igual(lerData("31/10/2026"), "2026-10-31", "dia/mês/ano");
  igual(lerData("1/2/2026"), "2026-02-01", "sem zeros");
  igual(lerData("31/02/2026"), null, "data impossível");
  igual(lerData("2026/10/31"), null, "formato desconhecido");
}

/* ------------------------------------------------------------ importação */
{
  const lojas = [
    { id: "L1", slug: "brooklyn", nome: "Brooklyn" },
    { id: "L2", slug: "tatuape", nome: "Tatuapé" },
  ];
  const hoje = "2026-11-18";
  let r = lerVendasCsv("loja;data;salão;delivery;pedidos salão;pedidos delivery\nBrooklyn;01/10/2026;6.611,00;23.038,00;103;303\ntatuape;2026-10-01;0;5798;0;85\n", lojas, hoje);
  assert(r.erros.length === 0 && r.linhas.length === 2 && r.total === 2, "importa com cabeçalho, nomes e formatos diferentes");
  igual(r.linhas[0], { lojaId: "L1", data: "2026-10-01", salao: 6611, delivery: 23038, pedidosSalao: 103, pedidosDelivery: 303 }, "linha convertida");
  igual(r.linhas[1].lojaId, "L2", "loja achada por slug");
  r = lerVendasCsv("Tatuape;2026-10-02;0;7252;0;107", lojas, hoje);
  assert(r.linhas.length === 1 && r.linhas[0].lojaId === "L2", "sem cabeçalho (ordem padrão) e nome sem acento");
  r = lerVendasCsv("loja,data,salao,delivery\nbrooklyn,2026-10-01,100.5,200\n", lojas, hoje);
  assert(r.linhas.length === 1 && r.linhas[0].salao === 100.5 && r.linhas[0].pedidosSalao === 0, "separador vírgula; colunas de pedidos opcionais");
  r = lerVendasCsv("loja;data;salao;delivery\nBrooklyn;2026-10-01;100;200\nBrooklyn;2026-10-01;300;400\n", lojas, hoje);
  assert(r.linhas.length === 1 && r.erros.length === 1 && r.erros[0].linha === 3, "linha repetida (loja+data) vira erro e não sobrescreve");
  r = lerVendasCsv("loja;data;salao;delivery\nOutra;2026-10-01;1;1\nBrooklyn;31/02/2026;1;1\nBrooklyn;2027-01-01;1;1\nBrooklyn;2026-10-02;-5;1\nBrooklyn;2026-10-03;x;1\nBrooklyn;2026-10-04;1e9;1\nBrooklyn;2026-10-05;10;20\n", lojas, hoje);
  assert(r.linhas.length === 1 && r.erros.length === 6, `6 linhas ruins, 1 boa (erros: ${r.erros.length})`);
  assert(r.erros.some((e) => /não encontrada/.test(e.mensagem)) && r.erros.some((e) => /futuro/.test(e.mensagem)) && r.erros.some((e) => /negativos/.test(e.mensagem)), "mensagens específicas");
  r = lerVendasCsv("loja;data;salao;delivery;pedidos salao;pedidos delivery\nBrooklyn;2026-10-01;1;1;2,5;1\n", lojas, hoje);
  assert(r.linhas.length === 0 && /inteiros/.test(r.erros[0].mensagem), "pedido fracionado é recusado");
  r = lerVendasCsv("", lojas, hoje);
  assert(r.linhas.length === 0 && r.erros.length === 1, "arquivo vazio");
  r = lerVendasCsv("loja;data\nBrooklyn;2026-10-01", lojas, hoje);
  assert(r.linhas.length === 0 && /sem as colunas/.test(r.erros[0].mensagem), "cabeçalho sem as colunas obrigatórias");
  r = lerVendasCsv("﻿loja;data;salao;delivery\r\nBrooklyn;2026-10-01;1;2\r\n\r\n", lojas, hoje);
  assert(r.linhas.length === 1 && r.total === 1, "BOM, CRLF e linhas em branco");
  r = lerVendasCsv('loja;data;salao;delivery\n"Brooklyn";2026-10-01;"1.000,50";2\n', lojas, hoje);
  assert(r.linhas.length === 1 && r.linhas[0].salao === 1000.5, "campos entre aspas");
  const muitas = `loja;data;salao;delivery\n${Array.from({ length: 5001 }, () => "Brooklyn;2026-10-01;1;1").join("\n")}`;
  assert(lerVendasCsv(muitas, lojas, hoje).linhas.length === 0, "limite de linhas por importação");
  // Loja sem acesso: só quem está na lista é encontrado.
  r = lerVendasCsv("loja;data;salao;delivery\nTatuapé;2026-10-01;1;1\n", [lojas[0]], hoje);
  assert(r.linhas.length === 0 && /sem acesso/.test(r.erros[0].mensagem), "loja fora da lista de acesso é recusada");
}

/* ------------------------------------------------------------ exportação */
{
  const csv = gerarCsv([["Loja", "Valor"], ["Brooklyn", 1234.5], ["A;B", 1], ['Diz "oi"', 2], ["=1+1", 3], ["+cmd", 4], ["-x", 5], ["@a", 6], [null, undefined]]);
  assert(csv.startsWith("﻿"), "começa com BOM (Excel abre em UTF-8)");
  const linhas = csv.trim().split("\r\n");
  igual(linhas[1], "Brooklyn;1234,5", "decimal com vírgula");
  igual(linhas[2], '"A;B";1', "separador dentro do texto vai entre aspas");
  igual(linhas[3], '"Diz ""oi""";2', "aspas duplicadas");
  igual(linhas[4], "'=1+1;3", "fórmula neutralizada");
  igual(linhas[5], "'+cmd;4", "mais neutralizado");
  igual(linhas[6], "'-x;5", "menos neutralizado");
  igual(linhas[7], "'@a;6", "arroba neutralizado");
  igual(linhas[8], ";", "vazios");
  igual(gerarCsv([[-5]]).slice(1).trim(), "-5", "número negativo não é neutralizado");
  // ida e volta
  const lojas = [{ id: "L1", slug: "b", nome: "B" }];
  const exp = gerarCsv([["loja", "data", "salao", "delivery", "pedidos salao", "pedidos delivery"], ["b", "2026-10-01", 1234.56, 99, 10, 5]]);
  const volta = lerVendasCsv(exp, lojas, "2026-11-18");
  assert(volta.erros.length === 0 && volta.linhas[0].salao === 1234.56 && volta.linhas[0].delivery === 99, "o que exportamos, importamos de volta");
}

console.log(`\nRede (aplicação): ${pass} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);
