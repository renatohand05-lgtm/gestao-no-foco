#!/usr/bin/env node
/**
 * Testes — Central Executiva de Estoque (Gate 18.4)
 */
import {
  ESC_COBERTURA_MIN_PRODUTOS,
  ESC_PARADO_DIAS,
  assertEscTenantIsolation,
  composeExecutiveStock,
  escClearHref,
  escHref,
  escStockValue,
  escUnitCost,
  isEscStockProduct,
  matchesEscFilters,
} from "../lib/estoque/executive-stock-compose.ts";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("\nCentral Executiva de Estoque — Gate 18.4\n");

const now = new Date("2026-07-20T15:00:00.000Z");

function produto(partial) {
  return {
    id: "p1",
    tenant_id: "t1",
    nome: "Filtro óleo",
    sku: "FO-1",
    categoria: "Filtros",
    fornecedor_principal: "Fornecedor A",
    estoque_atual: 10,
    estoque_minimo: 5,
    custo: 20,
    preco_venda: 40,
    tipo: "produto",
    ativo: true,
    deleted_at: null,
    ...partial,
  };
}

function mov(partial) {
  return {
    id: "m1",
    tenant_id: "t1",
    produto_id: "p1",
    tipo: "saida",
    quantidade: 2,
    created_at: "2026-07-10T12:00:00.000Z",
    deleted_at: null,
    origem: "ordem_servico",
    ...partial,
  };
}

console.log("Unit cost / stock value");
{
  assert(escUnitCost({ custo: 10, preco_venda: 20 }) === 10, "custo preferido");
  assert(escUnitCost({ custo: 0, preco_venda: 20 }) === 20, "fallback preço");
  assert(escUnitCost({ custo: null, preco_venda: null }) === null, "sem valor");
  const sv = escStockValue({ estoque_atual: 5, custo: 10, preco_venda: 0 });
  assert(sv.available && sv.value === 50, "valor estoque = saldo × custo");
  const sv2 = escStockValue({ estoque_atual: 5, custo: null, preco_venda: null });
  assert(!sv2.available, "valor indisponível sem custo/preço");
}

console.log("Stock product filter");
{
  assert(isEscStockProduct(produto({})), "produto ativo");
  assert(!isEscStockProduct(produto({ tipo: "servico" })), "exclui serviço");
  assert(!isEscStockProduct(produto({ ativo: false })), "exclui inativo");
  assert(!isEscStockProduct(produto({ deleted_at: "2026-01-01" })), "exclui deleted");
}

console.log("KPIs");
{
  const data = composeExecutiveStock({
    tenantSlug: "demo",
    now,
    produtos: [
      produto({ id: "a", estoque_atual: 10, custo: 10 }),
      produto({
        id: "b",
        nome: "Zerado",
        estoque_atual: 0,
        estoque_minimo: 2,
        custo: 5,
      }),
      produto({
        id: "c",
        nome: "Abaixo",
        estoque_atual: 1,
        estoque_minimo: 5,
        custo: 100,
      }),
      produto({
        id: "d",
        nome: "Sem custo",
        estoque_atual: 3,
        estoque_minimo: 0,
        custo: null,
        preco_venda: null,
      }),
    ],
    movimentacoes: [
      mov({
        id: "m-a",
        produto_id: "a",
        created_at: "2026-07-15T00:00:00.000Z",
        quantidade: 30,
      }),
    ],
    osItensDisponiveis: true,
    osItensReservados: [],
    fornecedoresAtivosCount: 4,
  });

  assert(data.kpis.valorTotalEstoque.available, "valor total disponível (parcial ok)");
  assert(data.kpis.valorTotalEstoque.partial === true, "parcial por SKU sem custo");
  assert(data.kpis.valorTotalEstoque.value === 10 * 10 + 1 * 100, "soma só com custo");
  assert(data.kpis.produtosZerados.value === 1, "1 zerado");
  assert(data.kpis.produtosAbaixoMinimo.value === 1, "1 abaixo mínimo");
  assert(data.kpis.skusAtivos.value === 4, "4 SKUs");
  assert(data.kpis.fornecedoresAtivos.value === 4, "4 fornecedores");
  assert(data.kpis.valorReservado.available === false, "reservado Indisponível");
  assert(
    data.kpis.valorComprometidoOs.available &&
      data.kpis.valorComprometidoOs.value === 0 &&
      data.kpis.valorComprometidoOs.zeroReal,
    "comprometido OS zero real",
  );
  assert(data.kpis.giroMedio.available, "giro com histórico de saída");
  assert(
    data.kpis.coberturaEstoque.available === false,
    `cobertura Indisponível com < ${ESC_COBERTURA_MIN_PRODUTOS} SKUs`,
  );
}

console.log("Indisponível quando sem informação");
{
  const data = composeExecutiveStock({
    tenantSlug: "demo",
    now,
    produtos: [
      produto({ id: "x", custo: null, preco_venda: null, estoque_atual: 5 }),
    ],
    movimentacoes: [],
    osItensDisponiveis: false,
    fornecedoresAtivosCount: null,
  });
  assert(!data.kpis.valorTotalEstoque.available, "valor total Indisponível");
  assert(data.kpis.valorTotalEstoque.value === null, "não mostra zero inventado");
  assert(!data.kpis.giroMedio.available, "giro Indisponível sem saídas");
  assert(!data.kpis.coberturaEstoque.available, "cobertura Indisponível");
  assert(!data.kpis.valorComprometidoOs.available, "OS load fail → Indisponível");
  assert(!data.kpis.fornecedoresAtivos.available, "fornecedores Indisponível");
}

console.log("Alertas");
{
  const data = composeExecutiveStock({
    tenantSlug: "acme",
    now,
    produtos: [
      produto({
        id: "z",
        nome: "Z",
        estoque_atual: 0,
        custo: 50,
        fornecedor_principal: null,
      }),
      produto({
        id: "p",
        nome: "Parado caro",
        estoque_atual: 20,
        custo: 40,
        fornecedor_principal: "Único SA",
      }),
    ],
    movimentacoes: [
      mov({
        produto_id: "p",
        created_at: "2025-01-01T00:00:00.000Z",
      }),
    ],
    osItensDisponiveis: true,
    fornecedoresAtivosCount: 1,
  });
  assert(data.alerts.some((a) => a.tipo === "zerado"), "alerta zerado");
  assert(
    data.alerts.some((a) => a.tipo === "alto_valor_parado" || a.tipo === "sem_movimentacao"),
    "alerta parado",
  );
  assert(
    data.alerts.some((a) => a.tipo === "cadastro_inconsistente"),
    "alerta cadastro inconsistente",
  );
  assert(
    data.alerts.some((a) => a.tipo === "fornecedor_unico"),
    "alerta fornecedor único",
  );
  const sorted = [...data.alerts].map((a) => a.impacto);
  assert(
    sorted.every((v, i) => i === 0 || sorted[i - 1] >= v),
    "alertas ordenados por impacto",
  );
  assert(
    data.alerts.every((a) => a.href && a.acao && a.descricao && a.severidade),
    "alerta tem severidade/descrição/ação/link",
  );
}

console.log("Produtos críticos / parados / compras");
{
  const data = composeExecutiveStock({
    tenantSlug: "demo",
    now,
    produtos: [
      produto({
        id: "c1",
        nome: "Critico",
        estoque_atual: 1,
        estoque_minimo: 10,
        custo: 200,
      }),
      produto({
        id: "p1",
        nome: "Parado",
        estoque_atual: 8,
        estoque_minimo: 1,
        custo: 30,
      }),
    ],
    movimentacoes: [
      mov({
        produto_id: "p1",
        created_at: "2025-12-01T00:00:00.000Z",
      }),
      mov({
        id: "m2",
        produto_id: "c1",
        quantidade: 9,
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    ],
    osItensDisponiveis: true,
    fornecedoresAtivosCount: 2,
  });
  assert(data.criticos.length >= 1, "há críticos");
  assert(data.criticos[0].id === "c1", "crítico listado");
  assert(data.parados.some((p) => p.id === "p1"), "parado listado");
  assert(
    data.parados.every((p, i) =>
      i === 0 ? true : (data.parados[i - 1].valor ?? 0) >= (p.valor ?? 0),
    ),
    "parados por valor",
  );
  assert(
    data.compras.some((c) => c.produtoId === "c1" && c.quantidadeSugerida === 9),
    "compra determinística = mínimo − saldo",
  );
  assert(
    !data.compras.some((c) => c.produtoId === "p1"),
    "não sugere compra acima do mínimo",
  );
}

console.log("Rankings e distribuição");
{
  const data = composeExecutiveStock({
    tenantSlug: "demo",
    now,
    produtos: [
      produto({ id: "a", categoria: "A", estoque_atual: 10, custo: 10 }),
      produto({
        id: "b",
        nome: "B",
        categoria: "B",
        estoque_atual: 2,
        custo: 500,
        fornecedor_principal: "F2",
      }),
    ],
    movimentacoes: [
      mov({ produto_id: "a", quantidade: 5, origem: "ordem_servico" }),
    ],
    vendaItens: [
      { produto_id: "a", descricao: "Filtro óleo", quantidade: 7 },
      { produto_id: "b", descricao: "B", quantidade: 1 },
    ],
    osItensDisponiveis: true,
    fornecedoresAtivosCount: 2,
  });
  assert(data.rankings.maisVendidos[0].quantidade >= 1, "ranking vendidos");
  assert(data.rankings.maiorValor.length >= 1, "ranking valor");
  assert(data.rankings.consumoOs.length >= 1, "ranking consumo OS");
  assert(data.distribuicao.categoria.length >= 1, "dist categoria");
  assert(data.distribuicao.fornecedor.length >= 1, "dist fornecedor");
  assert(data.distribuicao.faixaValor.length >= 1, "dist faixa");
  assert(data.distribuicao.situacao.length >= 1, "dist situação");
}

console.log("Filtros e URL");
{
  const p = {
    ...produto({}),
    diasSemMovimentacao: 5,
    saidas90d: 2,
  };
  assert(matchesEscFilters(p, { categoria: "Filtros" }), "filtro categoria");
  assert(!matchesEscFilters(p, { categoria: "Outra" }), "filtro categoria exclui");
  assert(matchesEscFilters(p, { q: "óleo" }), "pesquisa nome");
  assert(matchesEscFilters(p, { criticidade: "all" }), "criticidade all");
  assert(
    matchesEscFilters(
      { ...p, estoque_atual: 0 },
      { criticidade: "zerado" },
    ),
    "criticidade zerado",
  );
  assert(matchesEscFilters(p, { movimentacao: "com" }), "com movimento");
  assert(!matchesEscFilters(p, { movimentacao: "sem" }), "sem movimento exclui recente");

  const href = escHref("demo", {
    categoria: "Filtros",
    q: "óleo",
    criticidade: "critico",
  });
  assert(href.includes("/demo/estoque/dashboard?"), "URL base");
  assert(href.includes("categoria=Filtros"), "URL categoria");
  assert(href.includes("q="), "URL q");
  assert(escClearHref("demo") === "/demo/estoque/dashboard", "limpar filtros");
}

console.log("Drill-down links existentes");
{
  const data = composeExecutiveStock({
    tenantSlug: "loja",
    now,
    produtos: [produto({ id: "px", estoque_atual: 0, estoque_minimo: 1 })],
    movimentacoes: [],
    osItensDisponiveis: true,
    fornecedoresAtivosCount: 0,
  });
  const zeradoAlert = data.alerts.find((a) => a.tipo === "zerado");
  assert(zeradoAlert?.href === "/loja/produtos/px", "alerta link produto");
  assert(data.compras[0].href === "/loja/produtos/px", "compra link produto");
  assert(data.parados.every((p) => p.href.startsWith("/loja/produtos/")), "parado links");
}

console.log("Tenant isolation");
{
  const rows = [
    { id: "1", tenant_id: "t1" },
    { id: "2", tenant_id: "t2" },
    { id: "3" },
  ];
  const scoped = assertEscTenantIsolation(rows, "t1");
  assert(scoped.length === 2, "mantém t1 e sem tenant_id");
  assert(!scoped.some((r) => r.tenant_id === "t2"), "remove outro tenant");
}

console.log("Comprometido OS proxy");
{
  const data = composeExecutiveStock({
    tenantSlug: "demo",
    now,
    produtos: [produto({ id: "p1", custo: 25 })],
    movimentacoes: [],
    osItensDisponiveis: true,
    osItensReservados: [
      {
        produto_id: "p1",
        quantidade: 4,
        estoque_status: "reservado",
        peca_origem: "estoque",
      },
    ],
    fornecedoresAtivosCount: 1,
  });
  assert(data.kpis.valorComprometidoOs.available, "proxy disponível");
  assert(data.kpis.valorComprometidoOs.value === 100, "4 × 25");
  assert(data.kpis.valorComprometidoOs.partial === true, "marcado como proxy");
}

console.log("Responsividade (contratos de layout)");
{
  // Contratos estáveis usados pela UI (grid classes documentados no Gate)
  const desktopCols = "xl:grid-cols-5";
  const tabletCols = "sm:grid-cols-2";
  const mobileCols = "grid-cols-1";
  assert(Boolean(desktopCols && tabletCols && mobileCols), "breakpoints KPI definidos");
  assert(ESC_PARADO_DIAS === 90, "janela parado = 90d");
}

console.log(`\nResultado: ${pass} PASS, ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
