#!/usr/bin/env node
/**
 * Testes do importador de planilha (lib/planilha-agencia).
 * Monta planilhas sintéticas com o SheetJS e confere: leitura (.xlsx/.csv), bloqueio de macro,
 * detecção de clientes e de DRE (meses em colunas e quadros por mês), conciliação com o
 * resultado da planilha, classificação de categorias e o plano que não duplica ao reimportar.
 * Node com --experimental-strip-types.
 */
import * as XLSX from "xlsx";

import { analisarPlanilha, sugerirOpcoes } from "../lib/planilha-agencia/analisar.ts";
import { classificarCategoria } from "../lib/planilha-agencia/categorias.ts";
import { lerPlanilha, validarArquivoDePlanilha } from "../lib/planilha-agencia/leitor.ts";
import {
  chaveDoLancamento,
  descricaoDoLancamento,
  extrairChave,
  observacaoDoLancamento,
  planejarClientes,
} from "../lib/planilha-agencia/plano.ts";
import { juntarOpcoes, montarPreparo, sanearOpcoes } from "../lib/planilha-agencia/preparo.ts";
import { montarRespostaAnalise } from "../lib/planilha-agencia/respostas.ts";

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
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg} — esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);
}
function perto(a, b, msg) {
  assert(typeof a === "number" && Math.abs(a - b) < 0.01, `${msg} — esperado ${b}, veio ${a}`);
}

const HOJE = { ano: 2026, mes: 11 };
const d = (a, m, dia) => new Date(Date.UTC(a, m - 1, dia, 12));

function xlsx(abas) {
  const wb = XLSX.utils.book_new();
  for (const [nome, linhas] of Object.entries(abas)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhas, { cellDates: true }), nome);
  }
  return new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

/* ------------------------------------------------------------------ clientes */

const CLIENTES = [
  ["Cliente", "Nicho", "Status", "Entrada", "Saída", "MRR", "Motivo da saída"],
  ["Alfa Odontologia", "Saúde", "Ativo", d(2026, 1, 10), null, 2500, null],
  ["Beta Imóveis", "Imobiliária", "Ativo", d(2026, 2, 5), null, 3000, null],
  ["Gama Estética", "Saúde", "Churn", d(2026, 1, 20), d(2026, 3, 20), 1800, "Preço"],
  ["Delta Pet", "Pet", "Ativo", d(2026, 4, 1), null, 1200, null],
  ["Épsilon Café", "Alimentação", "Cancelado", d(2026, 3, 3), d(2026, 6, 15), 900, "Fechou a empresa"],
  ["TOTAL", null, null, null, null, 9400, null],
];

{
  const bytes = xlsx({ Clientes: CLIENTES });
  const planilha = lerPlanilha("clientes.xlsx", bytes);
  const analise = analisarPlanilha(planilha, HOJE);
  assert(analise.clientes.length === 1, "acha uma tabela de clientes");
  const t = analise.clientes[0];
  igual(t.aba, "Clientes", "aba dos clientes");
  igual(t.clientes.length, 5, "5 clientes (a linha TOTAL é ignorada)");
  const ativos = t.clientes.filter((c) => c.ativo);
  igual(ativos.length, 3, "3 ativos");
  perto(ativos.reduce((s, c) => s + (c.mrr ?? 0), 0), 6700, "MRR dos ativos");
  const gama = t.clientes.find((c) => c.nome === "Gama Estética");
  igual(gama?.ativo, false, "churn marcado como inativo");
  igual(gama?.saida, "2026-03-20", "data de saída lida como data (sem mudar de dia)");
  igual(gama?.entrada, "2026-01-20", "data de entrada");
  igual(gama?.motivo, "Preço", "motivo da saída");
  igual(t.clientes.find((c) => c.nome === "Épsilon Café")?.ativo, false, "'Cancelado' também é churn");
}

// Colunas em outra ordem e com outros nomes.
{
  const bytes = xlsx({
    Carteira: [
      ["Data de início", "Razão social", "Valor mensal", "Situação"],
      [d(2026, 5, 2), "Clínica Sol", 4000, "ativa"],
      [d(2026, 6, 9), "Clínica Lua", 3500, "ativa"],
      [d(2026, 7, 1), "Clínica Mar", 3000, "inativa"],
    ],
  });
  const a = analisarPlanilha(lerPlanilha("carteira.xlsx", bytes), HOJE);
  igual(a.clientes[0]?.clientes.length, 3, "sinônimos de cabeçalho reconhecidos");
  igual(a.clientes[0]?.clientes.filter((c) => c.ativo).length, 2, "status 'inativa' vira churn");
}

// Linha sem nome: o nome provisório segue o padrão já gravado antes (não duplica ao reimportar).
{
  const bytes = xlsx({
    Clientes: [
      ["Cliente", "Entrada", "Status", "MRR"],
      ["Alfa", d(2026, 1, 10), "Ativo", 1000],
      [null, d(2026, 1, 20), "Churn", 2000],
      ["Beta", d(2026, 2, 10), "Ativo", 1500],
    ],
  });
  const t = analisarPlanilha(lerPlanilha("c.xlsx", bytes), HOJE).clientes[0];
  const semNome = t.clientes.find((c) => c.avisos.includes("Sem nome na planilha."));
  igual(semNome?.nome, "(sem nome na planilha - linha 3)", "nome provisório da linha sem nome");
  igual(semNome?.chave, "sem nome na planilha linha 3|2026-01-20", "chave igual à do cliente já gravado no banco");
}

// Tabela que não é de clientes (sem datas de entrada) não pode ser aceita.
{
  const bytes = xlsx({
    Pendentes: [
      ["Cliente", "Valor", "Vencimento", "Status"],
      ["A", 100, "pendente", "pendente"],
      ["B", 200, "pendente", "pendente"],
      ["C", 300, "pendente", "pendente"],
    ],
  });
  const a = analisarPlanilha(lerPlanilha("pend.xlsx", bytes), HOJE);
  igual(a.clientes.length, 0, "tabela sem data de entrada não é lista de clientes");
}

/* ------------------------------------------------------------------ DRE: meses em colunas */

const DRE_COLUNAS = [
  ["DRE 2026"],
  ["Conta", "jan/26", "fev/26", "mar/26", "Total"],
  ["RECEITAS"],
  ["Mensalidades", 10000, 12000, 14000, 36000],
  ["Setup", 2000, 1000, 0, 3000],
  ["Total receitas", 12000, 13000, 14000, 39000],
  ["DESPESAS"],
  ["Folha de pagamento", 5000, 5000, 5500, 15500],
  ["Tráfego pago", 1500, 2000, 2500, 6000],
  ["Simples Nacional", 800, 900, 1000, 2700],
  ["Aluguel", 1000, 1000, 1000, 3000],
  ["Distribuição de lucros", 1000, 1000, 1000, 3000],
  ["Total despesas", 9300, 9900, 11000, 30200],
  ["Resultado líquido", 2700, 3100, 3000, 8800],
];

let layoutColunas;
{
  const bytes = xlsx({ DRE: DRE_COLUNAS });
  const a = analisarPlanilha(lerPlanilha("dre.xlsx", bytes), HOJE);
  assert(a.dre.length >= 1, "acha a DRE com meses em colunas");
  layoutColunas = a.dre[0];
  igual(layoutColunas.formato, "meses-em-colunas", "formato meses em colunas");
  igual(layoutColunas.meses.map((m) => m.mes), ["2026-01", "2026-02", "2026-03"], "3 meses (a coluna Total não vira mês)");
  const jan = layoutColunas.meses[0];
  perto(jan.receita, 12000, "receita de jan = só as contas (sem somar o 'Total receitas')");
  perto(jan.despesa, 9300, "despesa de jan");
  igual(jan.confere, true, "resultado confere com a linha 'Resultado líquido' da planilha");
  assert(
    layoutColunas.itens.every((i) => !/total/i.test(i.rotulo)),
    "linhas de total não viram lançamento",
  );
  assert(
    layoutColunas.itens.some((i) => i.rotulo === "Mensalidades" && i.mes === "2026-02" && i.valor === 12000),
    "item Mensalidades de fev = 12000",
  );
}

/* ------------------------------------------------------------------ DRE: um quadro por mês */

const BLOCOS = [];
function quadro(titulo, linhas) {
  BLOCOS.push([titulo]);
  BLOCOS.push(["Descrição", "Sem 1", "Sem 2", "Total"]);
  for (const l of linhas) BLOCOS.push(l);
  BLOCOS.push([]);
}
quadro("MARÇO/2026", [
  ["RECEITAS"],
  ["Mensalidades", 4000, 4000, 8000],
  ["Total receitas", 4000, 4000, 8000],
  ["DESPESAS"],
  ["Folha", 1500, 1500, 3000],
  ["Ferramentas", 500, 500, 1000],
  ["Total despesas", 2000, 2000, 4000],
  ["Resultado líquido", 2000, 2000, 4000],
]);
quadro("ABRIL/2026", [
  ["RECEITAS"],
  ["Mensalidades", 5000, 5000, 10000],
  ["Total receitas", 5000, 5000, 10000],
  ["DESPESAS"],
  ["Folha", 1500, 1500, 3000],
  ["Ferramentas", 600, 600, 1200],
  ["Total despesas", 2100, 2100, 4200],
  ["Resultado líquido", 2900, 2900, 5800],
]);
quadro("MAIO/2026", [
  ["RECEITAS"],
  ["Mensalidades", 6000, 6000, 12000],
  ["Total receitas", 6000, 6000, 12000],
  ["DESPESAS"],
  ["Folha", 1600, 1600, 3200],
  ["Ferramentas", 600, 600, 1200],
  ["Total despesas", 2200, 2200, 4400],
  ["Resultado líquido", 3800, 3800, 7600],
]);

let layoutBlocos;
{
  const bytes = xlsx({ "DRE MENSAL": BLOCOS });
  const a = analisarPlanilha(lerPlanilha("blocos.xlsx", bytes), HOJE);
  layoutBlocos = a.dre.find((l) => l.formato === "blocos-por-mes");
  assert(Boolean(layoutBlocos), "acha a DRE em quadros por mês");
  if (layoutBlocos) {
    igual(layoutBlocos.meses.map((m) => m.mes), ["2026-03", "2026-04", "2026-05"], "mês de cada quadro vem do título");
    perto(layoutBlocos.meses[0].receita, 8000, "receita de março");
    perto(layoutBlocos.meses[1].despesa, 4200, "despesa de abril");
    assert(layoutBlocos.meses.every((m) => m.confere === true), "todos os quadros conferem com o resultado da planilha");
    assert(layoutBlocos.itens.every((i) => i.blocoId), "itens de quadros guardam o id do quadro");
  }
}

// Quadro com o resultado errado na planilha: não confere (o usuário é avisado).
{
  const quebrado = structuredClone(DRE_COLUNAS);
  quebrado[quebrado.length - 1] = ["Resultado líquido", 2700, 9999, 3000, 8800];
  const a = analisarPlanilha(lerPlanilha("dre.xlsx", xlsx({ DRE: quebrado })), HOJE);
  const l = a.dre[0];
  igual(l.meses.map((m) => m.confere), [true, false, true], "mês com total divergente é sinalizado");
}

/* ------------------------------------------------------------------ CSV e segurança */

{
  const csv = "Cliente;Entrada;Status;MRR\nAlfa Café;10/01/2026;Ativo;1.500,00\nBeta Ótica;15/02/2026;Ativo;2.000,00\nGama Açaí;01/03/2026;Churn;900,00\n";
  const planilha = lerPlanilha("clientes.csv", new Uint8Array(Buffer.from(csv, "utf-8")));
  const a = analisarPlanilha(planilha, HOJE);
  igual(a.clientes[0]?.clientes.length, 3, "CSV com ponto e vírgula e vírgula decimal");
  perto(a.clientes[0]?.clientes[0]?.mrr ?? 0, 1500, "valor 1.500,00 lido como 1500");

  const latin1 = Buffer.from(csv, "latin1");
  const b = analisarPlanilha(lerPlanilha("clientes.csv", new Uint8Array(latin1)), HOJE);
  assert(
    b.clientes[0]?.clientes.some((c) => c.nome === "Beta Ótica"),
    "CSV salvo em Windows-1252 mantém os acentos",
  );
}
{
  const fake = new Uint8Array(Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), Buffer.from("xl/vbaProject.bin")]));
  let msg = "";
  try {
    validarArquivoDePlanilha("x.xlsx", fake);
  } catch (e) {
    msg = String(e.message);
  }
  assert(/macro/i.test(msg), "arquivo com macro é bloqueado");

  for (const nome of ["a.pdf", "a.xlsm", "a.exe", "semextensao"]) {
    let erro = false;
    try {
      validarArquivoDePlanilha(nome, new Uint8Array([1, 2, 3]));
    } catch {
      erro = true;
    }
    assert(erro, `extensão não aceita: ${nome}`);
  }
  let erroZip = false;
  try {
    validarArquivoDePlanilha("a.xlsx", new Uint8Array([1, 2, 3, 4]));
  } catch {
    erroZip = true;
  }
  assert(erroZip, ".xlsx que não é ZIP é recusado");
}

/* ------------------------------------------------------------------ categorias */

{
  const sem = () => null;
  const c = (nome, tipo = "despesa") => classificarCategoria(nome, tipo, sem);
  igual(c("Mensalidades", "receita").dre_linha, "receita_bruta", "receita comum → receita bruta");
  igual(c("Rendimentos de aplicação", "receita").dre_linha, "receitas_financeiras", "rendimento → receita financeira");
  igual(c("Distribuição de lucros").dre_linha, null, "distribuição de lucros fica fora do resultado");
  igual(c("Simples Nacional").dre_linha, "deducoes", "imposto → dedução");
  igual(c("Folha de pagamento").dre_linha, "despesas_pessoal", "folha → pessoal");
  igual(c("Pró-labore").dre_detalhe, "pessoal_prolabore", "pró-labore → detalhe próprio");
  igual(c("Comissão de vendas").dre_detalhe, "pessoal_bonus", "comissão → bônus");
  igual(c("Tráfego pago").dre_linha, "despesas_comerciais", "tráfego → comercial");
  igual(c("Aluguel").dre_linha, "despesas_operacionais", "sem regra → operacional (padrão)");
  const viaNome = classificarCategoria("Energia", "despesa", () => ({ linha: "despesas_operacionais", detalhe: "utilidades_energia" }));
  igual(viaNome.dre_detalhe, "utilidades_energia", "usa a sugestão por nome do portal quando não há regra");
}

/* ------------------------------------------------------------------ plano / não duplica */

function existentesDoPlano(preparo, { clientes = true, lancamentos = true } = {}) {
  let n = 0;
  return {
    clientes: clientes
      ? preparo.planoClientes.map((p) => ({
          id: `c${++n}`,
          nome: p.cliente.nome,
          data_referencia: p.cliente.entrada,
          ativo: p.cliente.ativo,
          data_fechamento: p.cliente.ativo ? null : p.cliente.saida,
          valor_estimado: p.cliente.mrr,
          motivo_perda: p.cliente.ativo ? null : p.cliente.motivo,
          segmento: p.cliente.nicho,
          observacoes: null,
        }))
      : [],
    lancamentos: lancamentos
      ? preparo.planoLancamentos.map((l) => ({
          id: `l${++n}`,
          tipo: l.item.tipo,
          descricao: descricaoDoLancamento(l.item),
          mes: l.item.mes,
          valor: l.item.valor,
          chave: extrairChave(observacaoDoLancamento(l.item, "x.xlsx", "DRE")),
        }))
      : [],
    categorias: [],
  };
}

{
  const bytes = xlsx({ Clientes: CLIENTES, DRE: DRE_COLUNAS });
  const analise = analisarPlanilha(lerPlanilha("empresa.xlsx", bytes), HOJE);
  const sug = () => null;
  const vazio = { clientes: [], lancamentos: [], categorias: [] };

  const sugestao = sugerirOpcoes(analise);
  assert(sugestao.abasClientes.includes("Clientes"), "sugere a aba de clientes");
  assert(Boolean(sugestao.layoutDre), "sugere um layout de DRE");

  const opcoes = juntarOpcoes(analise, undefined);
  igual(opcoes.mesesDre, ["2026-01", "2026-02", "2026-03"], "por padrão importa todos os meses do quadro");

  const primeira = montarPreparo({ analise, opcoes, existentes: vazio, sugerir: sug });
  assert(primeira.planoClientes.every((p) => p.situacao === "novo"), "1ª importação: todos os clientes são novos");
  assert(primeira.planoLancamentos.length > 0, "1ª importação cria lançamentos");
  assert(primeira.planoLancamentos.every((l) => l.acao === "criar"), "1ª importação: tudo 'criar'");
  assert(primeira.categorias.every((c) => c.nova), "1ª importação: categorias novas");
  igual(
    primeira.categorias.find((c) => c.nome === "Distribuição de lucros")?.nova?.dre_linha,
    null,
    "distribuição de lucros entra sem linha da DRE",
  );

  // Reimportar o mesmo arquivo: nada novo.
  const ex = existentesDoPlano(primeira);
  const segunda = montarPreparo({ analise, opcoes, existentes: ex, sugerir: sug });
  assert(segunda.planoClientes.every((p) => p.situacao === "igual"), "reimportar: clientes já estão iguais");
  assert(segunda.planoLancamentos.every((l) => l.acao === "manter"), "reimportar: lançamentos mantidos (não duplica)");
  assert(
    segunda.planoMeses.every((m) => m.situacao === "igual"),
    "reimportar: meses 'já importado'",
  );

  // Valor mudou na planilha: atualiza, não cria outro.
  const alterada = structuredClone(DRE_COLUNAS);
  alterada[3][2] = 12500; // Mensalidades de fev
  alterada[5][2] = 13500;
  alterada[13][2] = 3600;
  const analise2 = analisarPlanilha(lerPlanilha("empresa.xlsx", xlsx({ Clientes: CLIENTES, DRE: alterada })), HOJE);
  const terceira = montarPreparo({
    analise: analise2,
    opcoes: juntarOpcoes(analise2, undefined),
    existentes: ex,
    sugerir: sug,
  });
  const atualiza = terceira.planoLancamentos.filter((l) => l.acao === "atualizar");
  igual(atualiza.length, 1, "só o item que mudou é atualizado");
  igual(atualiza[0]?.item.rotulo, "Mensalidades", "o item atualizado é o certo");
  assert(atualiza[0]?.existenteId, "atualização aponta para o lançamento existente");

  // Mês que já tem lançamentos de outra origem (sem a marca da planilha) fica de fora.
  const ocupado = {
    ...ex,
    lancamentos: [
      ...ex.lancamentos.filter((l) => l.mes !== "2026-02"),
      { id: "x1", tipo: "receita", descricao: "Venda manual", mes: "2026-02", valor: 500, chave: null },
    ],
  };
  const quarta = montarPreparo({ analise, opcoes, existentes: ocupado, sugerir: sug });
  igual(quarta.planoMeses.find((m) => m.mes === "2026-02")?.situacao, "ocupado", "mês com lançamentos de outra origem é 'ocupado'");
  assert(!quarta.planoLancamentos.some((l) => l.item.mes === "2026-02"), "mês ocupado não gera lançamentos");

  // …a não ser que o usuário peça para somar mesmo assim.
  const somar = montarPreparo({
    analise,
    opcoes: juntarOpcoes(analise, { mesesSobrepostos: ["2026-02"] }),
    existentes: ocupado,
    sugerir: sug,
  });
  assert(somar.planoLancamentos.some((l) => l.item.mes === "2026-02" && l.acao === "criar"), "'somar mesmo assim' libera o mês");

  // Desmarcar um mês tira os lançamentos dele.
  const sem01 = montarPreparo({
    analise,
    opcoes: juntarOpcoes(analise, { mesesDre: ["2026-02", "2026-03"] }),
    existentes: vazio,
    sugerir: sug,
  });
  assert(!sem01.planoLancamentos.some((l) => l.item.mes === "2026-01"), "mês desmarcado não entra");

  // Cliente que mudou (voltou a churn, valor novo).
  const exClientes = existentesDoPlano(primeira, { lancamentos: false });
  exClientes.clientes[0] = { ...exClientes.clientes[0], valor_estimado: 1 };
  const plano = planejarClientes(
    analise.clientes[0].clientes,
    exClientes.clientes,
  );
  igual(plano[0].situacao, "atualizar", "valor mensal diferente → atualizar");
  assert(plano[0].mudancas.includes("valor mensal"), "diz o que mudou");

  // Resposta da prévia.
  const resp = montarRespostaAnalise(analise, primeira);
  igual(resp.clientes.resumo.total, 5, "resumo: 5 clientes");
  igual(resp.clientes.resumo.ativos, 3, "resumo: 3 ativos");
  perto(resp.clientes.resumo.mrrAtivo, 6700, "resumo: MRR ativo");
  igual(resp.dre.meses.length, 3, "prévia lista os 3 meses");
  assert(resp.dre.meses.every((m) => m.marcado), "meses vêm marcados");
  assert(resp.dre.categoriasNovas.length >= 5, "prévia lista as categorias novas");
}

// A chave do lançamento é estável (não depende de acento/maiúscula).
igual(
  chaveDoLancamento({ mes: "2026-01", tipo: "despesa", rotulo: "Tráfego Pago" }),
  chaveDoLancamento({ mes: "2026-01", tipo: "despesa", rotulo: "trafego pago" }),
  "chave ignora acento e maiúscula",
);

/* ------------------------------------------------------------------ entradas do navegador */

{
  igual(sanearOpcoes(null), undefined, "opções nulas");
  igual(sanearOpcoes("x"), undefined, "opções que não são objeto");
  const o = sanearOpcoes({
    abasClientes: ["A", 3, "", "B"],
    layoutDre: 5,
    mesesDre: ["2026-01", "2026-13", "abc", "2026-02"],
    mesesSobrepostos: ["2026-1"],
    mesesDosBlocos: { b1: "2026-05", b2: "maio", b3: 7 },
  });
  igual(o.abasClientes, ["A", "B"], "só textos nas abas");
  assert(o.layoutDre === undefined, "layout inválido é ignorado");
  igual(o.mesesDre, ["2026-01", "2026-02"], "só meses válidos");
  igual(o.mesesSobrepostos, [], "mês fora do formato é descartado");
  igual(o.mesesDosBlocos, { b1: "2026-05" }, "só correções de mês válidas");
  igual(sanearOpcoes({ layoutDre: null }).layoutDre, null, "layout null (não importar DRE) é aceito");
}

console.log(`\nplanilha-agencia: ${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
